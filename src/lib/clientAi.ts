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

/**
 * Intelligent offline repository knowledge assistant.
 * Analyzes the user's query intent (greeting, what does it do, installation, commands, architecture, AI setup)
 * and synthesizes structured, repository-specific answers without needing an external API key.
 */
export function generateIntelligentOfflineReply(params: {
  query: string;
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
    repoName = '', 
    repoDesc = '', 
    repoLang = '', 
    readme = '', 
    category = '', 
    repos = REPOS, 
    lang = 'en' 
  } = params;

  const qLower = (query || '').trim().toLowerCase();
  const hasExplicitPolishCharsOrWords = /[ąćęłńóśźż]|\b(czesc|cześć|zesc|hej|witaj|siema|siemanko|dzien dobry|co robi|jak|gdzie|dlaczego|kiedy|komendy|instalac|opis|funkcj|wtyczk|kod|architektur)\b/i.test(query || '');
  const isPolish = lang === 'pl' || hasExplicitPolishCharsOrWords;

  // Find targeted repository in indexed database
  const targetRepo = repos.find(r => r.name.toLowerCase() === repoName.toLowerCase())
    || repos.find(r => r.name.toLowerCase().includes(qLower) || qLower.includes(r.name.toLowerCase()))
    || (repos.length > 0 ? repos[0] : null);

  const activeName = targetRepo ? targetRepo.name : (repoName || 'tomekdot repository');
  const activeLang = targetRepo?.lang || repoLang || 'TypeScript/Python';
  const activeCat = targetRepo?.cat?.join(', ') || category || 'Software';
  const activeDesc = targetRepo ? (isPolish ? (targetRepo.descPl || targetRepo.desc) : targetRepo.desc) : repoDesc;
  const activeLongDesc = targetRepo ? (isPolish ? (targetRepo.longDescPl || targetRepo.descPl || targetRepo.desc) : (targetRepo.longDescEn || targetRepo.desc)) : repoDesc;
  const activeFeatures = targetRepo ? ((isPolish ? targetRepo.featuresPl : targetRepo.featuresEn) || targetRepo.featuresEn || targetRepo.featuresPl || []) : [];
  const activeCapabilities = targetRepo?.capabilities || [];
  const starsLabel = targetRepo?.isPrivate ? (isPolish ? 'Projekt prywatny' : 'Private repository') : `${targetRepo?.stars ?? 0} ★`;

  const sourcesUsed: string[] = [
    activeName,
    isPolish ? `⚙️ Metadane repozytorium (${activeLang}, ${activeCat})` : `⚙️ Repository metadata (${activeLang}, ${activeCat})`,
  ];
  if (readme && readme.trim().length > 30) {
    sourcesUsed.push(isPolish ? '📄 Plik README.md (Zsynchronizowany)' : '📄 Synced README.md');
  }
  sourcesUsed.push(isPolish ? '📚 Autonomiczny Silnik Bazy Wiedzy' : '📚 Autonomous Knowledge Engine');

  // 1. INTENT: Greetings & Introduction ("czesc", "hej", "witaj", "hello", "hi")
  const isGreeting = /^(cze[sś][cć]?|ze[sś][cć]?|czesc|zesc|czes|zes|hej|witaj|siema|siemanko|elo|dzie[nń]\s*dobry|dobry\s*wiecz[oó]r|yo|hello|hi|hey|greetings|howdy)\b/i.test(qLower) 
    || /^(czym\s*jeste[sś]|kim\s*jeste[sś]|who\s*are\s*you|co\s*potrafisz|what\s*can\s*you\s*do)\b/i.test(qLower);

  if (isGreeting) {
    const greetingText = isPolish
      ? `Cześć! 👋 Jestem asystentem AI dla repozytorium **\`${activeName}\`** (${activeLang} • ${activeCat}).\n\nW czym mogę Ci dzisiaj pomóc? Możesz zapytać o przeznaczenie projektu, funkcje, instalację, komendy czy architekturę kodu.`
      : `Hello! 👋 I am the AI companion for repository **\`${activeName}\`** (${activeLang} • ${activeCat}).\n\nHow can I help you today? Feel free to ask about project features, installation, commands, or code architecture.`;

    return {
      reply: greetingText,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 2. INTENT: Purpose, Features & What does it do ("co robi", "what does this do", "opis", "funkcje", "features")
  const isPurposeOrFeatures = qLower.includes('co robi') 
    || qLower.includes('what does this do') 
    || qLower.includes('what does it do')
    || qLower.includes('what is this')
    || qLower.includes('czym jest') 
    || qLower.includes('do czego') 
    || qLower.includes('zastosowani') 
    || qLower.includes('funkcj') 
    || qLower.includes('features') 
    || qLower.includes('opis') 
    || qLower.includes('describe') 
    || qLower.includes('cel') 
    || qLower.includes('purpose')
    || qLower.includes('summary') 
    || qLower.includes('podsumuj');

  if (isPurposeOrFeatures) {
    const featuresList = activeFeatures.length > 0 
      ? activeFeatures.map(f => `• ${f}`).join('\n')
      : (isPolish 
          ? `• Modułowa architektura zoptymalizowana pod kątem wydajności\n• Pełna integracja ze środowiskiem uruchomieniowym (${activeCat})\n• Asynchroniczna obsługa zdarzeń i telemetrycznych wywołań zwrotnych`
          : `• Modular architecture optimized for runtime efficiency\n• Deep integration with ${activeCat} ecosystem\n• Asynchronous event handling and telemetry callbacks`);

    const capabilitiesList = activeCapabilities.length > 0
      ? `\n\n**${isPolish ? 'Kluczowe możliwości & technologie:' : 'Core Capabilities & Stack:'}**\n` + activeCapabilities.map(c => `\`${c}\``).join(' • ')
      : '';

    const reply = isPolish
      ? `### 📦 **Przegląd Techniczny: \`${activeName}\`**\n\n` +
        `**Status:** ${starsLabel} • **Język:** \`${activeLang}\` • **Kategoria:** \`${activeCat}\`\n\n` +
        `#### **Opis funkcjonalny:**\n${activeLongDesc || activeDesc}\n\n` +
        `#### **Kluczowe funkcje & możliwości:**\n${featuresList}${capabilitiesList}\n\n` +
        (targetRepo?.url ? `🔗 **Kod źródłowy na GitHubie:** [${targetRepo.url}](${targetRepo.url})` : '')
      : `### 📦 **Technical Overview: \`${activeName}\`**\n\n` +
        `**Status:** ${starsLabel} • **Language:** \`${activeLang}\` • **Category:** \`${activeCat}\`\n\n` +
        `#### **Functional Description:**\n${activeLongDesc || activeDesc}\n\n` +
        `#### **Key Features & Highlights:**\n${featuresList}${capabilitiesList}\n\n` +
        (targetRepo?.url ? `🔗 **Source Code on GitHub:** [${targetRepo.url}](${targetRepo.url})` : '');

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 3. INTENT: Installation & Setup Guide ("jak zainstalować", "how to install", "setup", "uruchom", "wymagania")
  const isInstall = qLower.includes('install') 
    || qLower.includes('instal') 
    || qLower.includes('setup') 
    || qLower.includes('konfigur') 
    || qLower.includes('uruchom') 
    || qLower.includes('odpal') 
    || qLower.includes('require') 
    || qLower.includes('wymagan') 
    || qLower.includes('jak uzywac')
    || qLower.includes('jak używać');

  if (isInstall) {
    const isPyPlanet = activeCat.toLowerCase().includes('pyplanet') || activeName.toLowerCase().includes('pyplanet');
    const isOpenplanet = activeCat.toLowerCase().includes('openplanet') || activeName.toLowerCase().includes('openplanet') || activeLang.toLowerCase().includes('angelscript');
    const isNodeOrWeb = activeLang.toLowerCase().includes('typescript') || activeLang.toLowerCase().includes('javascript') || activeCat.toLowerCase().includes('utilities');

    let installInstructions = '';
    if (isPyPlanet) {
      installInstructions = isPolish
        ? `#### **Krok 1: Klonowanie wtyczki**\nPrzejdź do katalogu aplikacji PyPlanet i sklonuj repozytorium:\n\`\`\`bash\ncd /path/to/pyplanet/apps/\ngit clone https://github.com/tomekdot/${activeName}.git ${activeName}\n\`\`\`\n\n` +
          `#### **Krok 2: Rejestracja w konfiguracji**\nW pliku \`settings/apps.py\` dodaj wpis do listy \`APPS\`:\n\`\`\`python\nAPPS = [\n    # ...\n    'apps.${activeName}',\n]\n\`\`\`\n\n` +
          `#### **Krok 3: Restart serwera**\n\`\`\`bash\n./manage.py restart\n\`\`\`\nSprawdź plik \`logs/pyplanet.log\`, aby upewnić się, że sygnały i komendy zostały zarejestrowane pomyślnie.`
        : `#### **Step 1: Clone plugin directory**\nNavigate to your PyPlanet \`apps/\` directory and clone:\n\`\`\`bash\ncd /path/to/pyplanet/apps/\ngit clone https://github.com/tomekdot/${activeName}.git ${activeName}\n\`\`\`\n\n` +
          `#### **Step 2: Register in apps.py**\nAppend the module to \`APPS\` inside \`settings/apps.py\`:\n\`\`\`python\nAPPS = [\n    # ...\n    'apps.${activeName}',\n]\n\`\`\`\n\n` +
          `#### **Step 3: Restart controller**\n\`\`\`bash\n./manage.py restart\n\`\`\`\nVerify registration in \`logs/pyplanet.log\`.`;
    } else if (isOpenplanet) {
      installInstructions = isPolish
        ? `#### **Krok 1: Kopiowanie do katalogu Plugins**\nSkopiuj skompilowany plik \`.op\` lub folder ze skryptem do katalogu wtyczek Openplanet:\n\`\`\`text\nC:\\Users\\<TwojaNazwaUzytkownika>\\OpenplanetNext\\Plugins\\\n\`\`\`\n\n` +
          `#### **Krok 2: Aktywacja w grze**\n1. Włącz Trackmania (TM2020).\n2. Naciśnij klawisz \`F3\`, aby otworzyć nakładkę Openplanet.\n3. Przejdź do menu *Developer -> Reload Plugins*.\n4. Nowe widżety HUD i menu pojawią się na ekranie.`
        : `#### **Step 1: Copy to Plugins Directory**\nCopy the plugin folder or \`.op\` package to:\n\`\`\`text\nC:\\Users\\<YourUsername>\\OpenplanetNext\\Plugins\\\n\`\`\`\n\n` +
          `#### **Step 2: Enable in Trackmania**\n1. Launch Trackmania (TM2020).\n2. Press \`F3\` to toggle the Openplanet overlay.\n3. Click *Developer -> Reload Plugins* to initialize widgets.`;
    } else if (isNodeOrWeb) {
      installInstructions = isPolish
        ? `#### **Krok 1: Klonowanie i instalacja zależności**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\nnpm install\n\`\`\`\n\n` +
          `#### **Krok 2: Uruchomienie lokalnego serwera deweloperskiego**\n\`\`\`bash\nnpm run dev\n\`\`\`\nAplikacja wystartuje pod adresem \`http://localhost:3000\`.\n\n` +
          `#### **Krok 3: Budowanie wersji produkcyjnej**\n\`\`\`bash\nnpm run build\n\`\`\``
        : `#### **Step 1: Clone and install packages**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\nnpm install\n\`\`\`\n\n` +
          `#### **Step 2: Start local development server**\n\`\`\`bash\nnpm run dev\n\`\`\`\nThe dev server runs on \`http://localhost:3000\`.\n\n` +
          `#### **Step 3: Production bundle build**\n\`\`\`bash\nnpm run build\n\`\`\``;
    } else {
      installInstructions = isPolish
        ? `#### **Krok 1: Klonowanie repozytorium**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\n\`\`\`\n\n` +
          `#### **Krok 2: Konfiguracja środowiska (${activeLang})**\nUpewnij się, że masz zainstalowany interpreter/kompilator dla \`${activeLang}\` i uruchom główny punkt wejściowy projektu.`
        : `#### **Step 1: Clone repository**\n\`\`\`bash\ngit clone https://github.com/tomekdot/${activeName}.git\ncd ${activeName}\n\`\`\`\n\n` +
          `#### **Step 2: Environment setup (${activeLang})**\nEnsure your runtime environment supports \`${activeLang}\` and execute the application entry point.`;
    }

    const reply = isPolish
      ? `### 🛠️ **Instrukcja Instalacji & Konfiguracji: \`${activeName}\`**\n\n` +
        `Środowisko docelowe: **\`${activeCat}\`** (Język: **\`${activeLang}\`**)\n\n` +
        installInstructions
      : `### 🛠️ **Installation & Configuration Guide: \`${activeName}\`**\n\n` +
        `Target Environment: **\`${activeCat}\`** (Language: **\`${activeLang}\`**)\n\n` +
        installInstructions;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 4. INTENT: Commands, HUD & In-Game Controls ("komendy", "commands", "gra", "trackmania", "czat")
  const isCommands = qLower.includes('komend') 
    || qLower.includes('command') 
    || qLower.includes('hud') 
    || qLower.includes('nakładk') 
    || qLower.includes('nakladk') 
    || qLower.includes('overlay') 
    || qLower.includes('czat') 
    || qLower.includes('chat') 
    || qLower.includes('klawisz') 
    || qLower.includes('skrót') 
    || qLower.includes('skrot');

  if (isCommands) {
    const isPyPlanet = activeCat.toLowerCase().includes('pyplanet') || activeName.toLowerCase().includes('pyplanet');
    const isOpenplanet = activeCat.toLowerCase().includes('openplanet') || activeName.toLowerCase().includes('openplanet');

    let cmdSection = '';
    if (isPyPlanet) {
      cmdSection = isPolish
        ? `• **Komendy w czacie gry:** Wpisz \`//help\` lub \`//${activeName.replace(/^pyplanet-/, '')}\` w oknie czatu gry Trackmania, aby wyświetlić listę dostępnych podkomend.\n` +
          `• **Poziomy uprawnień:** Standardowi gracze mają dostęp do statystyk i widoków informacyjnych; komendy konfiguracyjne wymagają uprawnień \`admin\` lub \`operator\` w PyPlanet.\n` +
          `• **Zdarzenia serwera:** Plugin automatycznie reaguje na sygnały rozpoczęcia mapy, zakończenia rundy i czasów przejazdu graczy.`
        : `• **In-Game Chat Commands:** Type \`//help\` or \`//${activeName.replace(/^pyplanet-/, '')}\` in the Trackmania chat to list registered commands.\n` +
          `• **Permissions:** Standard players can query stats/info; administrative commands require \`admin\` or \`operator\` roles in PyPlanet.\n` +
          `• **Server Events:** Signals fire synchronously with map changes, player checkpoints, and finish times.`;
    } else if (isOpenplanet) {
      cmdSection = isPolish
        ? `• **Klawisz aktywacji (\`F3\`):** Otwiera i zamyka nakładkę interfejsu Openplanet bezpośrednio w oknie gry Trackmania.\n` +
          `• **Elementy HUD:** Widżet graficzny renderuje się bezpośrednio na warstwie gry przez AngelScript.\n` +
          `• **Menu konfiguracyjne:** W menu Openplanet przejdź do zakładki *Settings -> ${activeName}*, aby dostosować pozycję, przezroczystość i skróty.`
        : `• **Toggle Key (\`F3\`):** Toggles the Openplanet overlay UI directly inside Trackmania.\n` +
          `• **HUD Widgets:** Real-time visual overlay rendered via AngelScript frame hooks.\n` +
          `• **Configuration Menu:** Open *Settings -> ${activeName}* inside the Openplanet menu to customize HUD position and toggles.`;
    } else {
      cmdSection = isPolish
        ? `• **Interfejs / CLI:** Projekt udostępnia zdefiniowane komendy w pliku konfiguracyjnym lub interfejsie graficznym.\n` +
          `• **Skrypty npm / CLI:** Sprawdź sekcję \`scripts\` w \`package.json\` (np. \`npm run dev\`, \`npm run build\`).`
        : `• **Interface / CLI:** Commands and script shortcuts are registered in package/module configuration.\n` +
          `• **NPM / CLI Scripts:** Available build and execution scripts include \`npm run dev\` and \`npm run build\`.`;
    }

    const reply = isPolish
      ? `### 🎮 **Komendy, Sterowanie & Integracja: \`${activeName}\`**\n\n` +
        `Komponent integruje się z systemem gry i interfejsem użytkownika:\n\n` +
        cmdSection + `\n\n` +
        `💡 *Wskazówka: Wszelkie niestandardowe aliasy można zdefiniować w pliku konfiguracyjnym wtyczki.*`
      : `### 🎮 **Commands, Controls & Integration: \`${activeName}\`**\n\n` +
        `Integration points with game runtime and user interface:\n\n` +
        cmdSection + `\n\n` +
        `💡 *Tip: Custom aliases can be customized directly in the plugin configuration file.*`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 5. INTENT: Architecture, Concurrency & Code Logic ("architektura", "kod", "logika", "async", "sqlite")
  const isArchitecture = qLower.includes('architektur') 
    || qLower.includes('kod') 
    || qLower.includes('code') 
    || qLower.includes('logik') 
    || qLower.includes('async') 
    || qLower.includes('asynchroniczn') 
    || qLower.includes('sqlite') 
    || qLower.includes('baza') 
    || qLower.includes('database') 
    || qLower.includes('wielow[aą]tk') 
    || qLower.includes('struktur');

  if (isArchitecture) {
    const reply = isPolish
      ? `### ⚙️ **Architektura Kodu & Logika Wykonania: \`${activeName}\`**\n\n` +
        `• **Język & Środowisko:** \`${activeLang}\` w ekosystemie \`${activeCat}\`.\n` +
        `• **Model współbieżności:** Asynchroniczna pętla zdarzeń zapobiegająca blokowaniu wątku głównego (np. brak lagów serwera w Trackmanii).\n` +
        `• **Zarządzanie stanem & Dane:** Bezpieczna komunikacja z magazynem danych (SQLite / cache w pamięci RAM / JSON) z transakcyjnością operacji.\n` +
        `• **Obsługa błędów:** Izolacja wyjątków na poziomie pojedynczych zdarzeń – ewentualny błąd gracza lub sieci nie powoduje awarii całego serwera ani klienta.\n\n` +
        `#### **Kluczowe właściwości implementacji:**\n` +
        (activeCapabilities.length > 0 ? activeCapabilities.map(c => `• **${c}:** Zoptymalizowany moduł wykonawczy\n`).join('') : `• Modułowa separacja logiki biznesowej od warstwy prezentacji HUD/Czat\n`)
      : `### ⚙️ **Architecture & Concurrency Model: \`${activeName}\`**\n\n` +
        `• **Language & Ecosystem:** \`${activeLang}\` running in \`${activeCat}\`.\n` +
        `• **Concurrency Model:** Non-blocking asynchronous event loop designed to eliminate frame drops or server lag spikes.\n` +
        `• **State & Persistence:** Thread-safe state storage (SQLite / memory caching / JSON) with atomic transaction guarantees.\n` +
        `• **Fault Tolerance:** Granular exception isolation – isolated errors do not crash the host controller or game instance.\n\n` +
        `#### **Architectural Capabilities:**\n` +
        (activeCapabilities.length > 0 ? activeCapabilities.map(c => `• **${c}:** High-throughput specialized module\n`).join('') : `• Decoupled business logic separate from HUD/Chat presentation layers\n`);

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 6. INTENT: AI Setup, Generative Models, API Keys ("ai", "klucz", "api key", "gemini", "ollama", "lm studio")
  const isAiQuery = qLower.includes('api key') 
    || qLower.includes('klucz') 
    || qLower.includes('gemini') 
    || qLower.includes('ollama') 
    || qLower.includes('lm studio') 
    || qLower.includes('deepseek') 
    || qLower.includes('llama') 
    || qLower.includes('qwen') 
    || qLower.includes('czy to ai') 
    || qLower.includes('jak dziala ai') 
    || qLower.includes('jak działa ai')
    || qLower.includes('generatywn');

  if (isAiQuery) {
    const reply = isPolish
      ? `### 🧠 **Architektura AI w Portfolio tomekdot**\n\n` +
        `Asystent posiada dwie niezależne warstwy działania:\n\n` +
        `#### **1. Autonomiczna Baza Wiedzy (Offline - Aktywna teraz):**\n` +
        `• Działa w 100% lokalnie w Twojej przeglądarce ($0, bez rejestracji, bez limitów zapytań).\n` +
        `• Przetwarza autentyczną dokumentację 70+ projektów tomekdot (Trackmania, PyPlanet, Openplanet, AI Agents).\n\n` +
        `#### **2. Generatywne Modele Neuronowe (Google Gemini & Local PC):**\n` +
        `• **Google Gemini (Chmura):** Domyślnie używa \`gemini-3.1-flash-lite\` (Domyślny), a także \`gemini-3.5-flash-lite\`, \`gemini-3.8-flash\`, \`gemini-4-hydrogen\`, \`gemini-4-argon\` i \`gemini-4-carbon\`. Pobierz darmowy klucz na [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) i wklej w panelu konfiguracji (🔑).\n` +
        `• **Ollama / LM Studio (Twój Komputer PC):** Uruchom własny model (Llama 3.2, DeepSeek R1, Qwen 2.5 Coder) pod \`http://localhost:11434\` lub \`http://localhost:1234\` bez wychodzenia do chmury.\n\n` +
        `💡 *Aby przełączyć model lub wpisać klucz, kliknij ikonę klucza (🔑) u góry.*`
      : `### 🧠 **AI Architecture in tomekdot Portfolio**\n\n` +
        `The portfolio integrates two complementary intelligence layers:\n\n` +
        `#### **1. Autonomous Knowledge Engine (Offline - Currently Active):**\n` +
        `• Runs directly in your browser ($0, zero latency, zero server logging).\n` +
        `• Pre-indexed over 70+ tomekdot repositories (Trackmania, PyPlanet, Openplanet, AI agents).\n\n` +
        `#### **2. Generative Neural LLMs (Google Gemini & Local PC):**\n` +
        `• **Google Gemini (Cloud API):** Uses \`gemini-3.1-flash-lite\` (Default), plus \`gemini-3.5-flash-lite\`, \`gemini-3.8-flash\`, \`gemini-4-hydrogen\`, \`gemini-4-argon\`, and \`gemini-4-carbon\`. Get your free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and paste it into the setup panel (🔑).\n` +
        `• **Ollama / LM Studio (Local PC):** Run offline models (Llama 3.2, DeepSeek R1, Qwen 2.5 Coder) on \`http://localhost:11434\` or \`http://localhost:1234\`.\n\n` +
        `💡 *Click the key icon (🔑) above to switch engine or save an API key.*`;

    return {
      reply,
      provider: 'SYSTEM KNOWLEDGE (AI ARCHITECTURE)',
      sourcesUsed,
    };
  }

  // 7. INTENT: Author, Creator & Background ("autor", "author", "tomekdot", "tomasz kaczak")
  const isAuthor = qLower.includes('autor') 
    || qLower.includes('author') 
    || qLower.includes('twórc') 
    || qLower.includes('tworc') 
    || qLower.includes('kto') 
    || qLower.includes('tomasz kaczak') 
    || qLower.includes('tomekdot');

  if (isAuthor) {
    const reply = isPolish
      ? `### 👨‍💻 **O Autorze: Tomasz Kaczak (@tomekdot)**\n\n` +
        `Tomasz Kaczak to inżynier oprogramowania i twórca ponad 70 projektów open-source, specjalizujący się w:\n` +
        `• **Ekosystemie Trackmania & ManiaPlanet:** Kontrolery serwerów PyPlanet (Python / asyncio), wtyczki Openplanet (AngelScript), telemetria i automatyzacja rankingów.\n` +
        `• **Autonomicznych agentach AI & DevOps:** Frameworki umiejętności agentowych (Hermes Agent), deterministyczne blueprinty i automatyzacja workflow.\n` +
        `• **Aplikacjach akademickich & badawczych:** Projekty algorytmiczne i inżynieria systemów na Katolickim Uniwersytecie Lubelskim (KUL).\n\n` +
        `🔗 Profil GitHub: [https://github.com/tomekdot](https://github.com/tomekdot)\n` +
        `🌐 Strona główna: [https://tomekdot.github.io](https://tomekdot.github.io)`
      : `### 👨‍💻 **About the Author: Tomasz Kaczak (@tomekdot)**\n\n` +
        `Tomasz Kaczak is a software engineer and author of 70+ open-source repositories specializing in:\n` +
        `• **Trackmania & ManiaPlanet Ecosystem:** PyPlanet server controllers (Python / asyncio), Openplanet plugins (AngelScript), live telemetry, and scoring hooks.\n` +
        `• **Autonomous AI Agents & DevOps:** Agent skill frameworks (Hermes Agent), deterministic blueprints, and workflow automation CLI tooling.\n` +
        `• **Academic & Systems Research:** Algorithmic systems and computer science coursework at John Paul II Catholic University of Lublin (KUL).\n\n` +
        `🔗 GitHub: [https://github.com/tomekdot](https://github.com/tomekdot)\n` +
        `🌐 Portfolio: [https://tomekdot.github.io](https://tomekdot.github.io)`;

    return {
      reply,
      provider: 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed,
    };
  }

  // 8. FALLBACK: Smart Content Search in README / Metadata
  // Search for matching paragraphs in README
  if (readme && readme.length > 50) {
    const paragraphs = readme.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 20);
    const words = qLower.split(/\s+/).filter(w => w.length > 3);
    const matchingPara = paragraphs.find(para => {
      const pLow = para.toLowerCase();
      return words.filter(w => pLow.includes(w)).length >= Math.min(words.length, 2);
    });

    if (matchingPara) {
      const reply = isPolish
        ? `### 🔍 **Wycinek Dokumentacji dla: \`${activeName}\`**\n\n` +
          `Odpowiedź znaleziona bezpośrednio w dokumentacji projektu na podstawie Twojego pytania:\n\n` +
          `> ${matchingPara.replace(/\n+/g, '\n> ')}\n\n` +
          `---\n` +
          `💡 *Potrzebujesz więcej szczegółów? Zapytaj o instalację, komendy lub architekturę tego repozytorium.*`
        : `### 🔍 **Documentation Excerpt for: \`${activeName}\`**\n\n` +
          `Relevant context extracted from project documentation matching your inquiry:\n\n` +
          `> ${matchingPara.replace(/\n+/g, '\n> ')}\n\n` +
          `---\n` +
          `💡 *Need more details? Ask about installation, commands, or architecture.*`;

      return {
        reply,
        provider: 'AUTONOMOUS KNOWLEDGE (README SYNTHESIS)',
        sourcesUsed,
      };
    }
  }

  // 9. GENERAL CONTEXTUAL SUMMARY (when question is open-ended)
  const defaultReply = isPolish
    ? `### 💡 **Asystent Projektu: \`${activeName}\`**\n\n` +
      `Odpowiadam na Twoje zapytanie w kontekście repozytorium **\`${activeName}\`** (${activeLang} • ${activeCat}):\n\n` +
      `**Podsumowanie:** ${activeLongDesc || activeDesc}\n\n` +
      `**Sugerowane pytania techniczne:**\n` +
      `• *"Co dokładnie robi ten plugin?"*\n` +
      `• *"Jak zainstalować i uruchomić ten komponent?"*\n` +
      `• *"Jakie komendy w grze są dostępne?"*\n` +
      `• *"Jak zbudowana jest asynchroniczna architektura kodu?"*\n\n` +
      `---\n` +
      `💡 *Tryb Bazy Wiedzy: Odpowiedź wygenerowana offline. Aby podłączyć generatywny model LLM (Google Gemini / Ollama / LM Studio), kliknij ikonę klucza (🔑) u góry.*`
    : `### 💡 **Project Assistant: \`${activeName}\`**\n\n` +
      `Answering in the context of repository **\`${activeName}\`** (${activeLang} • ${activeCat}):\n\n` +
      `**Summary:** ${activeLongDesc || activeDesc}\n\n` +
      `**Suggested Technical Questions:**\n` +
      `• *"What exactly does this plugin do?"*\n` +
      `• *"How do I install and configure it?"*\n` +
      `• *"What in-game commands are available?"*\n` +
      `• *"How does the async concurrency model work?"*\n\n` +
      `---\n` +
      `💡 *Knowledge Base Mode: Offline reply. To query a live generative LLM (Google Gemini / Ollama / LM Studio), click the key icon (🔑) above.*`;

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
  const { query, repoName = '', repoDesc = '', repoLang = '', readme = '', category = '', repos = REPOS, lang = 'en', signal } = options;
  const customApiKey = getLocalAIKey();
  const customProvider = getLocalAIProvider();
  const customBaseUrl = getLocalAIBaseUrl();
  const rawModel = getLocalAIModel();
  const maxOutputTokens = getMaxOutputTokens();

  // Check if user-configured session token quota limit is exhausted
  if (isSessionQuotaExhausted()) {
    const limit = getSessionTokenLimit();
    const used = getSessionTokensUsed();
    const offline = generateIntelligentOfflineReply({ query, repoName, repoDesc, repoLang, readme, category, repos, lang });
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
          repoName,
          description: repoDesc,
          lang: repoLang,
          readme,
          userMessage: query,
          category,
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
          sourcesUsed: data.sourcesUsed || [repoName || 'Repository', 'Server AI Proxy'],
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
        const offline = generateIntelligentOfflineReply({ query, repoName, repoDesc, repoLang, readme, category, repos, lang });
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
        const offline = generateIntelligentOfflineReply({ query, repoName, repoDesc, repoLang, readme, category, repos, lang });
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

  // Fallback to local structured data (only when offline/quota exhausted)
  const summary = lang === 'en' ? (repo.longDescEn || repo.desc) : (repo.longDescPl || repo.descPl || repo.desc);
  const keyFeatures = (lang === 'en' ? repo.featuresEn : repo.featuresPl) || repo.featuresPl || repo.featuresEn || [];
  const technicalHighlights = repo.capabilities && repo.capabilities.length > 0
    ? `${lang === 'en' ? 'Core Capabilities & Stack:' : 'Kluczowe technologie i biblioteki:'} ${repo.capabilities.join(' • ')}`
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
    const post = BLOG_POSTS.find(p =>
      (options.postId && p.id === options.postId) ||
      p.titleEn.toLowerCase() === postTitle.toLowerCase() ||
      p.titlePl.toLowerCase() === postTitle.toLowerCase()
    ) || BLOG_POSTS[0];

    const isEn = lang === 'en';
    const title = isEn ? post.titleEn : post.titlePl;
    const excerpt = isEn ? post.excerptEn : post.excerptPl;
    const draft = isEn ? (post.draftVersionContentEn || post.draftVersionContent || '') : (post.draftVersionContentPl || post.draftVersionContent || '');
    const full = isEn ? post.contentEn : post.contentPl;
    const note = isEn ? (post.aiVersionNoteEn || post.aiVersionNote || '') : (post.aiVersionNotePl || post.aiVersionNote || '');

    const qLower = query.toLowerCase();
    const isCompareOrAdded = /(v1|v2|raw|diff|porówn|dopis|dodan|szkic|zmian)/i.test(qLower);
    const isDebateOrCritique = /(zgadz|polemi|disagree|agree|popraw|critiq|ryzyk|błąd|uwag|wątpliw|dysku)/i.test(qLower);

    let body = '';
    if (isCompareOrAdded) {
      const draftLines = draft.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));
      const headings = full.split('\n').filter(l => l.trim().startsWith('###')).map(h => h.replace(/^#+\s*/, '').trim());
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
      body = isEn
        ? `📝 **${title}**\n\n${excerpt}\n\n• **Tags:** ${post.tags.map(t => `#${t}`).join(', ')}\n• **Synthesis notes:** ${note || 'Archival dev journal synthesis.'}`
        : `📝 **${title}**\n\n${excerpt}\n\n• **Tagi:** ${post.tags.map(t => `#${t}`).join(', ')}\n• **Notatki syntezy:** ${note || 'Syntetyczny dziennik deweloperski.'}`;
    }

    return {
      reply: prefixNotice + body,
      provider: prefixNotice ? 'AUTONOMOUS KNOWLEDGE (OFFLINE • QUOTA/LIMIT)' : 'AUTONOMOUS KNOWLEDGE (OFFLINE)',
      sourcesUsed: [post.titleEn, 'data.ts (v1.0 + v2.0)'],
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
