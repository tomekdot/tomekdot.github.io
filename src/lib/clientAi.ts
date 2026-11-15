/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Repository } from '../types';
import { REPOS, BLOG_POSTS } from '../data';
import { 
  getLocalAIKey, 
  getLocalAIModel, 
  getLocalAIProvider, 
  getLocalAIBaseUrl,
  getMaxOutputTokens,
  getSessionTokenLimit,
  getSessionTokensUsed,
  addSessionTokensUsed,
  isSessionQuotaExhausted,
  setSavedQuotaStatus,
  QuotaCheckStatus,
  PROVIDERS_CONFIG 
} from './apiKeyStorage';

/**
 * Flag indicating whether a backend proxy server is available.
 * On static hosting like GitHub Pages (tomekdot.github.io), there is no Node/Express backend.
 */
export const HAS_BACKEND: boolean = typeof window !== 'undefined' 
  && window.location.hostname !== 'tomekdot.github.io' 
  && !window.location.hostname.endsWith('github.io');

export interface TokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface ClientAiQueryOptions {
  query: string;
  repo?: Repository;
  repoName?: string;
  repoDesc?: string;
  repoLang?: string;
  readme?: string | null;
  category?: string;
  repos?: Repository[];
  lang?: 'en' | 'pl';
  signal?: AbortSignal;
}

export interface ClientAiResponse {
  reply: string;
  provider: string;
  sourcesUsed?: string[];
  usage?: TokenUsage;
  quotaExhausted?: boolean;
  invalidKey?: boolean;
}

export interface ClientBlogAiQueryOptions {
  query: string;
  postId?: string;
  postTitle: string;
  postExcerpt?: string;
  postContent?: string;
  versionMode?: string;
  draftContent?: string;
  aiRevisionNote?: string;
  tags?: string[];
  lang?: 'en' | 'pl';
  signal?: AbortSignal;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite';

export function normalizeGeminiModel(model?: string | null): string {
  const m = (model || '').trim().replace(/^models\//, '');
  if (!m || m === 'latest' || m === 'gemini-flash-latest' || m === 'gemini-1.5-flash' || m === 'gemini-2.5-flash' || m === 'gemini-2.5-flash-lite') {
    return 'gemini-3.1-flash-lite';
  }
  if (m === 'gemini-pro-latest') return 'gemini-4-argon';
  return m;
}

export interface StreamAiChatOptions {
  messages: Array<{ role: 'user' | 'assistant' | 'model'; content: string }>;
  systemInstruction?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxOutputTokens?: number | null;
  siteLang?: 'en' | 'pl';
  signal?: AbortSignal;
  timeoutMs?: number;
  onChunk: (fullText: string, delta: string, meta?: { model?: string; endpointMode?: string }) => void;
}

export interface StreamAiChatResult {
  text: string;
  model?: string;
  provider?: string;
  endpointMode?: string;
  usage?: TokenUsage;
}

export class StreamAiError extends Error {
  code: number;
  hint?: string;
  quotaExhausted?: boolean;
  invalidKey?: boolean;
  missingKey?: boolean;

  constructor(params: {
    message: string;
    code?: number;
    hint?: string;
    quotaExhausted?: boolean;
    invalidKey?: boolean;
    missingKey?: boolean;
  }) {
    super(params.message);
    this.name = 'StreamAiError';
    this.code = params.code ?? 500;
    this.hint = params.hint;
    this.quotaExhausted = params.quotaExhausted;
    this.invalidKey = params.invalidKey;
    this.missingKey = params.missingKey;
  }
}

/**
 * Streams chat responses via /api/chat/stream (SSE) with automatic timeout protection.
 */
export async function streamAiChat(options: StreamAiChatOptions): Promise<StreamAiChatResult> {
  const {
    messages,
    systemInstruction,
    provider,
    model,
    apiKey,
    baseUrl,
    maxOutputTokens,
    siteLang = 'pl',
    signal,
    timeoutMs = 22000,
    onChunk,
  } = options;

  const customApiKey = apiKey !== undefined ? apiKey : getLocalAIKey();
  const customProvider = provider || getLocalAIProvider();
  const customBaseUrl = baseUrl !== undefined ? baseUrl : getLocalAIBaseUrl();
  const rawModel = model || getLocalAIModel() || DEFAULT_GEMINI_MODEL;
  const effectiveMaxOut = maxOutputTokens !== undefined ? maxOutputTokens : getMaxOutputTokens();

  const localController = new AbortController();
  const onExternalAbort = () => localController.abort();
  if (signal) {
    if (signal.aborted) localController.abort();
    else signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const resetTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      localController.abort(new Error('Stream timeout'));
    }, timeoutMs);
  };

  resetTimeout();

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      signal: localController.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(customApiKey ? { 'x-ai-api-key': customApiKey, 'x-gemini-api-key': customApiKey } : {}),
        ...(customProvider ? { 'x-ai-provider': customProvider } : {}),
        ...(rawModel ? { 'x-ai-model': rawModel } : {}),
        ...(customBaseUrl ? { 'x-ai-base-url': customBaseUrl } : {}),
      },
      body: JSON.stringify({
        provider: customProvider === 'unknown' ? 'gemini' : customProvider,
        model: rawModel,
        systemInstruction,
        messages,
        customBaseUrl,
        apiKeyOverride: customApiKey,
        maxOutputTokens: effectiveMaxOut,
        siteLang,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new StreamAiError({
        message: errData.error || errData.message || `HTTP ${response.status}`,
        code: response.status,
        hint: errData.hint,
        quotaExhausted: response.status === 429 || Boolean(errData.quotaExhausted),
        invalidKey: Boolean(errData.invalidKey) || response.status === 401 || response.status === 403,
        missingKey: Boolean(errData.missingKey),
      });
    }

    if (!response.body) {
      throw new StreamAiError({ message: 'Empty response stream from server', code: 500 });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let sseBuffer = '';
    let accumulated = '';
    let finalMeta: Omit<StreamAiChatResult, 'text'> = {};

    const processEventBlock = (block: string) => {
      const lines = block.split(/\r?\n/);
      let eventType = 'message';
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) return;
      const dataStr = dataLines.join('\n');
      let data: any = null;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }

      if (eventType === 'chunk' && data?.text) {
        accumulated += data.text;
        onChunk(accumulated, data.text, { model: data.model, endpointMode: data.endpointMode });
      } else if (eventType === 'done') {
        finalMeta = {
          model: data?.usedModel,
          provider: data?.provider,
          endpointMode: data?.endpointMode,
          usage: data?.usage,
        };
      } else if (eventType === 'error') {
        const code = Number(data?.code) || 500;
        throw new StreamAiError({
          message: data?.message || 'Streaming API Error',
          code,
          hint: data?.hint,
          quotaExhausted: code === 429 || Boolean(data?.quotaExhausted) || data?.type === 'QUOTA_EXHAUSTED',
          invalidKey: Boolean(data?.invalidKey) || code === 401 || code === 403,
          missingKey: Boolean(data?.missingKey) || data?.type === 'MISSING_API_KEY',
        });
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      resetTimeout();
      sseBuffer += decoder.decode(value, { stream: true });

      let sepIndex: number;
      while ((sepIndex = sseBuffer.indexOf('\n\n')) !== -1) {
        const block = sseBuffer.slice(0, sepIndex);
        sseBuffer = sseBuffer.slice(sepIndex + 2);
        if (block.trim()) {
          processEventBlock(block);
        }
      }
    }

    if (sseBuffer.trim()) {
      processEventBlock(sseBuffer);
    }

    if (finalMeta.usage?.totalTokens) {
      addSessionTokensUsed(finalMeta.usage.totalTokens);
    }

    return {
      text: accumulated,
      ...finalMeta,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

export function isGeminiApiKey(key?: string | null, provider?: string | null): boolean {
  if (!key || key === 'local') return false;
  if (provider === 'gemini') return true;
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('sk-') || trimmed.startsWith('gsk_')) return false;
  return true;
}

function normalizeOpenAIEndpoint(baseUrl: string): string {
  let url = (baseUrl || '').trim().replace(/\/+$/, '');
  if (!url) return 'http://localhost:11434/v1/chat/completions';
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/v1')) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

interface ParsedReadmeSection {
  heading: string;
  level: number;
  paragraphs: string[];
  bullets: string[];
  codeBlocks: Array<{ lang: string; code: string }>;
  rawText: string;
}

interface ParsedReadmeKnowledge {
  title: string;
  leadSummary: string;
  sections: ParsedReadmeSection[];
  extractedFeatures: string[];
  installSection: ParsedReadmeSection | null;
  commandsSection: ParsedReadmeSection | null;
  architectureSection: ParsedReadmeSection | null;
  detectedStack: string[];
  hasSubstantialContent: boolean;
}

function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/[źż]/g, 'z');
}

function stripReadmeNoiseLine(line: string): string {
  let cleaned = line
    // Remove linked badges [![alt](img)](url)
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    // Remove standalone markdown images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    // Remove raw HTML tags (img, br, p, div, span, details, summary, etc.)
    .replace(/<\/?(?:p|div|span|br|hr|img|center|picture|source|details|summary|table|thead|tbody|tr|td|th|sub|sup|strong|em|b|i|h[1-6])[^>]*>/gi, ' ')
    // Unwrap HTML anchors <a href="url">text</a> -> [text](url)
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<\/?a[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function parseReadmeKnowledge(readme?: string | null): ParsedReadmeKnowledge {
  const empty: ParsedReadmeKnowledge = {
    title: '',
    leadSummary: '',
    sections: [],
    extractedFeatures: [],
    installSection: null,
    commandsSection: null,
    architectureSection: null,
    detectedStack: [],
    hasSubstantialContent: false,
  };

  if (!readme || readme.trim().length < 20) return empty;

  const normalized = readme
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n');

  const lines = normalized.split('\n');
  const sections: ParsedReadmeSection[] = [];
  let title = '';
  let current: ParsedReadmeSection = {
    heading: 'Overview',
    level: 1,
    paragraphs: [],
    bullets: [],
    codeBlocks: [],
    rawText: '',
  };

  let inFence = false;
  let fenceLang = '';
  let fenceLines: string[] = [];
  let paraBuffer: string[] = [];
  let rawLines: string[] = [];

  const flushParagraph = () => {
    if (paraBuffer.length > 0) {
      const joined = paraBuffer.join(' ').replace(/\s+/g, ' ').trim();
      if (joined.length >= 12 && !/^[-=_*#`~\s|]+$/.test(joined)) {
        current.paragraphs.push(joined);
      }
      paraBuffer = [];
    }
  };

  const pushCurrentSection = () => {
    flushParagraph();
    current.rawText = rawLines.join('\n').trim();
    if (
      current.paragraphs.length > 0 ||
      current.bullets.length > 0 ||
      current.codeBlocks.length > 0
    ) {
      sections.push(current);
    }
    rawLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (!inFence) {
        flushParagraph();
        inFence = true;
        fenceLang = trimmed.slice(3).trim().split(/\s+/)[0] || '';
        fenceLines = [];
      } else {
        inFence = false;
        const code = fenceLines.join('\n').trim();
        if (code) {
          current.codeBlocks.push({ lang: fenceLang, code });
          rawLines.push(code);
        }
        fenceLines = [];
        fenceLang = '';
      }
      continue;
    }

    if (inFence) {
      fenceLines.push(rawLine);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = stripReadmeNoiseLine(headingMatch[2]).replace(/#+\s*$/, '').trim();
      if (!title && level === 1 && headingText) {
        title = headingText;
      }
      if (
        sections.length > 0 ||
        current.paragraphs.length > 0 ||
        current.bullets.length > 0 ||
        current.codeBlocks.length > 0
      ) {
        pushCurrentSection();
      } else {
        flushParagraph();
        rawLines = [];
      }
      current = {
        heading: headingText || 'Overview',
        level,
        paragraphs: [],
        bullets: [],
        codeBlocks: [],
        rawText: '',
      };
      continue;
    }

    if (!trimmed || /^[-=_*]{3,}$/.test(trimmed)) {
      flushParagraph();
      continue;
    }

    // Markdown blockquote or normal text/bullet
    const cleanLine = stripReadmeNoiseLine(trimmed.replace(/^>\s*/, ''));
    if (!cleanLine) continue;

    // Skip TOC-only or pure divider lines
    if (/^\|[\s:-]+\|$/.test(cleanLine)) continue;

    rawLines.push(cleanLine);

    const bulletMatch = cleanLine.match(/^(?:[-*+]|(?:\d+\.))\s+(?:\[[ xX]\]\s*)?(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      const bulletText = bulletMatch[1].trim();
      if (bulletText.length >= 4) {
        current.bullets.push(bulletText);
      }
    } else if (/^\|.+\|$/.test(cleanLine)) {
      // Markdown table row: convert cleanly into a bullet summary if meaningful
      const cells = cleanLine
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c && !/^[-:]+$/.test(c));
      if (cells.length >= 2 && !/^(command|name|skill|opis|description|feature)$/i.test(cells[0])) {
        flushParagraph();
        current.bullets.push(`**${cells[0]}** — ${cells.slice(1).join(' • ')}`);
      }
    } else {
      paraBuffer.push(cleanLine);
    }
  }

  if (inFence && fenceLines.length > 0) {
    const code = fenceLines.join('\n').trim();
    if (code) current.codeBlocks.push({ lang: fenceLang, code });
  }
  pushCurrentSection();

  const nonLicenseSections = sections.filter(
    (s) => !/^(license|licencja|acknowledg|credits|contributors|changelog)$/i.test(s.heading)
  );

  // Lead summary: best descriptive intro paragraph from first non-install/license section
  let leadSummary = '';
  for (const sec of nonLicenseSections) {
    if (
      !/^(install|setup|license|toc|table of contents|instalac)/i.test(sec.heading) &&
      sec.paragraphs.length > 0
    ) {
      leadSummary = sec.paragraphs.slice(0, 2).join('\n\n');
      break;
    }
  }
  if (!leadSummary && nonLicenseSections.length > 0 && nonLicenseSections[0].paragraphs.length > 0) {
    leadSummary = nonLicenseSections[0].paragraphs[0];
  }

  // Extract features / skills / capabilities bullets from relevant sections
  const featureSec = nonLicenseSections.find((s) =>
    /(feature|capabilit|highlight|skill|agent|module|component|what.?s inside|funkcj|mozliw|zalet|umiejetn|zawiera)/i.test(
      normalizeSearchText(s.heading)
    )
  );
  const extractedFeatures = (
    featureSec?.bullets.length
      ? featureSec.bullets
      : nonLicenseSections.flatMap((s) =>
          /license|changelog/i.test(s.heading) ? [] : s.bullets
        )
  ).slice(0, 8);

  const installSection =
    nonLicenseSections.find((s) =>
      /(install|setup|getting started|quick start|prerequisite|requirement|deploy|build|instalac|konfigur|uruchom|wymagan)/i.test(
        normalizeSearchText(s.heading)
      )
    ) || null;

  const commandsSection =
    nonLicenseSections.find((s) =>
      /(command|usage|how to use|cli|api|endpoint|script|shortcut|keybind|trigger|invoke|skill|workflow|komend|uzyci|wywolan|skladni)/i.test(
        normalizeSearchText(s.heading)
      )
    ) || null;

  const architectureSection =
    nonLicenseSections.find((s) =>
      /(architect|structure|directory|folder|how it works|design|flow|pipeline|stack|tech|internal|architektur|struktur|jak to dziala|moduly|katalog)/i.test(
        normalizeSearchText(s.heading)
      )
    ) || null;

  // Detect genuinely mentioned technologies from README content only
  const fullNormalized = normalizeSearchText(normalized);
  const stackCandidates: Array<[RegExp, string]> = [
    [/\bpython\b/, 'Python'],
    [/\btypescript\b/, 'TypeScript'],
    [/\bjavascript\b|\bnode\.?js\b/, 'Node.js / JavaScript'],
    [/\breact\b/, 'React'],
    [/\bangelscript\b/, 'AngelScript'],
    [/\bpyplanet\b/, 'PyPlanet'],
    [/\bopenplanet\b/, 'Openplanet'],
    [/\basyncio\b/, 'asyncio'],
    [/\bsqlite\b/, 'SQLite'],
    [/\bdocker\b/, 'Docker'],
    [/\bgemini\b/, 'Google Gemini'],
    [/\bollama\b/, 'Ollama'],
    [/\bmcp\b|model context protocol/, 'MCP'],
    [/\bskill\.md\b|\bagent skills\b/, 'SKILL.md / Agent Skills'],
    [/\bclaude\b/, 'Claude Code'],
    [/\bcursor\b/, 'Cursor'],
    [/\bcodex\b/, 'Codex CLI'],
    [/\bhermes\b/, 'Hermes Agent'],
    [/\bdiscord(\.py)?\b/, 'Discord'],
    [/\bfastapi\b/, 'FastAPI'],
    [/\bexpress\b/, 'Express'],
  ];
  const detectedStack: string[] = [];
  for (const [rx, label] of stackCandidates) {
    if (rx.test(fullNormalized) && !detectedStack.includes(label)) {
      detectedStack.push(label);
    }
  }

  return {
    title,
    leadSummary,
    sections: nonLicenseSections,
    extractedFeatures,
    installSection,
    commandsSection,
    architectureSection,
    detectedStack,
    hasSubstantialContent: Boolean(
      leadSummary || extractedFeatures.length > 0 || nonLicenseSections.some((s) => s.codeBlocks.length > 0 || s.paragraphs.length > 0)
    ),
  };
}

function formatReadmeSectionSnippet(sec: ParsedReadmeSection, maxBullets = 6, maxCodeBlocks = 1): string {
  const parts: string[] = [];
  if (sec.paragraphs.length > 0) {
    parts.push(sec.paragraphs.slice(0, 2).join('\n\n'));
  }
  if (sec.bullets.length > 0) {
    parts.push(sec.bullets.slice(0, maxBullets).map((b) => `• ${b}`).join('\n'));
  }
  if (sec.codeBlocks.length > 0) {
    for (const cb of sec.codeBlocks.slice(0, maxCodeBlocks)) {
      const snippet = cb.code.split('\n').slice(0, 16).join('\n');
      parts.push(`\`\`\`${cb.lang || 'bash'}\n${snippet}\n\`\`\``);
    }
  }
  return parts.join('\n\n').trim();
}

const QUERY_SYNONYM_MAP: Record<string, string[]> = {
  skill: ['skills', 'skill.md', 'umiejetn', 'agent', 'narzedz', 'tool'],
  skills: ['skill', 'skill.md', 'agent', 'claude', 'codex', 'cursor', 'hermes'],
  agent: ['agents', 'ai', 'skill', 'skills', 'bot', 'assistant', 'asystent', 'autonomous'],
  instal: ['install', 'setup', 'clone', 'pip', 'npm', 'uv', 'konfigur', 'wymagan'],
  komend: ['command', 'commands', 'cli', 'script', 'usage', 'run', 'flag', 'wywol'],
  architekt: ['architecture', 'structure', 'folder', 'directory', 'tree', 'module', 'design'],
  wymag: ['require', 'requirement', 'prerequisite', 'dependenc', 'version', 'python', 'node'],
  baza: ['database', 'sqlite', 'postgres', 'sql', 'storage', 'json', 'cache'],
  plugin: ['wtyczk', 'extension', 'addon', 'mod', 'app'],
};

function expandQueryTokens(qNorm: string): string[] {
  const stopWords = new Set([
    'ten', 'tego', 'tym', 'tej', 'jest', 'jak', 'co', 'czy', 'dla', 'nie', 'ale', 'to', 'sie',
    'lub', 'oraz', 'przy', 'bez', 'nad', 'pod', 'przed', 'przez', 'ktory', 'ktora', 'ktore',
    'the', 'this', 'that', 'with', 'from', 'for', 'and', 'are', 'does', 'what', 'how', 'can',
    'you', 'use', 'used', 'using', 'into', 'about', 'more', 'tuaj', 'tutaj', 'mozesz',
  ]);
  const rawTokens = qNorm
    .replace(/[^a-z0-9_.\-/]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));

  const expanded = new Set<string>(rawTokens);
  for (const tok of rawTokens) {
    if (tok.length >= 5) expanded.add(tok.slice(0, 5));
    for (const [key, syns] of Object.entries(QUERY_SYNONYM_MAP)) {
      if (tok.includes(key) || key.includes(tok)) {
        syns.forEach((s) => expanded.add(s));
      }
    }
  }
  return Array.from(expanded);
}

/**
 * Resolves the authoritative repository for offline answers.
 * NEVER falls back to repos[0] or substring-matching arbitrary words when a repo context is specified.
 */
function resolveTargetRepository(params: {
  explicitRepo?: Repository;
  repoName?: string;
  repoDesc?: string;
  repoLang?: string;
  category?: string;
  query: string;
  repos: Repository[];
}): Repository | null {
  const { explicitRepo, repoName = '', repoDesc = '', repoLang = '', category = '', query, repos } = params;
  const trimmedName = (explicitRepo?.name || repoName || '').trim();

  if (trimmedName) {
    const lowerTarget = trimmedName.toLowerCase();
    const matchedStatic = repos.find((r) => {
      if (r.name.toLowerCase() === lowerTarget) return true;
      const slug = r.url?.split('/').filter(Boolean).pop()?.toLowerCase();
      return slug === lowerTarget;
    });

    if (explicitRepo) {
      return matchedStatic ? { ...matchedStatic, ...explicitRepo } : explicitRepo;
    }
    if (matchedStatic) {
      return matchedStatic;
    }

    // Dynamic / live-synced GitHub repository not present in static REPOS: build strictly from passed metadata!
    const parsedCats = (category || '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean) as Repository['cat'];

    return {
      name: trimmedName,
      desc: repoDesc || '',
      descPl: repoDesc || '',
      lang: repoLang || 'Code',
      cat: parsedCats.length > 0 ? parsedCats : ['other'],
      url: `https://github.com/tomekdot/${trimmedName}`,
      stars: 0,
      forks: 0,
    };
  }

  // Only when NO repo context was passed (global CLI prompt): check if query explicitly mentions a known repo name
  const qNorm = normalizeSearchText(query);
  const sortedByLen = [...repos].sort((a, b) => b.name.length - a.name.length);
  const explicitMention = sortedByLen.find((r) => {
    const rLow = r.name.toLowerCase();
    if (rLow.length < 4) return false;
    const escaped = rLow.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9_-])${escaped}([^a-z0-9_-]|$)`, 'i').test(qNorm);
  });

  return explicitMention || null;
}

/**
 * Intelligent offline repository knowledge assistant.
 * Strictly grounded in the active repository's verified metadata and README.md.
 * Zero cross-repo hijacking and zero invented boilerplate features.
 */
export function generateIntelligentOfflineReply(params: {
  query: string;
  repo?: Repository;
  repoName: string;
  repoDesc?: string;
  repoLang?: string;
  readme?: string | null;
  category?: string;
  repos?: Repository[];
  lang?: 'en' | 'pl';
}): ClientAiResponse {
  const {
    query,
    repo: explicitRepo,
    repoName = '',
    repoDesc = '',
    repoLang = '',
    readme = '',
    category = '',
    repos = REPOS,
    lang = 'en',
  } = params;

  // Strip accidentally pasted terminal system banners if the user copied them into input
  const cleanedRawQuery = (query || '')
    .replace(/⚡\s*(TOMEKDOT REPO TERMINAL AI|TERMINAL ASYSTENTA AI TOMEKDOT)[^\n]*/gi, '')
    .replace(/^(YOU|SYSTEM|AI ASSISTANT)[^\n]*\n?/gim, '')
    .trim();
  const effectiveQuery = cleanedRawQuery || (query || '').trim();
  const qLower = effectiveQuery.toLowerCase();
  const qNorm = normalizeSearchText(effectiveQuery);

  const hasExplicitPolishCharsOrWords =
    /[ąćęłńóśźż]/i.test(effectiveQuery) ||
    /\b(czesc|hej|witaj|siema|siemanko|dzien dobry|co robi|jak|gdzie|dlaczego|kiedy|komend|instal|insal|opis|funkcj|wtyczk|projekt|porejkt|proejkt|kod|architektur|inny|nie ten|skad|czego|uzyw|skille|umiejetn)\b/i.test(
      qNorm
    );
  const isPolish = lang === 'pl' || hasExplicitPolishCharsOrWords;

  const targetRepo = resolveTargetRepository({
    explicitRepo,
    repoName,
    repoDesc,
    repoLang,
    category,
    query: effectiveQuery,
    repos,
  });

  // Global portfolio query (no repo selected and none named in prompt)
  if (!targetRepo) {
    const reply = isPolish
      ? `### 📂 **Asystent Portfolio @tomekdot (Tryb Offline)**\n\nNie wybrano konkretnego repozytorium. Otwórz wybrany projekt z listy lub podaj jego dokładną nazwę w pytaniu, aby przeanalizować jego opis, funkcje i dokumentację \`README.md\`.`
      : `### 📂 **@tomekdot Portfolio Assistant (Offline Mode)**\n\nNo active repository is selected. Open any project card or mention a repository name in your query to inspect its verified metadata and \`README.md\`.`;
    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed: ['@tomekdot Portfolio Index'],
    };
  }

  const effectiveReadme = (readme && readme.trim().length > 0 ? readme : targetRepo.readme) || '';
  const readmeKnowledge = parseReadmeKnowledge(effectiveReadme);

  const activeName = targetRepo.name;
  const activeLang = targetRepo.lang || repoLang || (readmeKnowledge.detectedStack[0] || 'Code');
  const rawCats = targetRepo.cat?.filter((c) => c && c !== 'other') || [];
  const activeCat =
    rawCats.length > 0
      ? rawCats.join(', ')
      : category && category.toLowerCase() !== 'other'
        ? category
        : activeLang;

  const activeDesc = isPolish
    ? targetRepo.descPl || targetRepo.desc || repoDesc
    : targetRepo.desc || repoDesc;
  const activeLongDesc = isPolish
    ? targetRepo.longDescPl || targetRepo.descPl || targetRepo.desc || repoDesc
    : targetRepo.longDescEn || targetRepo.desc || repoDesc;

  const curatedFeatures =
    (isPolish ? targetRepo.featuresPl : targetRepo.featuresEn) ||
    targetRepo.featuresEn ||
    targetRepo.featuresPl ||
    [];
  const groundedFeatures =
    curatedFeatures.length > 0 ? curatedFeatures : readmeKnowledge.extractedFeatures;

  const activeCapabilities =
    targetRepo.capabilities && targetRepo.capabilities.length > 0
      ? targetRepo.capabilities
      : readmeKnowledge.detectedStack;

  const isPyPlanet =
    targetRepo.cat?.includes('pyplanet') || activeName.toLowerCase().startsWith('pyplanet-');
  const isOpenplanet =
    targetRepo.cat?.includes('openplanet') ||
    activeName.toLowerCase().includes('openplanet') ||
    activeLang.toLowerCase() === 'angelscript';
  const isNodeWeb =
    ['typescript', 'javascript', 'html', 'css'].includes(activeLang.toLowerCase()) ||
    readmeKnowledge.detectedStack.some((s) => /node\.js|react|express/i.test(s));
  const isPython = activeLang.toLowerCase() === 'python';

  const starsLabel = targetRepo.isPrivate
    ? isPolish
      ? 'Projekt prywatny'
      : 'Private repository'
    : `${targetRepo.stars ?? 0} ★`;

  const hasSyncedReadme = readmeKnowledge.hasSubstantialContent;
  const sourcesUsed: string[] = [
    activeName,
    isPolish
      ? `⚙️ Metadane projektu (${activeLang} • ${activeCat})`
      : `⚙️ Repository metadata (${activeLang} • ${activeCat})`,
  ];
  if (hasSyncedReadme) {
    sourcesUsed.push(isPolish ? '📄 Plik README.md (Zsynchronizowany)' : '📄 README.md (Synced)');
  } else {
    sourcesUsed.push(isPolish ? 'ℹ️ Tylko metadane (brak README.md)' : 'ℹ️ Metadata only (no README.md)');
  }
  sourcesUsed.push(isPolish ? '📚 Silnik Bazy Wiedzy (Offline)' : '📚 Offline Knowledge Engine');

  const bestOverview =
    activeLongDesc && activeLongDesc.length >= (readmeKnowledge.leadSummary?.length || 0)
      ? activeLongDesc
      : readmeKnowledge.leadSummary || activeLongDesc || activeDesc;

  // Build domain-accurate suggested questions for this exact repository
  const suggestedQuestionsPl = isPyPlanet || isOpenplanet
    ? [
        `• *"Co dokładnie robi ten projekt?"*`,
        `• *"Jak zainstalować i skonfigurować go w ${isPyPlanet ? 'PyPlanet' : 'Openplanet'}?"*`,
        `• *"Jakie komendy lub widżety udostępnia?"*`,
        `• *"Jaka jest architektura kodu?"*`,
      ]
    : [
        `• *"Co dokładnie robi \`${activeName}\`?"*`,
        `• *"Jak zainstalować i używać tego projektu?"*`,
        `• *"Jakie funkcje, komendy lub moduły zawiera?"*`,
        `• *"Jaka jest struktura i architektura repozytorium?"*`,
      ];

  const suggestedQuestionsEn = isPyPlanet || isOpenplanet
    ? [
        `• *"What exactly does \`${activeName}\` do?"*`,
        `• *"How do I install and configure it for ${isPyPlanet ? 'PyPlanet' : 'Openplanet'}?"*`,
        `• *"What commands or UI controls does it provide?"*`,
        `• *"How is the code architecture structured?"*`,
      ]
    : [
        `• *"What exactly does \`${activeName}\` do?"*`,
        `• *"How do I install and run it?"*`,
        `• *"What features, scripts, or CLI commands are included?"*`,
        `• *"What is the repository structure and architecture?"*`,
      ];

  // 1. INTENT: Context mismatch / correction ("ale nie ten", "to inny projekt", "wrong repo")
  const isWrongRepoComplaint =
    /\b(nie ten|to inny|inny projekt|zle repo|złe repo|wrong repo|not this|different repo)\b/i.test(qNorm);

  if (isWrongRepoComplaint) {
    const sectionsHint =
      readmeKnowledge.sections.length > 0
        ? `\n\n**${isPolish ? 'Sekcje w README.md:' : 'Documented README sections:'}** ${readmeKnowledge.sections
            .slice(0, 6)
            .map((s) => `\`${s.heading}\``)
            .join(' • ')}`
        : '';

    const reply = isPolish
      ? `### 🎯 **Kontekst zablokowany na: \`${activeName}\`**\n\n` +
        `Przepraszam za wcześniejsze pomieszanie kontekstu — odpowiadam teraz **wyłącznie** dla repozytorium **\`${activeName}\`** (${activeLang} • ${starsLabel}).\n\n` +
        (bestOverview
          ? `**Opis z projektu:**\n${bestOverview}\n`
          : `*Brak rozszerzonego opisu w metadanych.*`) +
        sectionsHint +
        `\n\nZadaj proszę pytanie dotyczące **\`${activeName}\`**, np. o jego funkcje, instalację lub konkretny fragment z README.`
      : `### 🎯 **Context Locked to: \`${activeName}\`**\n\n` +
        `Responding strictly for repository **\`${activeName}\`** (${activeLang} • ${starsLabel}).\n\n` +
        (bestOverview
          ? `**Verified Project Description:**\n${bestOverview}\n`
          : `*No extended description in repository metadata.*`) +
        sectionsHint +
        `\n\nAsk anything about **\`${activeName}\`**, such as its features, installation, usage, or structure.`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 2. INTENT: Greetings & Introduction
  const isGreeting =
    /^(cze[sś][cć]?|ze[sś][cć]?|czesc|zesc|czes|zes|hej|witaj|siema|siemanko|elo|dzie[nń]\s*dobry|dobry\s*wiecz[oó]r|yo|hello|hi|hey|greetings|howdy)\b/i.test(
      qLower
    ) ||
    /^(czym\s*jeste[sś]|kim\s*jeste[sś]|who\s*are\s*you|co\s*potrafisz|what\s*can\s*you\s*do)\b/i.test(
      qNorm
    );

  if (isGreeting) {
    const shortLead = bestOverview ? `\n\n> ${bestOverview.split('\n')[0].slice(0, 260)}` : '';
    const reply = isPolish
      ? `Cześć! 👋 Jestem asystentem offline dla repozytorium **\`${activeName}\`** (${activeLang} • ${activeCat}).${shortLead}\n\nW czym mogę pomóc? Możesz zapytać:\n${suggestedQuestionsPl.join('\n')}`
      : `Hello! 👋 I am the offline assistant for **\`${activeName}\`** (${activeLang} • ${activeCat}).${shortLead}\n\nHow can I help? Try asking:\n${suggestedQuestionsEn.join('\n')}`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 3. INTENT: Purpose, Features & What does it do (supports typos like "porejkt", "proejkt", "co robi")
  const isPurposeOrFeatures =
    /\b(co\s+to\s+robi|co\s+robi|do\s+czego|czym\s+jest|czego\s+dotycz|what\s+does|what\s+is\s+this|purpose|summary|overview|podsumuj)\b/i.test(
      qNorm
    ) ||
    /(funkcj|featur|mozliw|opis|describe|zastosowan|skill|umiejetn)/i.test(qNorm) &&
      !/(instal|insal|setup|konfigur|komend|command|architekt|struktur)/i.test(qNorm);

  if (isPurposeOrFeatures) {
    const overviewBlock = bestOverview
      ? bestOverview
      : isPolish
        ? `Repozytorium \`${activeName}\` napisane w języku \`${activeLang}\` (brak szczegółowego opisu tekstowego w metadanych oraz pliku README.md).`
        : `Repository \`${activeName}\` built with \`${activeLang}\` (no detailed text description present in metadata or README.md).`;

    const featuresBlock =
      groundedFeatures.length > 0
        ? `#### **${isPolish ? 'Udokumentowane funkcje & elementy:' : 'Documented Features & Components:'}**\n` +
          groundedFeatures.map((f) => `• ${f}`).join('\n')
        : readmeKnowledge.sections.length > 1
          ? `#### **${isPolish ? 'Główne sekcje w dokumentacji README.md:' : 'Documented Sections in README.md:'}**\n` +
            readmeKnowledge.sections
              .slice(0, 6)
              .map((s) => `• **${s.heading}**${s.paragraphs[0] ? ` — ${s.paragraphs[0].slice(0, 140)}` : ''}`)
              .join('\n')
          : isPolish
            ? `*Brak zsynchronizowanej listy funkcji w README.md — powyżej znajduje się jedyny zweryfikowany opis z metadanych repozytorium.*`
            : `*No synced feature list found in README.md — showing verified repository metadata only.*`;

    const capabilitiesBlock =
      activeCapabilities.length > 0
        ? `\n\n**${isPolish ? 'Wykryte technologie i kontekst:' : 'Detected Stack & Context:'}**\n` +
          activeCapabilities.map((c) => `\`${c}\``).join(' • ')
        : '';

    const repoUrlLine =
      !targetRepo.isPrivate && targetRepo.url
        ? `\n\n🔗 **${isPolish ? 'Repozytorium GitHub:' : 'GitHub Repository:'}** [${targetRepo.url}](${targetRepo.url})`
        : '';

    const reply = isPolish
      ? `### 📦 **Przegląd Techniczny: \`${activeName}\`**\n\n` +
        `**Status:** ${starsLabel} • **Język:** \`${activeLang}\` • **Kategoria:** \`${activeCat}\`\n\n` +
        `#### **Opis projektu:**\n${overviewBlock}\n\n` +
        `${featuresBlock}${capabilitiesBlock}${repoUrlLine}`
      : `### 📦 **Technical Overview: \`${activeName}\`**\n\n` +
        `**Status:** ${starsLabel} • **Language:** \`${activeLang}\` • **Category:** \`${activeCat}\`\n\n` +
        `#### **Project Overview:**\n${overviewBlock}\n\n` +
        `${featuresBlock}${capabilitiesBlock}${repoUrlLine}`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 4. INTENT: Installation & Setup Guide
  const isInstall =
    /(instal|insal|setup|konfigur|uruchom|odpal|require|wymagan|jak\s+uzyw|how\s+to\s+(use|run|install)|getting\s+started)/i.test(
      qNorm
    );

  if (isInstall) {
    let installBody = '';

    if (readmeKnowledge.installSection) {
      const secText = formatReadmeSectionSnippet(readmeKnowledge.installSection, 8, 2);
      installBody =
        `#### **${readmeKnowledge.installSection.heading} (z README.md)**\n\n` +
        (secText || (isPolish ? 'Brak dodatkowych kroków w tej sekcji.' : 'No further details in section.'));
    } else if (readmeKnowledge.sections.some((s) => s.codeBlocks.length > 0)) {
      const firstCodeSec = readmeKnowledge.sections.find((s) => s.codeBlocks.length > 0)!;
      installBody =
        `#### **${isPolish ? 'Wykryte polecenia w dokumentacji' : 'Commands extracted from README.md'} (${firstCodeSec.heading})**\n\n` +
        formatReadmeSectionSnippet(firstCodeSec, 5, 2);
    } else if (isPyPlanet) {
      installBody = isPolish
        ? `#### **Standardowa instalacja wtyczki PyPlanet**\n1. Sklonuj do katalogu \`apps/\` serwera PyPlanet:\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\n\`\`\`\n2. Dodaj \`'apps.${activeName}'\` do listy \`APPS\` w \`settings/apps.py\` i zrestartuj kontroler (\`./manage.py restart\`).`
        : `#### **Standard PyPlanet Plugin Setup**\n1. Clone into your PyPlanet \`apps/\` folder:\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\n\`\`\`\n2. Register \`'apps.${activeName}'\` inside \`settings/apps.py\` and run \`./manage.py restart\`.`;
    } else if (isOpenplanet) {
      installBody = isPolish
        ? `#### **Standardowa instalacja wtyczki Openplanet**\nSkopiuj folder wtyczki lub paczkę \`.op\` do katalogu:\n\`\`\`text\n%USERPROFILE%\\OpenplanetNext\\Plugins\\\n\`\`\`\nNastępnie uruchom grę Trackmania, otwórz nakładkę klawiszem \`F3\` i wybierz *Developer -> Reload Plugins*.`
        : `#### **Standard Openplanet Plugin Setup**\nCopy the plugin folder or \`.op\` bundle into:\n\`\`\`text\n%USERPROFILE%\\OpenplanetNext\\Plugins\\\n\`\`\`\nThen press \`F3\` inside Trackmania and select *Developer -> Reload Plugins*.`;
    } else if (isNodeWeb) {
      installBody = isPolish
        ? `#### **Konfiguracja środowiska (${activeLang})**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\nnpm install\n\`\`\`\n*(Uwaga: brak szczegółowej sekcji instalacyjnej w README.md — zweryfikuj dostępne skrypty w \`package.json\`.)*`
        : `#### **Environment Setup (${activeLang})**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\nnpm install\n\`\`\`\n*(Note: no dedicated install section found in README.md — check \`package.json\` scripts after cloning.)*`;
    } else if (isPython) {
      installBody = isPolish
        ? `#### **Pobranie i konfiguracja Python (${activeName})**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\n\`\`\`\n*(Brak wyodrębnionej sekcji instalacyjnej w README.md — sprawdź pliki konfiguracyjne w repozytorium, takie jak \`requirements.txt\`, \`pyproject.toml\` lub główny skrypt \`.py\`.)*`
        : `#### **Clone & Python Setup (${activeName})**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\n\`\`\`\n*(No dedicated install section found in README.md — check \`requirements.txt\`, \`pyproject.toml\`, or entrypoint scripts inside the repository.)*`;
    } else {
      installBody = isPolish
        ? `\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\n\`\`\`\n*Brak dedykowanej sekcji instalacyjnej w README.md — otwórz repozytorium w GitHubie, aby sprawdzić pliki startowe dla \`${activeLang}\`.*`
        : `\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\n\`\`\`\n*No dedicated install section found in README.md — check repository root files for \`${activeLang}\`.*`;
    }

    const reply = isPolish
      ? `### 🛠️ **Instalacja & Konfiguracja: \`${activeName}\`**\n\n` +
        `**Język:** \`${activeLang}\` • **Kategoria:** \`${activeCat}\`\n\n` +
        installBody
      : `### 🛠️ **Installation & Configuration: \`${activeName}\`**\n\n` +
        `**Language:** \`${activeLang}\` • **Category:** \`${activeCat}\`\n\n` +
        installBody;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 5. INTENT: Commands, CLI, Usage & Controls
  const isCommands =
    /(komend|command|cli|hud|nakladk|overlay|klawisz|skrot|wywol|trigger|shortcut|flag|parametr|endpoint|usage)/i.test(
      qNorm
    );

  if (isCommands) {
    let cmdBody = '';
    if (readmeKnowledge.commandsSection) {
      cmdBody =
        `#### **${readmeKnowledge.commandsSection.heading} (z README.md)**\n\n` +
        formatReadmeSectionSnippet(readmeKnowledge.commandsSection, 8, 2);
    } else if (isPyPlanet) {
      const cmdGuess = activeName.replace(/^pyplanet-/, '');
      cmdBody = isPolish
        ? `• **Komendy PyPlanet:** Zarejestrowane komendy pluginu sprawdzisz na czacie gry przez \`//help\` (zwykle w przestrzeni \`//${cmdGuess}\`).\n• *Szczegółowa tabela komend nie została wyodrębniona z README.md.*`
        : `• **PyPlanet Commands:** Query \`//help\` inside Trackmania chat to inspect registered \`//${cmdGuess}\` subcommands.\n• *No explicit command table was found in README.md.*`;
    } else if (isOpenplanet) {
      cmdBody = isPolish
        ? `• **Nakładka w grze (\`F3\`):** Otwiera menu Openplanet, w którym wtyczka \`${activeName}\` udostępnia własne ustawienia i widżety HUD.\n• *Szczegółowa lista skrótów nie została znaleziona w README.md.*`
        : `• **In-Game Overlay (\`F3\`):** Open the Openplanet menu to configure \`${activeName}\` widgets and settings.\n• *No explicit shortcut list was found in README.md.*`;
    } else {
      cmdBody = isPolish
        ? `W dokumentacji \`README.md\` dla **\`${activeName}\`** nie znaleziono osobnej sekcji z listą komend CLI / wywołań.` +
          (groundedFeatures.length > 0
            ? `\n\n**Dostępne udokumentowane elementy:**\n${groundedFeatures.slice(0, 5).map((f) => `• ${f}`).join('\n')}`
            : '')
        : `No dedicated CLI commands or usage table was found in \`README.md\` for **\`${activeName}\`**.` +
          (groundedFeatures.length > 0
            ? `\n\n**Documented items:**\n${groundedFeatures.slice(0, 5).map((f) => `• ${f}`).join('\n')}`
            : '');
    }

    const reply = isPolish
      ? `### ⌘ **Użycie, Komendy & Integracja: \`${activeName}\`**\n\n${cmdBody}`
      : `### ⌘ **Commands, Usage & Integration: \`${activeName}\`**\n\n${cmdBody}`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 6. INTENT: Architecture, Structure & Tech Stack
  const isArchitecture =
    /(architektur|architect|struktur|structure|katalog|director|folder|jak\s+dziala|how\s+it\s+works|logik|kod|code|stack|technolog|bibliotek|dependenc|modul|baza|sqlite|database)/i.test(
      qNorm
    );

  if (isArchitecture) {
    const archParts: string[] = [];
    archParts.push(
      isPolish
        ? `• **Język główny:** \`${activeLang}\` (${activeCat})`
        : `• **Primary Language:** \`${activeLang}\` (${activeCat})`
    );
    if (activeCapabilities.length > 0) {
      archParts.push(
        isPolish
          ? `• **Zweryfikowany stos / technologie:** ${activeCapabilities.map((c) => `\`${c}\``).join(' • ')}`
          : `• **Verified Stack & Mentions:** ${activeCapabilities.map((c) => `\`${c}\``).join(' • ')}`
      );
    }

    let extraArchBlock = '';
    if (readmeKnowledge.architectureSection) {
      extraArchBlock =
        `\n\n#### **${readmeKnowledge.architectureSection.heading} (z README.md)**\n\n` +
        formatReadmeSectionSnippet(readmeKnowledge.architectureSection, 8, 1);
    } else {
      // Look for directory tree code block anywhere in README
      const treeSection = readmeKnowledge.sections.find((s) =>
        s.codeBlocks.some((cb) => /[├└│]──|\/$/.test(cb.code))
      );
      if (treeSection) {
        const treeBlock = treeSection.codeBlocks.find((cb) => /[├└│]──|\/$/.test(cb.code))!;
        extraArchBlock =
          `\n\n#### **${isPolish ? 'Struktura plików z README.md:' : 'Repository Structure from README.md:'}**\n` +
          `\`\`\`text\n${treeBlock.code.split('\n').slice(0, 18).join('\n')}\n\`\`\``;
      } else if (groundedFeatures.length > 0) {
        extraArchBlock =
          `\n\n#### **${isPolish ? 'Kluczowe komponenty projektu:' : 'Key Documented Components:'}**\n` +
          groundedFeatures.slice(0, 6).map((f) => `• ${f}`).join('\n');
      } else if (bestOverview) {
        extraArchBlock = `\n\n${bestOverview}`;
      }
    }

    const reply = isPolish
      ? `### ⚙️ **Architektura & Struktura: \`${activeName}\`**\n\n${archParts.join('\n')}${extraArchBlock}`
      : `### ⚙️ **Architecture & Structure: \`${activeName}\`**\n\n${archParts.join('\n')}${extraArchBlock}`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 7. INTENT: Portfolio AI Setup / Keys (ONLY when explicitly asking about portfolio AI engine, Gemini keys, Ollama, LM Studio)
  const isPortfolioAiConfigQuery =
    /(api\s*key|klucz\s*api|gemini|ollama|lm\s*studio|deepseek|llama|qwen|czy\s+to\s+ai|jak\s+dziala\s+(?:ten\s+)?(?:asystent|czat|ai\s+w\s+portfolio)|tryb\s+offline)/i.test(
      qNorm
    );

  if (isPortfolioAiConfigQuery) {
    const reply = isPolish
      ? `### 🧠 **Silnik AI w Portfolio (Kontekst: \`${activeName}\`)**\n\n` +
        `Ten terminal może działać w dwóch trybach:\n` +
        `• **Tryb Offline (aktywny teraz):** Odpowiada deterministycznie na podstawie metadanych repozytorium **\`${activeName}\`** oraz jego zsynchronizowanego pliku \`README.md\` ($0 kosztów).\n` +
        `• **Tryb Generatywny (Google Gemini / Ollama / LM Studio):** Kliknij ikonę klucza (🔑) u góry, aby podpiąć klucz Google AI Studio (\`gemini-3.1-flash-lite\`) lub lokalny serwer Ollama / LM Studio.`
      : `### 🧠 **Portfolio AI Engine (Context: \`${activeName}\`)**\n\n` +
        `This terminal supports two modes:\n` +
        `• **Offline Knowledge Mode (active now):** Answers deterministically using **\`${activeName}\`** metadata and its synced \`README.md\` ($0 cost).\n` +
        `• **Generative LLM Mode (Google Gemini / Ollama / LM Studio):** Click the key button (🔑) above to connect Google AI Studio (\`gemini-3.1-flash-lite\`) or a local Ollama / LM Studio instance.`;

    return {
      reply,
      provider: 'SYSTEM KNOWLEDGE (AI ARCHITECTURE)',
      sourcesUsed,
    };
  }

  // 8. INTENT: Explicit Author Inquiry (strictly about Tomasz Kaczak / author, NOT just any mention of "tomekdot")
  const isExplicitAuthor =
    /\b(autor|author|tworc|kto\s+(?:to\s+)?(?:napisal|stworzyl|zrobil)|tomasz\s+kaczak|o\s+autorze)\b/i.test(
      qNorm
    );

  if (isExplicitAuthor) {
    const reply = isPolish
      ? `### 👨‍💻 **Autor Projektu \`${activeName}\`: Tomasz Kaczak (@tomekdot)**\n\n` +
        `Projekt **\`${activeName}\`** należy do portfolio open-source Tomasza Kaczaka (@tomekdot) — inżyniera oprogramowania rozwijającego m.in. wtyczki Trackmania (PyPlanet / Openplanet), narzędzia AI i projekty badawcze (KUL).\n\n` +
        `🔗 GitHub: [https://github.com/tomekdot](https://github.com/tomekdot)`
      : `### 👨‍💻 **Author of \`${activeName}\`: Tomasz Kaczak (@tomekdot)**\n\n` +
        `**\`${activeName}\`** is developed by Tomasz Kaczak (@tomekdot), software engineer building Trackmania ecosystem plugins (PyPlanet / Openplanet), AI agent tooling, and academic systems.\n\n` +
        `🔗 GitHub: [https://github.com/tomekdot](https://github.com/tomekdot)`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 9. SEMANTIC README & METADATA MATCHER (for specific/freeform questions)
  const queryTokens = expandQueryTokens(qNorm);
  if (hasSyncedReadme && queryTokens.length > 0) {
    const scoredSections = readmeKnowledge.sections
      .map((sec) => {
        const hay = normalizeSearchText(`${sec.heading}\n${sec.rawText}`);
        let score = 0;
        const headingNorm = normalizeSearchText(sec.heading);
        for (const tok of queryTokens) {
          if (headingNorm.includes(tok)) score += 4;
          else if (hay.includes(tok)) score += 2;
        }
        return { sec, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredSections.length > 0) {
      const topMatches = scoredSections.slice(0, 2);
      const renderedMatches = topMatches
        .map(
          ({ sec }) =>
            `#### **${sec.heading}**\n${formatReadmeSectionSnippet(sec, 6, 1)}`
        )
        .join('\n\n');

      const reply = isPolish
        ? `### 🔍 **Dopasowane informacje z dokumentacji \`${activeName}\`**\n\n${renderedMatches}\n\n---\n💡 *Szukasz pełnego obrazu? Zapytaj o opis ogólny, instalację lub strukturę projektu \`${activeName}\`.*`
        : `### 🔍 **Matched Documentation from \`${activeName}\`**\n\n${renderedMatches}\n\n---\n💡 *Need more context? Ask for an overview, setup guide, or architecture of \`${activeName}\`.*`;

      return {
        reply,
        provider: 'AUTONOMOUS KNOWLEDGE (README SYNTHESIS)',
        sourcesUsed,
      };
    }
  }

  // 10. GENERAL CONTEXTUAL SUMMARY (strictly grounded in activeName)
  const missingReadmeNote = !hasSyncedReadme
    ? isPolish
      ? `\n\n> ℹ️ *Uwaga: W trybie offline bazuję tutaj wyłącznie na krótkich metadanych, ponieważ plik \`README.md\` nie jest zsynchronizowany lub repozytorium go nie zawiera.*`
      : `\n\n> ℹ️ *Note: Answering from verified repository metadata only because no \`README.md\` content is synced for this repository.*`
    : readmeKnowledge.sections.length > 0
      ? `\n\n**${isPolish ? 'Sekcje w README.md:' : 'Sections in README.md:'}** ${readmeKnowledge.sections
          .slice(0, 6)
          .map((s) => `\`${s.heading}\``)
          .join(' • ')}`
      : '';

  const defaultReply = isPolish
    ? `### 💡 **Asystent Projektu: \`${activeName}\`**\n\n` +
      `Odpowiadam w trybie offline w kontekście **\`${activeName}\`** (${activeLang} • ${activeCat}):\n\n` +
      (bestOverview
        ? `**Podsumowanie:**\n${bestOverview}`
        : `**Podsumowanie:** Brak szczegółowego opisu w metadanych dla \`${activeName}\`.`) +
      missingReadmeNote +
      `\n\n**Przykładowe pytania o \`${activeName}\`:**\n` +
      suggestedQuestionsPl.join('\n') +
      `\n\n💡 *Aby użyć pełnego modelu konwersacyjnego (Google Gemini / Ollama / LM Studio), kliknij przycisk klucza (🔑) u góry.*`
    : `### 💡 **Project Assistant: \`${activeName}\`**\n\n` +
      `Answering offline in the context of **\`${activeName}\`** (${activeLang} • ${activeCat}):\n\n` +
      (bestOverview
        ? `**Summary:**\n${bestOverview}`
        : `**Summary:** No detailed description available in metadata for \`${activeName}\`.`) +
      missingReadmeNote +
      `\n\n**Suggested Questions for \`${activeName}\`:**\n` +
      suggestedQuestionsEn.join('\n') +
      `\n\n💡 *To query a live generative LLM (Google Gemini / Ollama / LM Studio), click the key button (🔑) above.*`;

  return {
    reply: defaultReply,
    provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
    sourcesUsed,
  };
}

/**
 * Translates / re-formats any cached or live QuotaCheckStatus into the active UI language ('en' | 'pl').
 */
export function localizeQuotaCheckStatus(
  status: QuotaCheckStatus | null,
  lang: 'en' | 'pl'
): QuotaCheckStatus | null {
  if (!status) return null;
  if (status.lang === lang) return status;

  const isEn = lang === 'en';
  const isVertex = status.endpointMode ? status.endpointMode === 'vertex' : status.keyType === 'vertex_express';
  const isLocal = status.keyType === 'local';

  let nextQuotaInfo = status.quotaInfo ? { ...status.quotaInfo } : undefined;
  let nextMessage = status.message;
  let nextHint = status.hint;

  if (status.status === 'ok' && status.valid) {
    if (isLocal) {
      nextQuotaInfo = {
        tier: isEn ? 'Local / Custom Endpoint' : 'Lokalny / Własny Endpoint',
        rpm: isEn ? 'Unlimited RPM (hardware-dependent)' : 'Bez limitu RPM (zależy od sprzętu)',
        tpm: isEn ? 'No cloud token limit' : 'Bez limitu tokenów API',
        rpd: isEn ? 'Unlimited' : 'Nielimitowane',
      };
      if (nextMessage) {
        const countMatch = nextMessage.match(/(\d+)/);
        const count = countMatch ? countMatch[1] : '?';
        nextMessage = isEn
          ? `Connected successfully! Detected ${count} model(s).`
          : `Połączono pomyślnie! Wykryto ${count} modeli.`;
      }
    } else {
      nextQuotaInfo = {
        tier: isVertex ? 'Vertex AI Express / Google Cloud' : 'Google AI Studio (Gemini API)',
        rpm: isVertex
          ? (isEn ? 'Dynamic / Express Tier (GCP project dependent)' : 'Dynamiczny / Express Tier (zależny od projektu GCP)')
          : (isEn ? '15 RPM (Free) / up to 2,000 RPM (Tier 1+)' : '15 RPM (Free) / do 2 000 RPM (Tier 1+)'),
        tpm: isVertex
          ? (isEn ? 'Per GCP Vertex AI project quota (e.g. 1M+ TPM)' : 'Wg kwoty Vertex AI projektu (np. 1M+ TPM)')
          : (isEn ? '250,000 – 1,000,000 tokens / min' : '250 000 – 1 000 000 tokenów / min'),
        rpd: isVertex
          ? (isEn ? 'Per Vertex AI Express credits / quota' : 'Wg kredytów / limitu Vertex AI Express')
          : (isEn ? '1,500 req/day (Free) / unlimited on Tier 1' : '1 500 zap./dzień (Free) / brak limitu w Tier 1'),
      };
      if (status.resolvedModel) {
        const tokSuffix = typeof status.testTokensUsed === 'number'
          ? (isEn ? `, test: ${status.testTokensUsed} tokens` : `, test: ${status.testTokensUsed} tok`)
          : '';
        nextMessage = isEn
          ? `Key active! Connected via ${isVertex ? 'Vertex AI Express' : 'Google AI Studio'} (model: ${status.resolvedModel}${tokSuffix}).`
          : `Klucz aktywny! Połączono przez ${isVertex ? 'Vertex AI Express' : 'Google AI Studio'} (model: ${status.resolvedModel}${tokSuffix}).`;
      } else if (nextMessage && /klucz aktywny/i.test(nextMessage) && isEn) {
        nextMessage = nextMessage
          .replace(/Klucz aktywny! Połączono przez /i, 'Key active! Connected via ')
          .replace(/,\s*test:\s*(\d+)\s*tok\)/i, ', test: $1 tokens)');
      } else if (nextMessage && /key active/i.test(nextMessage) && !isEn) {
        nextMessage = nextMessage
          .replace(/Key active! Connected via /i, 'Klucz aktywny! Połączono przez ')
          .replace(/,\s*test:\s*(\d+)\s*tokens\)/i, ', test: $1 tok)');
      }
    }
  } else if (status.status === 'quota_exhausted') {
    nextQuotaInfo = {
      tier: isEn ? 'Quota Exhausted (429 RESOURCE_EXHAUSTED)' : 'Limit wyczerpany (429 RESOURCE_EXHAUSTED)',
      rpm: isEn ? '0 available (limit exceeded)' : '0 dostępnych (przekroczono limit)',
      tpm: isEn ? '0 tokens available' : '0 dostępnych tokenów',
      rpd: isEn ? 'Daily/minute token quota exhausted' : 'Wyczerpano dzienną/minutową pulę tokenów',
    };
    nextMessage = isEn
      ? 'Gemini API request or token quota exhausted (429 Quota Exceeded).'
      : 'Wyczerpano limit zapytań lub tokenów Gemini API (429 Quota Exceeded).';
    nextHint = isEn
      ? 'Token/request quota for this key is exhausted. Offline Mode (Autonomous Knowledge) will take over automatically, or use another key.'
      : 'Limit tokenów/zapytań dla tego klucza został wyczerpany. Tryb Offline (Autonomous Knowledge) przejmie obsługę lub użyj innego klucza.';
  } else if (status.status === 'missing_key') {
    nextQuotaInfo = {
      tier: isEn ? 'No API Key' : 'Brak klucza API',
      rpm: '0',
      tpm: '0',
      rpd: isEn ? '0 (Offline Mode)' : '0 (Tryb Offline)',
    };
    nextMessage = isEn
      ? 'Missing Gemini API key. Paste a key (AIza... or AQ....) or use Offline Mode.'
      : 'Brak klucza Gemini API. Wklej klucz (AIza... lub AQ....) lub użyj trybu offline.';
  }

  return {
    ...status,
    lang,
    quotaInfo: nextQuotaInfo,
    message: nextMessage,
    hint: nextHint,
  };
}

/**
 * Validates an API key / local endpoint live via backend and saves quota & status info.
 */
export async function validateAiKeyLive(params?: {
  apiKey?: string;
  provider?: string;
  model?: string;
  baseUrl?: string;
  siteLang?: 'en' | 'pl';
}): Promise<QuotaCheckStatus> {
  const apiKey = params?.apiKey !== undefined ? params.apiKey.trim() : getLocalAIKey();
  const provider = params?.provider || getLocalAIProvider();
  const model = params?.model || getLocalAIModel();
  const baseUrl = params?.baseUrl !== undefined ? params.baseUrl : getLocalAIBaseUrl();
  const siteLang: 'en' | 'pl' = params?.siteLang === 'en' ? 'en' : 'pl';
  const isEn = siteLang === 'en';

  if (!HAS_BACKEND) {
    const status: QuotaCheckStatus = {
      valid: Boolean(apiKey),
      status: apiKey ? 'ok' : 'missing_key',
      lang: siteLang,
      keyType: /^AQ\./i.test(apiKey) ? 'vertex_express' : apiKey ? 'ai_studio' : 'none',
      message: apiKey
        ? (isEn ? 'Key saved locally (static mode without backend).' : 'Klucz zapisany lokalnie (tryb bez backendu).')
        : (isEn ? 'Missing API key.' : 'Brak klucza API.'),
      checkedAt: new Date().toISOString(),
    };
    setSavedQuotaStatus(status);
    return status;
  }

  try {
    const res = await fetch('/api/ai/validate-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-ai-api-key': apiKey, 'x-gemini-api-key': apiKey } : {}),
        ...(provider ? { 'x-ai-provider': provider } : {}),
        ...(model ? { 'x-ai-model': model } : {}),
        ...(baseUrl ? { 'x-ai-base-url': baseUrl } : {}),
      },
      body: JSON.stringify({
        customApiKey: apiKey,
        customProvider: provider,
        customModel: model,
        customBaseUrl: baseUrl,
        siteLang,
      }),
    });

    const data = await res.json().catch(() => ({}));
    const status: QuotaCheckStatus = {
      valid: Boolean(data.valid),
      status: data.status || (res.ok ? 'ok' : res.status === 429 ? 'quota_exhausted' : 'invalid_key'),
      lang: data.lang || siteLang,
      keyType: data.keyType,
      endpointMode: data.endpointMode,
      providerLabel: data.providerLabel,
      resolvedModel: data.resolvedModel,
      testTokensUsed: typeof data.testTokensUsed === 'number' ? data.testTokensUsed : undefined,
      quotaInfo: data.quotaInfo,
      message: data.message || (res.ok ? 'OK' : `HTTP ${res.status}`),
      hint: data.hint,
      checkedAt: new Date().toISOString(),
    };
    setSavedQuotaStatus(status);
    return status;
  } catch (err: any) {
    const status: QuotaCheckStatus = {
      valid: false,
      lang: siteLang,
      status: 'error',
      message: err?.message || (isEn ? 'Connection error while verifying API key.' : 'Błąd połączenia z serwerem sprawdzania klucza.'),
      checkedAt: new Date().toISOString(),
    };
    setSavedQuotaStatus(status);
    return status;
  }
}

/**
 * Executes an AI query for repositories.
 * - Routes Gemini (including AQ. Vertex Express and AIza... AI Studio keys) through backend proxy.
 * - Enforces user token budget and ONLY activates Offline Mode when tokens/quota run out (or no key exists).
 */
export async function handleClientSideAiFallback(options: ClientAiQueryOptions): Promise<ClientAiResponse> {
  const { query, repo, repoName = '', repoDesc = '', repoLang = '', readme = '', category = '', repos = REPOS, lang = 'en', signal } = options;
  const customApiKey = getLocalAIKey();
  const customProvider = getLocalAIProvider();
  const customBaseUrl = getLocalAIBaseUrl();
  const rawModel = getLocalAIModel();
  const maxOutputTokens = getMaxOutputTokens();

  // Check if user-configured session token quota limit is exhausted
  if (isSessionQuotaExhausted()) {
    const limit = getSessionTokenLimit();
    const used = getSessionTokensUsed();
    const offline = generateIntelligentOfflineReply({ query, repo, repoName, repoDesc, repoLang, readme, category, repos, lang });
    const notice = lang === 'en'
      ? `> ⚠️ **Token Quota Limit Reached (${used.toLocaleString()} / ${limit?.toLocaleString()} tokens)** — Automatically switched to **Offline Mode**.\n\n`
      : `> ⚠️ **Osiągnięto limit tokenów sesji (${used.toLocaleString()} / ${limit?.toLocaleString()} tok)** — Automatycznie włączono **Tryb Offline**.\n\n`;
    return {
      ...offline,
      reply: notice + offline.reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE • TOKEN LIMIT)',
      quotaExhausted: true,
    };
  }

  // 1. Server-side proxy call (handles Gemini AIza/AQ., Server Key, and OpenAI-compatible)
  if (HAS_BACKEND && (isGeminiApiKey(customApiKey, customProvider) || !customApiKey || customApiKey === 'local')) {
    try {
      const res = await fetch('/api/ai/chat-repo', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-ai-api-key': customApiKey, 'x-gemini-api-key': customApiKey } : {}),
          ...(customBaseUrl ? { 'x-ai-base-url': customBaseUrl } : {}),
          ...(customProvider ? { 'x-ai-provider': customProvider } : {}),
          ...(rawModel ? { 'x-ai-model': rawModel } : {}),
        },
        body: JSON.stringify({
          repoName: repo?.name || repoName,
          description: repoDesc || repo?.desc || repo?.descPl,
          lang: repoLang || repo?.lang,
          readme,
          userMessage: query,
          category: category || repo?.cat?.join(', '),
          customApiKey,
          customModel: rawModel,
          customBaseUrl,
          customProvider,
          maxOutputTokens,
          siteLang: lang,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};

      if (res.ok && data.reply) {
        if (data.usage?.totalTokens) {
          addSessionTokensUsed(data.usage.totalTokens);
        }
        return {
          reply: data.reply,
          provider: data.provider || 'Google Gemini (Server)',
          sourcesUsed: data.sourcesUsed || [repo?.name || repoName || 'Repository', 'Server AI Proxy'],
          usage: data.usage,
        };
      }

      // Quota / tokens exhausted (429) -> ONLY NOW trigger Offline Mode!
      if (res.status === 429 || data.quotaExhausted) {
        setSavedQuotaStatus({
          valid: false,
          status: 'quota_exhausted',
          message: data.error || 'Quota exhausted (429)',
          hint: data.hint,
          checkedAt: new Date().toISOString(),
        });
        const offline = generateIntelligentOfflineReply({ query, repo, repoName, repoDesc, repoLang, readme, category, repos, lang });
        const notice = lang === 'en'
          ? `> ⚠️ **API Quota / Tokens Exhausted (429)** — Automatically switched to **Offline Mode**.\n\n`
          : `> ⚠️ **Wyczerpano limit tokenów / quota API (429)** — Automatycznie włączono **Tryb Offline**.\n\n`;
        return {
          ...offline,
          reply: notice + offline.reply,
          provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE • QUOTA EXHAUSTED)',
          quotaExhausted: true,
        };
      }

      // Missing key anywhere on server & browser -> only then allow Offline Mode
      if (data.missingKey) {
        return generateIntelligentOfflineReply({
          query,
          repo,
          repoName,
          repoDesc,
          repoLang,
          readme,
          category,
          repos,
          lang,
        });
      }

      // If user explicitly provided a key and it's invalid (401/403/400), show the real error instead of hiding behind Offline Mode
      if (data.invalidKey || res.status === 401 || res.status === 403 || res.status === 400) {
        return {
          reply: lang === 'en'
            ? `⚠️ **API Key Error (${res.status}):** ${data.error || 'Invalid API key or permissions.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`
            : `⚠️ **Błąd Klucza API (${res.status}):** ${data.error || 'Nieprawidłowy klucz API lub brak uprawnień.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`,
          provider: `GEMINI ERROR (${res.status})`,
          sourcesUsed: ['🔑 API Key Diagnostics'],
          invalidKey: true,
        };
      }

      // Other upstream HTTP error (e.g. 500/503/504) -> report real API error instead of silent Offline Mode!
      if (!res.ok) {
        return {
          reply: lang === 'en'
            ? `⚠️ **Gemini API Error (${res.status}):** ${data.error || 'Upstream API error.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`
            : `⚠️ **Błąd Gemini API (${res.status}):** ${data.error || 'Problem z połączeniem z modelem.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`,
          provider: `API ERROR (${res.status})`,
          sourcesUsed: ['⚙️ Server Diagnostics'],
        };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.warn('Server AI proxy query failed:', e);
    }
  }

  // 2. Direct client-side OpenAI / OpenRouter / Groq API call (when no backend or non-Gemini key)
  if (customApiKey && !isGeminiApiKey(customApiKey, customProvider) && customApiKey !== 'local') {
    let endpoint = 'https://api.openai.com/v1/chat/completions';
    let defaultModel = 'gpt-4o-mini';
    let provLabel = 'OpenAI';
    const extraHeaders: Record<string, string> = {};

    if (customApiKey.startsWith('sk-or-')) {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      defaultModel = 'meta-llama/llama-3.3-70b-instruct';
      provLabel = 'OpenRouter';
      extraHeaders['HTTP-Referer'] = 'https://tomekdot.github.io';
      extraHeaders['X-Title'] = 'tomekdot Portfolio AI';
    } else if (customApiKey.startsWith('gsk_')) {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      defaultModel = 'llama-3.3-70b-versatile';
      provLabel = 'Groq';
    }

    try {
      const modelToUse = rawModel || defaultModel;
      const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customApiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: 'system',
              content: `You are tomekdot AI Assistant on tomekdot developer portfolio (tomekdot.github.io). Repository "${repoName || 'tomekdot'}" (${repoLang || 'Code'}, category: ${category || 'Software'}). Description: ${repoDesc || ''}.${readme ? `\nREADME:\n${readme.slice(0, 3000)}` : ''}\nLanguage: ${lang === 'en' ? 'English' : 'Polish'}.`
            },
            { role: 'user', content: query }
          ],
          ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
          temperature: 0.7,
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        const usage: TokenUsage | undefined = data.usage ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          candidatesTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        } : undefined;
        if (usage?.totalTokens) addSessionTokensUsed(usage.totalTokens);
        if (reply) {
          return {
            reply: reply.trim(),
            provider: `${provLabel.toUpperCase()} (${modelToUse.toUpperCase()})`,
            sourcesUsed: [repoName || 'Repository', readme ? 'README.md' : 'Metadata', `${provLabel} Cloud API`],
            usage,
          };
        }
      } else if (res.status === 429) {
        const offline = generateIntelligentOfflineReply({ query, repo, repoName, repoDesc, repoLang, readme, category, repos, lang });
        return {
          ...offline,
          reply: (lang === 'en' ? '> ⚠️ **API Quota Exhausted (429)** — Switched to Offline Mode.\n\n' : '> ⚠️ **Wyczerpano limit tokenów (429)** — Przełączono na Tryb Offline.\n\n') + offline.reply,
          provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE • QUOTA EXHAUSTED)',
          quotaExhausted: true,
        };
      }
    } catch (apiErr: any) {
      if (apiErr.name === 'AbortError') throw apiErr;
      console.warn(`Direct client query to ${provLabel} failed:`, apiErr);
    }
  }

  // 3. Direct client-side Local PC AI Engine call (Ollama / LM Studio / Custom)
  const isLocalEngine = customProvider === 'ollama' || customProvider === 'lmstudio' || customProvider === 'custom' || (Boolean(customBaseUrl) && !isGeminiApiKey(customApiKey, customProvider));
  if (isLocalEngine) {
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const targetBaseUrl = customBaseUrl || (customProvider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1');
    const isHttpTarget = /^http:\/\//i.test(targetBaseUrl);

    if (isHttpsPage && isHttpTarget) {
      const provName = PROVIDERS_CONFIG[customProvider]?.nameEn || 'Local PC Engine';
      const provNamePl = PROVIDERS_CONFIG[customProvider]?.namePl || 'Lokalny Silnik PC';
      const reply = lang === 'en'
        ? `⚠️ **Browser Security Restriction (Mixed Content)**\n\nThis portfolio is running over HTTPS (\`${window.location.host}\`), so your web browser blocks direct insecure requests to \`${targetBaseUrl}\`.\n\n**To run with your local ${provName} (Ollama / LM Studio):**\n1. **Clone the repository and run \`npm run dev\`** at \`http://localhost:3000\`.\n2. Or enter a Google Gemini key (\`AIza...\` or \`AQ....\`) in setup (🔑).`
        : `⚠️ **Blokada bezpieczeństwa przeglądarki (Mixed Content)**\n\nStrona działa w HTTPS (\`${window.location.host}\`), dlatego przeglądarka blokuje połączenia do \`${targetBaseUrl}\`.\n\n**Jak używać ${provNamePl}:**\n1. Uruchom projekt lokalnie przez \`npm run dev\` pod \`http://localhost:3000\`.\n2. Lub wprowadź klucz Google Gemini (\`AIza...\` lub \`AQ....\`) w konfiguracji (🔑).`;

      return {
        reply,
        provider: `${(PROVIDERS_CONFIG[customProvider]?.shortNameEn || 'LOCAL AI').toUpperCase()} (HTTPS NOTICE)`,
        sourcesUsed: ['Browser Security Policy', 'Documentation']
      };
    }

    try {
      const endpoint = normalizeOpenAIEndpoint(targetBaseUrl);
      const modelToUse = rawModel || (customProvider === 'ollama' ? 'llama3.2' : 'local-model');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (customApiKey && customApiKey !== 'local') {
        headers['Authorization'] = `Bearer ${customApiKey}`;
      }

      const systemInstruction = `You are tomekdot AI Assistant on tomekdot GitHub Portfolio.
Repository "${repoName || 'tomekdot'}" (${repoLang || 'Code'}, category: ${category || 'Software'}).
Description: ${repoDesc || ''}
${readme ? `\nREADME Excerpt:\n${readme.slice(0, 3000)}` : ''}
Response Language: ${lang === 'en' ? 'English' : 'Polish'}.`;

      const res = await fetch(endpoint, {
        method: 'POST',
        signal,
        headers,
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: query }
          ],
          ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
          temperature: 0.7,
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        const usage: TokenUsage | undefined = data.usage ? {
          promptTokens: data.usage.prompt_tokens ?? 0,
          candidatesTokens: data.usage.completion_tokens ?? 0,
          totalTokens: data.usage.total_tokens ?? 0,
        } : undefined;
        if (usage?.totalTokens) addSessionTokensUsed(usage.totalTokens);
        if (reply) {
          return {
            reply: reply.trim(),
            provider: `${(PROVIDERS_CONFIG[customProvider]?.shortNameEn || 'LOCAL AI').toUpperCase()} (${modelToUse.toUpperCase()})`,
            sourcesUsed: [repoName || 'Repository', readme ? 'README.md' : 'Metadata', 'Local PC Engine'],
            usage,
          };
        }
      } else {
        const errText = await res.text().catch(() => '');
        return {
          reply: lang === 'en'
            ? `⚠️ **Local Engine Error (${res.status}):** Could not query ${endpoint}.\n\`\`\`\n${errText.slice(0, 300)}\n\`\`\``
            : `⚠️ **Błąd silnika lokalnego (${res.status}):** Nie udało się pobrać odpowiedzi z ${endpoint}.\n\`\`\`\n${errText.slice(0, 300)}\n\`\`\``,
          provider: 'LOCAL ENGINE ERROR'
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      console.warn('Direct local engine query failed:', err);
    }
  }

  // 4. Autonomous Knowledge Engine Fallback (Only when no API key is available or static offline hosting)
  return generateIntelligentOfflineReply({
    query,
    repo,
    repoName,
    repoDesc,
    repoLang,
    readme,
    category,
    repos,
    lang,
  });
}

/**
 * Generates an archival technical summary for a repository.
 */
export async function generateClientSideSummary(params: {
  repo: Repository;
  lang: 'en' | 'pl';
  readme?: string | null;
  signal?: AbortSignal;
}): Promise<{
  summary: string;
  keyFeatures: string[];
  technicalHighlights: string;
  provider: string;
  usage?: TokenUsage;
  quotaExhausted?: boolean;
}> {
  const { repo, lang, readme = '', signal } = params;
  const customApiKey = getLocalAIKey();
  const customProvider = getLocalAIProvider();
  const customBaseUrl = getLocalAIBaseUrl();
  const rawModel = getLocalAIModel();
  const maxOutputTokens = getMaxOutputTokens();

  if (HAS_BACKEND && !isSessionQuotaExhausted()) {
    try {
      const res = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        signal,
        headers: { 
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-ai-api-key': customApiKey, 'x-gemini-api-key': customApiKey } : {}),
          ...(customProvider ? { 'x-ai-provider': customProvider } : {}),
          ...(rawModel ? { 'x-ai-model': rawModel } : {}),
          ...(customBaseUrl ? { 'x-ai-base-url': customBaseUrl } : {}),
        },
        body: JSON.stringify({
          repoName: repo.name,
          description: repo.desc || repo.descPl,
          lang: repo.lang,
          readme,
          isPrivate: repo.isPrivate,
          category: repo.cat?.join(', '),
          customApiKey,
          customModel: rawModel,
          customBaseUrl,
          customProvider,
          maxOutputTokens,
          siteLang: lang,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};

      if (res.ok && data.success) {
        if (data.usage?.totalTokens) {
          addSessionTokensUsed(data.usage.totalTokens);
        }
        return {
          summary: (lang === 'en' ? data.summaryEn : data.summaryPl) || repo.desc || '',
          keyFeatures: Array.isArray(data.keyFeatures) ? data.keyFeatures : [],
          technicalHighlights: data.technicalHighlights || '',
          provider: data.provider || 'Google Gemini (Server)',
          usage: data.usage,
        };
      }

      if (res.status === 429 || data.quotaExhausted) {
        setSavedQuotaStatus({
          valid: false,
          status: 'quota_exhausted',
          message: data.error || 'Quota exhausted (429)',
          checkedAt: new Date().toISOString(),
        });
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.warn('Server summary generation proxy failed:', e);
    }
  }

  // Fallback to local structured data & README extraction (only when offline/quota exhausted)
  const parsedReadme = parseReadmeKnowledge(readme || repo.readme || '');
  const curatedSummary = lang === 'en'
    ? (repo.longDescEn || repo.desc)
    : (repo.longDescPl || repo.descPl || repo.desc);
  const summary = curatedSummary && curatedSummary.length >= (parsedReadme.leadSummary?.length || 0)
    ? curatedSummary
    : (parsedReadme.leadSummary || curatedSummary || '');

  const curatedFeatures = (lang === 'en' ? repo.featuresEn : repo.featuresPl) || repo.featuresPl || repo.featuresEn || [];
  const keyFeatures = curatedFeatures.length > 0 ? curatedFeatures : parsedReadme.extractedFeatures;

  const stackList = (repo.capabilities && repo.capabilities.length > 0)
    ? repo.capabilities
    : parsedReadme.detectedStack;
  const technicalHighlights = stackList.length > 0
    ? `${lang === 'en' ? 'Core Capabilities & Stack:' : 'Kluczowe technologie i biblioteki:'} ${stackList.join(' • ')}`
    : '';

  return {
    summary: summary || '',
    keyFeatures,
    technicalHighlights,
    provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE • METADATA)',
    quotaExhausted: isSessionQuotaExhausted(),
  };
}

/**
 * Executes an AI query for blog articles.
 */
export async function handleClientSideBlogAiFallback(options: ClientBlogAiQueryOptions): Promise<ClientAiResponse> {
  const { query, postTitle, postExcerpt = '', postContent = '', draftContent = '', aiRevisionNote = '', lang = 'en', signal } = options;
  const customApiKey = getLocalAIKey();
  const customProvider = getLocalAIProvider();
  const customBaseUrl = getLocalAIBaseUrl();
  const rawModel = getLocalAIModel();
  const maxOutputTokens = getMaxOutputTokens();

  const buildOfflineBlogReply = (prefixNotice = ''): ClientAiResponse => {
    const matchedPost = BLOG_POSTS.find(p =>
      (options.postId && p.id === options.postId) ||
      p.titleEn.toLowerCase() === postTitle.toLowerCase() ||
      p.titlePl.toLowerCase() === postTitle.toLowerCase()
    );

    const isEn = lang === 'en';
    const title = matchedPost ? (isEn ? matchedPost.titleEn : matchedPost.titlePl) : postTitle;
    const excerpt = matchedPost ? (isEn ? matchedPost.excerptEn : matchedPost.excerptPl) : postExcerpt;
    const draft = matchedPost
      ? (isEn ? (matchedPost.draftVersionContentEn || matchedPost.draftVersionContent || '') : (matchedPost.draftVersionContentPl || matchedPost.draftVersionContent || ''))
      : draftContent;
    const full = matchedPost ? (isEn ? matchedPost.contentEn : matchedPost.contentPl) : postContent;
    const note = matchedPost
      ? (isEn ? (matchedPost.aiVersionNoteEn || matchedPost.aiVersionNote || '') : (matchedPost.aiVersionNotePl || matchedPost.aiVersionNote || ''))
      : aiRevisionNote;
    const tags = matchedPost?.tags || options.tags || [];

    const qNorm = normalizeSearchText(query);
    const isCompareOrAdded = /(v1|v2|raw|diff|porown|dopis|dodan|szkic|zmian)/i.test(qNorm);
    const isDebateOrCritique = /(zgadz|polemi|disagree|agree|popraw|critiq|ryzyk|blad|uwag|watpliw|dysku)/i.test(qNorm);
    const parsedArticle = parseReadmeKnowledge(full);

    let body = '';
    if (isCompareOrAdded) {
      const draftLines = draft.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
      const headings = parsedArticle.sections.map(s => s.heading).filter(h => h !== 'Overview');
      body = isEn
        ? `⚖️ **Raw \`v1.0\` vs \`v2.0\` Comparison — ${title}**\n\n` +
          `**From Raw \`v1.0\` Draft (${draftLines.length} lines):**\n${draftLines.map(l => `• ${l.replace(/^-\s*/, '')}`).join('\n') || `• ${excerpt}`}\n\n` +
          `**Added / Expanded in \`v2.0\`:**\n${headings.map(h => `• Section: **${h}**`).join('\n') || '• Expanded narrative & illustrative code snippets.'}\n` +
          (note ? `\n📝 *Synthesis Note:* ${note}` : '')
        : `⚖️ **Porównanie Surowego \`v1.0\` vs \`v2.0\` — ${title}**\n\n` +
          `**Z surowego szkicu \`v1.0\` (${draftLines.length} linii):**\n${draftLines.map(l => `• ${l.replace(/^-\s*/, '')}`).join('\n') || `• ${excerpt}`}\n\n` +
          `**Dopisane / rozwinięte w \`v2.0\`:**\n${headings.map(h => `• Sekcja: **${h}**`).join('\n') || '• Rozszerzona narracja oraz przykładowe fragmenty kodu.'}\n` +
          (note ? `\n📝 *Notatka syntezy:* ${note}` : '');
    } else if (isDebateOrCritique) {
      body = isEn
        ? `⚖️ **Offline Critical Summary — ${title}**\n\n${excerpt}\n\n• **Core thesis:** ${note || 'Architectural optimization and modular structure.'}\n• **Check carefully:** Compare quantitative claims and illustrative snippets in \`v2.0\` against the concise \`v1.0\` raw notes to spot extrapolations or missing error handling.`
        : `⚖️ **Offline Podsumowanie Krytyczne — ${title}**\n\n${excerpt}\n\n• **Główna teza:** ${note || 'Optymalizacja architektury i modułowa struktura.'}\n• **Na co zwrócić uwagę:** Zweryfikuj konkretne liczby, przykładowe fragmenty kodu i obsługę błędów w \`v2.0\` względem zwięzłych notatek z \`v1.0 Raw\`.`;
    } else {
      const qTokens = expandQueryTokens(qNorm);
      const matchedSections = qTokens.length > 0
        ? parsedArticle.sections
            .map(sec => {
              const hay = normalizeSearchText(`${sec.heading}\n${sec.rawText}`);
              let score = 0;
              for (const tok of qTokens) {
                if (normalizeSearchText(sec.heading).includes(tok)) score += 3;
                else if (hay.includes(tok)) score += 1;
              }
              return { sec, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
        : [];

      if (matchedSections.length > 0) {
        const top = matchedSections.slice(0, 2);
        const excerptBlock = top
          .map(({ sec }) => `#### **${sec.heading}**\n${formatReadmeSectionSnippet(sec, 5, 1)}`)
          .join('\n\n');
        body = isEn
          ? `### 🔍 **Matched Article Sections — ${title}**\n\n${excerptBlock}`
          : `### 🔍 **Dopasowane fragmenty artykułu — ${title}**\n\n${excerptBlock}`;
      } else {
        body = isEn
          ? `📝 **${title}**\n\n${excerpt}\n\n• **Tags:** ${tags.map(t => `#${t}`).join(', ')}\n• **Synthesis notes:** ${note || 'Archival dev journal synthesis.'}`
          : `📝 **${title}**\n\n${excerpt}\n\n• **Tagi:** ${tags.map(t => `#${t}`).join(', ')}\n• **Notatki syntezy:** ${note || 'Syntetyczny dziennik deweloperski.'}`;
      }
    }

    return {
      reply: prefixNotice + body,
      provider: prefixNotice ? 'AUTONOMOUS KNOWLEDGE (OFFLINE • QUOTA/LIMIT)' : 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed: [title, 'v1.0 + v2.0 Article Data'],
      quotaExhausted: Boolean(prefixNotice),
    };
  };

  if (isSessionQuotaExhausted()) {
    const limit = getSessionTokenLimit();
    const used = getSessionTokensUsed();
    const notice = lang === 'en'
      ? `> ⚠️ **Token Quota Limit Reached (${used.toLocaleString()} / ${limit?.toLocaleString()} tokens)** — Offline Mode.\n\n`
      : `> ⚠️ **Osiągnięto limit tokenów sesji (${used.toLocaleString()} / ${limit?.toLocaleString()} tok)** — Tryb Offline.\n\n`;
    return buildOfflineBlogReply(notice);
  }

  if (HAS_BACKEND) {
    try {
      const res = await fetch('/api/ai/chat-blog', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-ai-api-key': customApiKey, 'x-gemini-api-key': customApiKey } : {}),
          ...(customProvider ? { 'x-ai-provider': customProvider } : {}),
          ...(rawModel ? { 'x-ai-model': rawModel } : {}),
          ...(customBaseUrl ? { 'x-ai-base-url': customBaseUrl } : {}),
        },
        body: JSON.stringify({
          articleId: options.postId,
          postTitle,
          postExcerpt,
          postContent,
          draftContent,
          aiRevisionNote,
          tags: options.tags,
          userMessage: query,
          customApiKey,
          customModel: rawModel,
          customBaseUrl,
          customProvider,
          maxOutputTokens,
          siteLang: lang,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : {};

      if (res.ok && data.reply) {
        if (data.usage?.totalTokens) {
          addSessionTokensUsed(data.usage.totalTokens);
        }
        return {
          reply: data.reply,
          provider: data.provider || 'Google Gemini (Server)',
          sourcesUsed: data.sourcesUsed || [postTitle, 'Server AI Proxy'],
          usage: data.usage,
        };
      }

      if (res.status === 429 || data.quotaExhausted) {
        setSavedQuotaStatus({
          valid: false,
          status: 'quota_exhausted',
          message: data.error || 'Quota exhausted (429)',
          checkedAt: new Date().toISOString(),
        });
        const notice = lang === 'en'
          ? `> ⚠️ **API Quota Exhausted (429)** — Automatically switched to Offline Mode.\n\n`
          : `> ⚠️ **Wyczerpano limit tokenów / quota API (429)** — Włączono Tryb Offline.\n\n`;
        return buildOfflineBlogReply(notice);
      }

      if (data.missingKey) {
        return buildOfflineBlogReply('');
      }

      if (data.invalidKey || res.status === 401 || res.status === 403 || res.status === 400) {
        return {
          reply: lang === 'en'
            ? `⚠️ **API Key Error (${res.status}):** ${data.error || 'Invalid API key.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`
            : `⚠️ **Błąd Klucza API (${res.status}):** ${data.error || 'Nieprawidłowy klucz API.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`,
          provider: `GEMINI ERROR (${res.status})`,
          invalidKey: true,
        };
      }

      if (!res.ok) {
        return {
          reply: lang === 'en'
            ? `⚠️ **Gemini API Error (${res.status}):** ${data.error || 'Upstream API error.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`
            : `⚠️ **Błąd Gemini API (${res.status}):** ${data.error || 'Problem z połączeniem z modelem.'}\n\n${data.hint ? `💡 *${data.hint}*` : ''}`,
          provider: `API ERROR (${res.status})`,
          sourcesUsed: ['⚙️ Server Diagnostics'],
        };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.warn('Server blog chat proxy failed:', e);
    }
  }

  // Local engine handling for blog
  const isLocalEngine = customProvider === 'ollama' || customProvider === 'lmstudio' || customProvider === 'custom' || (Boolean(customBaseUrl) && !isGeminiApiKey(customApiKey, customProvider));
  if (isLocalEngine) {
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const targetBaseUrl = customBaseUrl || (customProvider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1');
    const isHttpTarget = /^http:\/\//i.test(targetBaseUrl);

    if (isHttpsPage && isHttpTarget) {
      return {
        reply: lang === 'en'
          ? `⚠️ **Browser Security Restriction (Mixed Content)**\n\nThis site is loaded over HTTPS (\`${window.location.host}\`), preventing direct connections to insecure \`${targetBaseUrl}\`.\n\nRun locally via \`npm run dev\` at \`http://localhost:3000\` or configure a Google Gemini key.`
          : `⚠️ **Blokada bezpieczeństwa przeglądarki (Mixed Content)**\n\nStrona działa w HTTPS (\`${window.location.host}\`), co uniemożliwia bezpośrednie połączenia do lokalnego adresu HTTP (\`${targetBaseUrl}\`).\n\nUruchom projekt lokalnie (\`npm run dev\`) lub wprowadź klucz Google Gemini.`,
        provider: `${(PROVIDERS_CONFIG[customProvider]?.shortNameEn || 'LOCAL AI').toUpperCase()} (HTTPS NOTICE)`
      };
    }
  }

  // Static knowledge response for article
  return buildOfflineBlogReply('');
}
