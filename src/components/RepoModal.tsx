/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'motion/react';
import { 
  X, 
  Star, 
  ExternalLink, 
  Code, 
  FileText, 
  Copy, 
  Check, 
  Lock, 
  GitFork,
  Sparkles, 
  Bot, 
  Send, 
  Terminal, 
  RefreshCw, 
  Edit3, 
  Save, 
  CornerDownRight,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CheckCircle,
  CheckCircle2,
  Info,
  BookOpen,
  Database,
  Cpu,
  Layers,
  AlertTriangle,
  Camera,
  Square,
  Calendar,
  Boxes,
  Minus,
  FolderGit2,
  Minimize2
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Repository } from '../types';
import { CATEGORIES, LANG_COLORS } from '../data';
import RepoArchitectureUml, { renderInlineMarkdown } from './RepoArchitectureUml';
import MarqueeText from './MarqueeText';
import { 
  detectAIProvider, 
  getLocalAIKey, 
  setLocalAIKey, 
  clearLocalAIKey, 
  getLocalAIModel, 
  getLocalAIProvider,
  getLocalAIBaseUrl,
  PROVIDERS_CONFIG, 
  AIProviderId,
  AIProviderInfo 
} from '../lib/apiKeyStorage';
import { 
  handleClientSideAiFallback, 
  generateClientSideSummary, 
  HAS_BACKEND 
} from '../lib/clientAi';

import AnimatedNumber from './AnimatedNumber';

const LANG_ACRONYMS: Record<string, string> = {
  'JavaScript': 'JS',
  'TypeScript': 'TS',
  'Python': 'PY',
  'AngelScript': 'AS',
  'C++': 'C++',
  'C#': 'C#',
  'Shell': 'SH',
  'Bash': 'SH',
  'HTML': 'HTML',
  'CSS': 'CSS',
  'PHP': 'PHP',
  'Rust': 'RS',
  'Go': 'GO',
  'Ruby': 'RB',
  'Java': 'JAVA',
  'Kotlin': 'KT',
  'Swift': 'SWIFT',
  'Dart': 'DART',
  'Dockerfile': 'DOCKER',
};

function getShortLang(lang?: string): string {
  if (!lang) return '';
  return LANG_ACRONYMS[lang] || lang;
}

interface RepoModalProps {
  repo: Repository | null;
  onClose: () => void;
  lang: 'en' | 'pl';
  onUpdateRepo?: (updatedRepo: Repository) => void;
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
}

interface ReadmeImageProps {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
  repo: Repository | null;
  lang: 'en' | 'pl';
  [key: string]: any;
}

const InAnchorContext = React.createContext<boolean>(false);

function ReadmeImageRenderer({ src, alt, width, height, repo, lang, ...props }: ReadmeImageProps) {
  const isInAnchor = React.useContext(InAnchorContext);
  const [hasError, setHasError] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const match = repo?.url?.match(/github\.com\/([^/]+)\/([^/]+)/);
  const owner = match ? match[1] : (repo?.forkParent ? repo.forkParent.split('/')[0] : 'tomekdot');
  const actualName = match ? match[2] : (repo?.forkParent ? repo.forkParent.split('/')[1] : repo?.name || '');

  // Calculate candidate source URLs across branches and forks
  const candidateUrls = React.useMemo(() => {
    if (!src) return [];
    
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return [src];
    }

    const cleanPath = src.replace(/^\.?\/+/, '');

    if (src.startsWith('http://') || src.startsWith('https://')) {
      if (src.includes('github.com') && src.includes('/blob/')) {
        const rawGithub = src.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        return [rawGithub, src];
      }
      return [src];
    }

    const list: string[] = [
      `https://raw.githubusercontent.com/${owner}/${actualName}/main/${cleanPath}`,
      `https://raw.githubusercontent.com/${owner}/${actualName}/master/${cleanPath}`,
      `https://raw.githubusercontent.com/${owner}/${actualName}/dev/${cleanPath}`,
      `https://raw.githubusercontent.com/${owner}/${actualName}/develop/${cleanPath}`,
      `https://raw.githubusercontent.com/${owner}/${actualName}/HEAD/${cleanPath}`,
    ];

    if (owner !== 'tomekdot') {
      list.push(`https://raw.githubusercontent.com/tomekdot/${actualName}/main/${cleanPath}`);
      list.push(`https://raw.githubusercontent.com/tomekdot/${actualName}/master/${cleanPath}`);
    }

    if (repo?.forkParent) {
      const parts = repo.forkParent.split('/');
      if (parts.length === 2) {
        list.push(`https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/main/${cleanPath}`);
        list.push(`https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/master/${cleanPath}`);
      }
    }

    return list;
  }, [src, owner, actualName, repo?.forkParent]);

  // Compute direct GitHub web link to view the image
  const githubFileUrl = React.useMemo(() => {
    if (!src) return repo?.url || '#';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    const cleanPath = src.replace(/^\.?\/+/, '');
    return `https://github.com/${owner}/${actualName}/blob/main/${cleanPath}`;
  }, [src, owner, actualName, repo?.url]);

  const currentSrc = candidateUrls[candidateIndex] || src || '';

  const handleImgError = () => {
    if (candidateIndex + 1 < candidateUrls.length) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setHasError(true);
    }
  };

  if (!src) return null;

  // Render a clean fallback banner if the image cannot be loaded from remote
  if (hasError) {
    const cleanPath = src.replace(/^\.?\/+/, '');
    const isBadge = src.includes('img.shields.io') || src.includes('badge') || (width && Number(width) < 100);
    
    if (isBadge) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 bg-neutral-900 border border-editorial-border text-[10px] font-mono text-editorial-muted">
          <span>🏷️ {alt || cleanPath}</span>
        </span>
      );
    }

    if (isInAnchor) {
      return (
        <span className="my-2 p-2 border border-dashed border-editorial-border bg-neutral-950/80 inline-flex items-center gap-2 text-xs font-mono text-editorial-muted">
          <span>📸 {alt || cleanPath}</span>
        </span>
      );
    }

    return (
      <span className="my-3 p-3.5 border border-dashed border-editorial-border bg-neutral-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono w-full">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 bg-neutral-900 border border-editorial-border text-editorial-accent shrink-0 flex items-center justify-center">
            <Camera size={16} />
          </span>
          <span className="truncate block">
            <span className="text-white font-bold flex items-center gap-1.5">
              <span>📸 {alt || (lang === 'pl' ? 'Zrzut ekranu / Grafika z repozytorium' : 'Repository Screenshot / Image')}</span>
            </span>
            <span className="text-[11px] text-editorial-muted truncate font-mono block">
              {cleanPath}
            </span>
          </span>
        </span>
        <a
          href={githubFileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent text-[11px] font-mono transition-colors shrink-0 whitespace-nowrap"
        >
          <span>{lang === 'pl' ? 'Otwórz grafikę w GitHub' : 'View on GitHub'}</span>
          <ExternalLink size={12} />
        </a>
      </span>
    );
  }

  const imgElement = (
    <img
      src={currentSrc}
      alt={alt || ''}
      width={width}
      height={height}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="max-w-full h-auto inline-block border border-editorial-border/40 group-hover:border-editorial-accent transition-colors align-middle"
      onError={handleImgError}
      {...props}
    />
  );

  return (
    <span className="my-1.5 inline-block max-w-full align-middle">
      {isInAnchor ? (
        imgElement
      ) : (
        <a 
          href={githubFileUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          title={lang === 'pl' ? 'Kliknij, aby otworzyć w GitHub' : 'Click to open in GitHub'}
          className="group inline-block relative cursor-pointer"
        >
          {imgElement}
        </a>
      )}
      {alt && !['', 'Documentation', 'License', 'License: MIT', 'Discord', 'Hermes Agent'].includes(alt.trim()) && !alt.startsWith('http') && (
        <span className="block text-[10px] font-mono text-editorial-muted mt-1 text-center">
          {alt}
        </span>
      )}
    </span>
  );
}

interface ReadmeCodeBlockProps {
  children: any;
  lang: 'en' | 'pl';
}

function ReadmeCodeBlock({ children, lang }: ReadmeCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  // Na telefonie domyślnie włączone zawijanie, żeby nic nie wychodziło poza ramkę
  const [isWrapped, setIsWrapped] = useState(false);

  const extractText = (node: any): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node?.props?.children) return extractText(node.props.children);
    return '';
  };

  const rawCode = extractText(children);

  const handleCopy = () => {
    if (!rawCode) return;
    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="my-3 w-full max-w-full min-w-0 border border-editorial-border bg-neutral-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900/95 border-b border-editorial-border/60 text-[9.5px] font-mono text-editorial-muted select-none">
        <span className="uppercase tracking-wider font-semibold text-emerald-400 flex items-center gap-1.5 shrink-0">
          <Code size={11} className="text-emerald-400 shrink-0" />
          <span>CODE / STRUCTURE</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsWrapped(prev => !prev)}
            className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
              isWrapped
                ? 'bg-editorial-accent/20 border-editorial-accent text-editorial-accent font-bold'
                : 'border-editorial-border hover:border-neutral-500 text-neutral-400 hover:text-white'
            }`}
          >
            {isWrapped ? (lang === 'en' ? 'Wrap: On' : 'Zawijanie: Wł') : (lang === 'en' ? 'Wrap' : 'Zawijaj')}
          </button>
          {rawCode && (
            <button
              type="button"
              onClick={handleCopy}
              className="px-1.5 py-0.5 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white text-[9px] uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check size={10} className="text-emerald-400" />
                  <span className="text-emerald-400 font-bold">{lang === 'en' ? 'Copied' : 'Skopiowano'}</span>
                </>
              ) : (
                <>
                  <Copy size={10} />
                  <span>{lang === 'en' ? 'Copy' : 'Kopiuj'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Padding na zewnętrznym wrapperze, nie na pre: wtedy tekst ma margines z obu stron */}
      <div className="px-4 py-3.5 min-w-0 w-full">
        <pre
          className={`m-0 font-mono text-xs text-emerald-400 leading-relaxed select-text min-w-0 max-w-full ${
            isWrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-x-auto'
          }`}
        >
          <code translate="no" className="notranslate">
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
}

const getRepoName = (repo: Repository) => {
  if (repo.url) {
    const parts = repo.url.split('/');
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return repo.name;
};

// Extremely responsive fetch with abort controllers
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function sanitizeReadmeMarkdown(raw: string | null): string {
  if (!raw) return '';
  // Strip HTML comments (including multi-dash variants like <!---, <!--, <!---- etc.)
  let cleaned = raw.replace(/<!--+[\s\S]*?--+>/g, '');
  // Strip unclosed comment markers if any
  cleaned = cleaned.replace(/<!--+[\s\S]*$/g, '');
  // Normalize excessive intra-line whitespace before comments (e.g. in file trees with 15+ spaces)
  cleaned = cleaned.replace(/([^\n#]+)[ \t]{4,}(#.*)/g, '$1  $2');
  // Normalize triple+ newlines to double newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

export default function RepoModal({ 
  repo: inputRepo, 
  onClose, 
  lang, 
  onUpdateRepo,
  isMinimized = false,
  onMinimize,
  onRestore
}: RepoModalProps) {
  const lastRepoRef = useRef<Repository | null>(null);
  if (inputRepo) lastRepoRef.current = inputRepo;
  const repo = inputRepo ?? lastRepoRef.current;
  const isOpen = Boolean(inputRepo);

  const [activeTab, setActiveTab] = useState<'info' | 'code' | 'ai'>('info');
  const dragControls = useDragControls();

  // Mobile stat tiles collapse toggle
  const [showStats, setShowStats] = useState(true);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    dragControls.start(e);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 45 || info.velocity.y > 500) {
      onMinimize?.();
    }
  };

  // Dynamic README
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [isLoadingReadme, setIsLoadingReadme] = useState(false);
  const [isShortTitleExpanded, setIsShortTitleExpanded] = useState(false);
  
  // Local API Key & Universal Model Configuration State
  const [localApiKey, setLocalApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<AIProviderId>('unknown');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isCustomModelMode, setIsCustomModelMode] = useState<boolean>(false);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [showKeySecret, setShowKeySecret] = useState<boolean>(false);
  const [sessionOnlyKey, setSessionOnlyKey] = useState<boolean>(false);
  const [keyStatusFeedback, setKeyStatusFeedback] = useState<string | null>(null);
  const [serverConfigStatus, setServerConfigStatus] = useState<{ hasServerKey: boolean; supportedProviders?: string[]; serverDefault?: string } | null>(null);

  // Derived active and detected provider metadata
  const detectedFromInput = React.useMemo(() => detectAIProvider(apiKeyInput), [apiKeyInput]);
  const detectedFromSaved = React.useMemo(() => detectAIProvider(localApiKey), [localApiKey]);

  const effectiveProviderInfo: AIProviderInfo = React.useMemo(() => {
    if (selectedProviderId && selectedProviderId !== 'unknown' && PROVIDERS_CONFIG[selectedProviderId]) {
      return PROVIDERS_CONFIG[selectedProviderId];
    }
    if (apiKeyInput.trim()) {
      return detectedFromInput;
    }
    if (localApiKey.trim()) {
      return detectedFromSaved;
    }
    return PROVIDERS_CONFIG.unknown;
  }, [selectedProviderId, apiKeyInput, localApiKey, detectedFromInput, detectedFromSaved]);

  const savedProvider = React.useMemo(() => {
    const savedId = getLocalAIProvider();
    if (savedId && savedId !== 'unknown' && PROVIDERS_CONFIG[savedId]) {
      return PROVIDERS_CONFIG[savedId];
    }
    return detectAIProvider(localApiKey);
  }, [localApiKey]);

  const activeModel = (isCustomModelMode && customModelInput.trim()) 
    ? customModelInput.trim() 
    : (selectedModel || effectiveProviderInfo.defaultModel);

  // AI Summary State
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryStatusMessage, setSummaryStatusMessage] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [customDescPl, setCustomDescPl] = useState('');
  const [customDescEn, setCustomDescEn] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [techHighlights, setTechHighlights] = useState<string>('');

  // AI Chat Terminal State
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant' | 'system';
    text: string;
    time: string;
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showContextInspector, setShowContextInspector] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);

  // Stop Chat AI Generation
  const handleStopChatAi = () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
    }
    setIsChatLoading(false);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        text: lang === 'en' ? '⏹️ _[AI response stopped by user]_' : '⏹️ _[Odpowiedź AI zatrzymana przez użytkownika]_',
        time: timeStr
      }
    ]);
  };
  
  const currentRepoName = repo ? getRepoName(repo) : '';
  const prevRepoNameRef = useRef<string>('');

  const sanitizedReadme = React.useMemo(() => {
    return sanitizeReadmeMarkdown(readmeContent);
  }, [readmeContent]);

  // Load local API key and server status
  useEffect(() => {
    const key = getLocalAIKey();
    const model = getLocalAIModel();
    const prov = getLocalAIProvider();
    const baseUrl = getLocalAIBaseUrl();
    
    setLocalApiKey(key);
    setApiKeyInput(key);
    if (prov && prov !== 'unknown') {
      setSelectedProviderId(prov);
    }
    if (baseUrl) {
      setCustomBaseUrl(baseUrl);
    }
    if (model) {
      setSelectedModel(model);
      const isKnown = prov && PROVIDERS_CONFIG[prov]?.availableModels.some(m => m.id === model);
      if (!isKnown && model) {
        setIsCustomModelMode(true);
        setCustomModelInput(model);
      }
    }

    if (HAS_BACKEND) {
      fetch('/api/ai/config-status')
        .then(res => res.json())
        .then(data => setServerConfigStatus(data))
        .catch(() => {});
    }
  }, []);

  // Update selected model when detected provider changes if input is modified and no explicit selection was made
  useEffect(() => {
    if (apiKeyInput && selectedProviderId === 'unknown') {
      const detected = detectAIProvider(apiKeyInput);
      if (detected.id !== 'unknown') {
        setSelectedProviderId(detected.id);
        if (!selectedModel) {
          setSelectedModel(detected.defaultModel);
        }
      }
    }
  }, [apiKeyInput, selectedProviderId, selectedModel]);

  // Ensure active tab is valid for private repositories
  useEffect(() => {
    if (repo?.isPrivate && activeTab === 'code') {
      setActiveTab('info');
    }
  }, [repo?.isPrivate, activeTab]);

  // Sync descriptions and AI chat welcome when repo changes
  useEffect(() => {
    if (repo) {
      setIsShortTitleExpanded(false);
      setCustomDescPl(repo.longDescPl || repo.descPl || repo.desc || '');
      setCustomDescEn(repo.longDescEn || repo.desc || '');
      setSummaryError(null);
      setSummaryStatusMessage(null);
      setKeyFeatures([]);
      setTechHighlights('');

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages([
        {
          role: 'system',
          text: lang === 'en'
            ? `⚡ **TOMEKDOT REPO TERMINAL AI** // Context: \`${repo.name}\` (${repo.lang || 'Code'})\n\nGoogle Gemini & Local PC Assistant ready (Google AI Studio / Ollama / LM Studio). Click any quick prompt below or ask about how this plugin works, installation, commands, or architecture!`
            : `⚡ **TERMINAL ASYSTENTA AI TOMEKDOT** // Kontekst: \`${repo.name}\` (${repo.lang || 'Kod'})\n\nAsystent Google Gemini i Silników Lokalnych gotowy (Google AI Studio / Ollama / LM Studio). Wybierz szybkie pytanie poniżej lub zapytaj o działanie pluginu, instalację, konfigurację i architekturę!`,
          time: timeStr,
        }
      ]);
    }
  }, [repo?.name, lang]);

  // Scroll chat to bottom (only inside chat messages container, avoiding parent modal shifts)
  useEffect(() => {
    if (activeTab === 'ai' && chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [chatMessages, activeTab, isChatLoading]);

  // Ensure modal body stays properly at top on tab changes
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Save / Clear local API Key and model configuration
  const handleSaveApiKey = () => {
    const trimmedKey = apiKeyInput.trim();
    const provider = selectedProviderId !== 'unknown' ? selectedProviderId : detectAIProvider(trimmedKey).id;
    const providerConfig = PROVIDERS_CONFIG[provider] || PROVIDERS_CONFIG.unknown;
    const isLocalOrCustom = provider === 'ollama' || provider === 'lmstudio' || provider === 'custom' || providerConfig.requiresKey === false;

    if (!trimmedKey && !isLocalOrCustom) {
      clearLocalAIKey();
      setLocalApiKey('');
      setSelectedModel('');
      setCustomBaseUrl('');
      setSelectedProviderId('unknown');
      setKeyStatusFeedback(lang === 'en' ? 'Custom API key removed.' : 'Usunięto klucz API.');
    } else {
      const modelToSave = (isCustomModelMode && customModelInput.trim()) 
        ? customModelInput.trim() 
        : (selectedModel || providerConfig.defaultModel);
      const effectiveBaseUrl = customBaseUrl.trim() || providerConfig.defaultBaseUrl || '';

      setLocalAIKey(trimmedKey, sessionOnlyKey, modelToSave, provider, effectiveBaseUrl);
      setLocalApiKey(trimmedKey);
      setSelectedModel(modelToSave);
      setSelectedProviderId(provider);

      setKeyStatusFeedback(
        lang === 'en'
          ? `✅ Saved ${providerConfig.name} configuration (${modelToSave}) locally in browser!`
          : `✅ Zapisano konfigurację ${providerConfig.name} (${modelToSave}) lokalnie w przeglądarce!`
      );
    }
    setTimeout(() => setKeyStatusFeedback(null), 4500);
  };

  const handleClearApiKey = () => {
    clearLocalAIKey();
    setLocalApiKey('');
    setApiKeyInput('');
    setSelectedModel('');
    setCustomModelInput('');
    setCustomBaseUrl('');
    setIsCustomModelMode(false);
    setSelectedProviderId('unknown');
    setKeyStatusFeedback(lang === 'en' ? '🗑️ AI configuration cleared from browser storage.' : '🗑️ Konfiguracja AI została usunięta z pamięci przeglądarki.');
    setTimeout(() => setKeyStatusFeedback(null), 4000);
  };

  // Generate Archival Summary directly inside AI Terminal
  const handleGenerateArchivalSummaryInChat = async () => {
    if (!repo || isChatLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      { 
        role: 'user', 
        text: lang === 'en' ? '✨ Generate comprehensive archival summary and technical breakdown' : '✨ Wygeneruj pełny opis archiwalny i zestawienie funkcji', 
        time: timeStr 
      }
    ]);
    setIsChatLoading(true);

    const activeKey = getLocalAIKey();
    const activeBaseUrl = getLocalAIBaseUrl() || customBaseUrl;
    const activeProvider = getLocalAIProvider() || effectiveProviderInfo.id;
    const activeModelToUse = (isCustomModelMode && customModelInput.trim()) ? customModelInput.trim() : (getLocalAIModel() || activeModel);

    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    const runClientSummaryFallback = async () => {
      try {
        const clientSummary = await generateClientSideSummary({
          repo,
          lang,
          readme: sanitizedReadme,
          signal: controller.signal
        });
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        let fullMarkdown = `### 📋 **${lang === 'en' ? 'Archival Summary' : 'Szczegółowy Opis Archiwalny'}**\n\n${clientSummary.summary}\n\n`;
        
        if (clientSummary.keyFeatures && clientSummary.keyFeatures.length > 0) {
          fullMarkdown += `#### ⚡ **${lang === 'en' ? 'Key Features & Capabilities:' : 'Kluczowe Funkcje i Możliwości:'}**\n` + 
            clientSummary.keyFeatures.map((f: string) => `- ${f}`).join('\n') + '\n\n';
        }

        if (clientSummary.technicalHighlights) {
          fullMarkdown += `#### ⚙️ **${lang === 'en' ? 'Technical Highlights:' : 'Aspekty Techniczne:'}**\n${clientSummary.technicalHighlights}\n`;
        }

        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: fullMarkdown, time: replyTime },
        ]);

        if (onUpdateRepo) {
          onUpdateRepo({
            ...repo,
            longDescPl: lang === 'pl' ? clientSummary.summary : repo.longDescPl,
            longDescEn: lang === 'en' ? clientSummary.summary : repo.longDescEn,
          });
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            text: `> ⚠️ **BŁĄD GENEROWANIA OPISU:** ${err.message || 'Nie udało się połączyć z modelem AI.'}\n\n*Wskazówka: Możesz dodać własny klucz Google Gemini w zakładce u góry (🔑 Konfiguracja AI).*`, 
            time: replyTime 
          },
        ]);
      }
    };

    if (!HAS_BACKEND) {
      await runClientSummaryFallback();
      setIsChatLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          'x-ai-api-key': activeKey,
          'x-gemini-api-key': activeKey,
          'x-ai-base-url': activeBaseUrl || '',
          'x-ai-provider': activeProvider || '',
          'x-ai-model': activeModelToUse || '',
        },
        body: JSON.stringify({
          repoName: repo.name,
          description: repo.desc || repo.descPl,
          lang: repo.lang,
          readme: sanitizedReadme || '',
          isPrivate: repo.isPrivate,
          category: repo.cat?.join(', '),
          customApiKey: activeKey,
          customModel: activeModelToUse,
          customBaseUrl: activeBaseUrl,
          customProvider: activeProvider,
          siteLang: lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.success) {
        const summaryText = lang === 'en' ? (data.summaryEn || data.summaryPl) : (data.summaryPl || data.summaryEn);
        let fullMarkdown = `### 📋 **${lang === 'en' ? 'Archival Summary' : 'Szczegółowy Opis Archiwalny'}**\n\n${summaryText}\n\n`;
        
        if (data.keyFeatures && data.keyFeatures.length > 0) {
          fullMarkdown += `#### ⚡ **${lang === 'en' ? 'Key Features & Capabilities:' : 'Kluczowe Funkcje i Możliwości:'}**\n` + 
            data.keyFeatures.map((f: string) => `- ${f}`).join('\n') + '\n\n';
        }

        if (data.technicalHighlights) {
          fullMarkdown += `#### ⚙️ **${lang === 'en' ? 'Technical Highlights:' : 'Aspekty Techniczne:'}**\n${data.technicalHighlights}\n`;
        }

        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: fullMarkdown, time: replyTime },
        ]);

        if (onUpdateRepo) {
          onUpdateRepo({
            ...repo,
            longDescPl: data.summaryPl || repo.longDescPl,
            longDescEn: data.summaryEn || repo.longDescEn,
          });
        }
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      await runClientSummaryFallback();
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleShowApiKeyGuideInChat = () => {
    setShowApiKeyConfig(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const guideMsg = lang === 'en'
      ? `### 🔑 **Quick Guide: How to Get a Free Google Gemini API Key**\n\nGoogle provides free API keys for developers to access Gemini 2.5 Flash and Gemini Pro models:\n\n1. **Open Google AI Studio**: Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n2. **Sign In**: Log in using your Google / Gmail account.\n3. **Create Key**: Click the blue **"Create API key"** button and select a project.\n4. **Copy Key**: Copy your generated key (starts with \`AIzaSy...\`).\n5. **Paste & Save**: Paste your key into the **"API Key"** field in the setup box above, then click **"Save Locally"**.\n\n---\n💡 **Local PC Models (100% Offline / No Key Needed)**\nIf you prefer running models locally without cloud accounts, switch the engine above to **"Local PC / Server"** and point to your local Ollama or LM Studio endpoint (\`http://localhost:11434/v1\`).`
      : `### 🔑 **Szybki Przewodnik: Jak bezpłatnie uzyskać klucz API Google Gemini**\n\nGoogle udostępnia bezpłatne klucze API dla deweloperów z dostępem do modeli Gemini 2.5 Flash i Gemini Pro:\n\n1. **Otwórz Google AI Studio**: Wejdź na [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n2. **Zaloguj się**: Użyj swojego konta Google / Gmail.\n3. **Utwórz klucz**: Kliknij niebieski przycisk **"Create API key"** i wybierz projekt.\n4. **Skopiuj klucz**: Skopiuj wygenerowany klucz (zaczyna się od \`AIzaSy...\`).\n5. **Wklej i zapisz**: Wklej klucz w pole **"Klucz API"** w panelu powyżej i kliknij **"Zapisz Lokalnie"**.\n\n---\n💡 **Lokalne Modele PC (100% Offline / Bez Klucza)**\nMożesz też przełączyć silnik powyżej na **"Lokalny PC (Ollama / LM Studio)"** i połączyć się z lokalną instancją (\`http://localhost:11434/v1\`) bez potrzeby posiadania żadnego klucza chmurowego.`;

    setChatMessages(prev => [
      ...prev,
      { role: 'user' as const, text: lang === 'en' ? '🔑 API Key Guide' : '🔑 Instrukcja klucza API', time: timeStr },
      { role: 'assistant' as const, text: guideMsg, time: timeStr },
    ]);
  };

  // Chat message submission
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || !repo || isChatLoading) return;

    if (textToSend.includes('✨ Wygeneruj pełny opis') || textToSend.includes('✨ Generate comprehensive archival')) {
      handleGenerateArchivalSummaryInChat();
      return;
    }

    const lower = textToSend.toLowerCase();
    if (lower.includes('api key') || lower.includes('klucz') || lower.includes('guide') || lower.includes('instrukcj') || lower.includes('jak zdobyć') || lower.includes('how to get')) {
      handleShowApiKeyGuideInChat();
      if (!presetText) setChatInput('');
      return;
    }

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user' as const, text: textToSend, time: timeStr };
    setChatMessages(prev => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsChatLoading(true);

    const activeKey = getLocalAIKey();
    const activeBaseUrl = getLocalAIBaseUrl() || customBaseUrl;
    const activeProvider = getLocalAIProvider() || effectiveProviderInfo.id;
    const activeModelToUse = (isCustomModelMode && customModelInput.trim()) ? customModelInput.trim() : (getLocalAIModel() || activeModel);

    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    const runChatFallback = async () => {
      try {
        const fallback = await handleClientSideAiFallback({
          query: textToSend,
          repoName: repo.name,
          repoDesc: repo.desc || repo.descPl,
          repoLang: repo.lang,
          readme: sanitizedReadme,
          category: repo.cat?.join(', '),
          lang,
          signal: controller.signal
        });
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: fallback.reply, time: replyTime },
        ]);
      } catch (clientErr: any) {
        if (clientErr.name === 'AbortError') return;
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: lang === 'en'
              ? `> ⚠️ **ERROR:** ${clientErr.message || 'Could not retrieve response from AI assistant.'}`
              : `> ⚠️ **BŁĄD:** ${clientErr.message || 'Nie udało się uzyskać odpowiedzi od modelu AI.'}`,
            time: replyTime
          }
        ]);
      }
    };

    if (!HAS_BACKEND) {
      await runChatFallback();
      chatAbortControllerRef.current = null;
      setIsChatLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/chat-repo', {
        method: 'POST',
        signal: controller.signal,
        headers: { 
          'Content-Type': 'application/json',
          'x-ai-api-key': activeKey,
          'x-gemini-api-key': activeKey,
          'x-ai-base-url': activeBaseUrl || '',
          'x-ai-provider': activeProvider || '',
          'x-ai-model': activeModelToUse || '',
        },
        body: JSON.stringify({
          repoName: repo.name,
          description: repo.desc || repo.descPl,
          lang: repo.lang,
          readme: sanitizedReadme || '',
          userMessage: textToSend,
          category: repo.cat?.join(', '),
          customApiKey: activeKey,
          customModel: activeModelToUse,
          customBaseUrl: activeBaseUrl,
          customProvider: activeProvider,
          siteLang: lang,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: data.reply || (lang === 'en' ? 'No output generated.' : 'Brak odpowiedzi.'), time: replyTime },
      ]);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        chatAbortControllerRef.current = null;
        return;
      }
      // On backend error (e.g. 404 or network error), fallback seamlessly to client-side AI!
      await runChatFallback();
    } finally {
      chatAbortControllerRef.current = null;
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (!repo || !currentRepoName) {
      prevRepoNameRef.current = '';
      return;
    }
    
    let active = true;
    
    // Only reset tab and clear content if user opened a DIFFERENT repository!
    if (prevRepoNameRef.current !== currentRepoName) {
      prevRepoNameRef.current = currentRepoName;
      setActiveTab('info');
      
      const cacheKey = `github_readme_cache_${currentRepoName}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setReadmeContent(cached);
      } else {
        setReadmeContent(null);
      }
    }

    async function fetchReadme() {
      const repoName = currentRepoName;
      if (!active) return;
      
      const cacheKey = `github_readme_cache_${repoName}`;
      const cached = localStorage.getItem(cacheKey);

      const isValidReadme = (text: string | null): boolean => {
        if (!text) return false;
        const trimmed = text.trim();
        const lower = trimmed.toLowerCase();
        
        // Match full HTML error pages or full documents (ignore inline <div>/<p> styling inside markdown summaries)
        if (
          lower.startsWith('<!doctype html') || 
          lower.startsWith('<html') || 
          lower.includes('</head>') || 
          lower.includes('</body>') ||
          lower.includes('<body ') ||
          lower.includes('<head ') ||
          lower.includes('window._shareddata') ||
          lower.includes('<title>page not found') ||
          lower.includes('<title>rate limit') ||
          lower.includes('href="https://assets-cdn.github.com/')
        ) {
          return false;
        }
        
        // Filter out JSON error payloads
        if (trimmed.startsWith('{') && trimmed.includes('"message"')) {
          return false;
        }
        
        // Filter plain text errors
        if (trimmed === '404: Not Found' || trimmed === 'Not Found' || lower === 'not found') {
          return false;
        }
        
        return true;
      };

      if (cached && isValidReadme(cached) && active) {
        setReadmeContent(cached);
        setIsLoadingReadme(false);
        return;
      } else if (cached && !isValidReadme(cached)) {
        localStorage.removeItem(cacheKey);
      }

      setIsLoadingReadme(true);
      
      try {
        const match = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
        const owner = match ? match[1] : 'tomekdot';
        const actualName = match ? match[2] : repoName;

        const candidateRepos: Array<{ owner: string; name: string }> = [
          { owner, name: actualName }
        ];

        if (owner !== 'tomekdot') {
          candidateRepos.push({ owner: 'tomekdot', name: repoName });
        }

        if (repo.forkParent) {
          const forkParts = repo.forkParent.split('/');
          if (forkParts.length === 2) {
            candidateRepos.push({ owner: forkParts[0], name: forkParts[1] });
          }
        }

        const rawUrls: string[] = [];
        for (const candidate of candidateRepos) {
          rawUrls.push(`https://raw.githubusercontent.com/${candidate.owner}/${candidate.name}/main/README.md`);
          rawUrls.push(`https://raw.githubusercontent.com/${candidate.owner}/${candidate.name}/main/readme.md`);
          rawUrls.push(`https://raw.githubusercontent.com/${candidate.owner}/${candidate.name}/master/README.md`);
          rawUrls.push(`https://raw.githubusercontent.com/${candidate.owner}/${candidate.name}/master/readme.md`);
        }

        let loaded = false;
        for (const url of rawUrls) {
          try {
            const rawResponse = await fetchWithTimeout(url, {}, 3000);
            if (rawResponse.ok && active) {
              const rawText = await rawResponse.text();
              if (isValidReadme(rawText)) {
                setReadmeContent(rawText);
                localStorage.setItem(cacheKey, rawText);
                loaded = true;
                break;
              }
            }
          } catch (e) {
            // Ignore individual fetch errors and try next pattern coordinate
          }
        }

        if (loaded) return;

        // Fallback to official GitHub API if raw files failed / check candidates
        for (const candidate of candidateRepos) {
          try {
            const response = await fetchWithTimeout(`https://api.github.com/repos/${candidate.owner}/${candidate.name}/readme`, {
              headers: {
                'Accept': 'application/vnd.github.v3.raw'
              }
            }, 4000);

            if (response.ok && active) {
              const text = await response.text();
              if (isValidReadme(text)) {
                setReadmeContent(text);
                localStorage.setItem(cacheKey, text);
                loaded = true;
                break;
              }
            }
          } catch (e) {
            // Ignore api errors
          }
        }

        if (loaded) return;

        if (!cached || !isValidReadme(cached)) {
          throw new Error('No README file located on remote branch');
        }
      } catch (err) {
        console.warn('Dynamic README loading bypass, displaying explicit missing error', err);
        if (active && (!cached || !isValidReadme(cached))) {
          setReadmeContent(null);
        }
      } finally {
        if (active) {
          setIsLoadingReadme(false);
        }
      }
    }

    async function fetchRealCommits() {
      const repoName = getRepoName(repo);
      const match = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      const owner = match ? match[1] : 'tomekdot';
      const actualName = match ? match[2] : repoName;

      const cacheKey = `github_commits_cache_${repoName}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedCount = parseInt(cached, 10);
        if (!isNaN(cachedCount) && onUpdateRepo && cachedCount !== repo.commitsCount) {
          setTimeout(() => {
            if (active && onUpdateRepo) {
              onUpdateRepo({
                ...repo,
                commitsCount: cachedCount
              });
            }
          }, 300);
        }
        return;
      }

      try {
        const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${actualName}/commits?per_page=1`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        }, 3500);

        if (res.ok) {
          const link = res.headers.get('Link');
          let realCommits = 1;
          if (link) {
            const lastPageMatch = link.match(/&page=(\d+)>; rel="last"/);
            if (lastPageMatch && lastPageMatch[1]) {
              realCommits = parseInt(lastPageMatch[1], 10);
            }
          } else {
            const data = await res.json();
            realCommits = Array.isArray(data) ? data.length : 1;
          }

          localStorage.setItem(cacheKey, realCommits.toString());
          if (onUpdateRepo && active && realCommits !== repo.commitsCount) {
            setTimeout(() => {
              if (active && onUpdateRepo) {
                onUpdateRepo({
                  ...repo,
                  commitsCount: realCommits
                });
              }
            }, 300);
          }
        }
      } catch (err) {
        console.warn('Could not load real commits count for', repo.name, err);
      }
    }

    if (!repo.isPrivate) {
      fetchReadme();
      fetchRealCommits();
    } else {
      setIsLoadingReadme(false);
      setReadmeContent(null);
    }

    return () => {
      active = false;
    };
  }, [currentRepoName, repo?.isPrivate]);

  if (!repo) return null;

  const primaryCatKey = repo.cat[0] || 'other';
  const catSpec = CATEGORIES[primaryCatKey] || CATEGORIES.other;
  const langColor = LANG_COLORS[repo.lang] || '#8b949e';

  return (
    <AnimatePresence>
      {isOpen && (
        isMinimized ? (
        <motion.div
          key="repo_minimized_dock"
          id="repo_minimized_dock"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full min-w-0 max-w-full p-1.5 sm:p-2 [@media(max-height:520px)]:p-1 flex items-center gap-1.5 sm:gap-2 bg-[#0D0D0D]/95 border-2 border-cyan-500/80 rounded-none font-mono text-white cursor-pointer shadow-xl"
          onClick={onRestore}
          title={lang === 'en' ? 'Click to restore repository modal' : 'Kliknij, aby przywrócić okno projektu'}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="p-1 sm:p-1.5 [@media(max-height:520px)]:p-1 bg-neutral-900 border border-editorial-border text-cyan-400 shrink-0">
              <FolderGit2 size={12} className="sm:w-[13px] sm:h-[13px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <MarqueeText 
                  text={repo.name} 
                  translateNo 
                  className="text-[11px] sm:text-xs [@media(max-height:520px)]:text-[10px] font-bold text-white flex-1 min-w-0" 
                />
                <span className="hidden md:inline-block text-[8.5px] uppercase px-1 py-0.2 bg-[#0E1B24] border border-cyan-500/40 text-cyan-400 font-bold shrink-0">
                  {lang === 'en' ? catSpec.labelEn : catSpec.labelPl}
                </span>
              </div>
              <p className="text-[8.5px] sm:text-[9.5px] [@media(max-height:520px)]:text-[8px] text-editorial-muted truncate font-sans">
                {lang === 'en' ? 'Click to restore ↗' : 'Kliknij, by otworzyć ↗'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              id="restore_repo_modal_btn"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.();
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 [@media(max-height:520px)]:w-6.5 [@media(max-height:520px)]:h-6.5 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-cyan-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title={lang === 'en' ? 'Expand modal' : 'Przywróć okno'}
            >
              <ChevronUp size={13} className="sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              id="dismiss_repo_modal_btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 [@media(max-height:520px)]:w-6.5 [@media(max-height:520px)]:h-6.5 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-rose-500 text-editorial-muted hover:text-rose-400 transition-colors cursor-pointer shrink-0"
              title={lang === 'en' ? 'Close' : 'Zamknij'}
            >
              <X size={13} className="sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="repo_modal_portal"
          id="repo_modal_portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 short:p-1 overflow-hidden"
        >
          {/* Backdrop overlay */}
          <motion.div
            id="modal_backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80"
          />

          {/* Modal Window Container with native Framer Motion drag to minimize */}
          {!isMinimized && (
            <motion.div
              id="modal_window"
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative bg-editorial-bg border-2 border-editorial-border w-[calc(100vw-1rem)] sm:w-[min(42rem,calc(100vw-4rem))] lg:w-[min(48rem,calc(100vw-6rem))] short:w-[min(56rem,calc(100vw-1rem))] h-[min(84dvh,720px)] max-h-[calc(100dvh-2rem)] short:h-[calc(100dvh-0.5rem)] short:max-h-[calc(100dvh-0.5rem)] rounded-none shadow-2xl flex flex-col overflow-hidden min-w-0 my-auto"
            >
            {/* iOS/iPhone-style pull-down handle (clean pill bar, no text) */}
            <div 
              className="w-full flex items-center justify-center pt-2.5 pb-2 short:pt-1 short:pb-1 bg-editorial-sidebar-bg cursor-grab active:cursor-grabbing select-none shrink-0 group border-b border-editorial-border/30 touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
              title={lang === 'en' ? 'Drag down to minimize' : 'Przeciągnij w dół, aby zminimalizować'}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-600 group-hover:bg-cyan-400 transition-colors" />
            </div>

            {/* Header Block - draggable from blank areas */}
            <div 
              className={`shrink-0 border-b border-editorial-border bg-editorial-sidebar-bg px-3.5 sm:px-6 transition-all duration-200 flex items-start justify-between select-none cursor-grab active:cursor-grabbing touch-none ${
                isShortTitleExpanded ? 'py-2.5 sm:py-4 short:py-2.5' : 'py-2.5 sm:py-4 short:py-2'
              }`}
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
            >
            <div className={`min-w-0 flex-1 pr-2 flex flex-col items-start gap-1 sm:gap-1.5 ${
              isShortTitleExpanded
                ? 'short:flex-col short:items-start short:gap-1.5'
                : 'short:flex-row short:items-center short:gap-2.5 sm:short:gap-3 short:overflow-hidden'
            }`}>
              <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 ${
                isShortTitleExpanded
                  ? 'short:order-2 short:mb-0 short:flex-wrap short:gap-1.5'
                  : 'short:order-2 short:mb-0 short:flex-nowrap short:overflow-hidden short:shrink short:gap-1.5'
              }`}>
                {repo.cat.map(catKey => {
                  const spec = CATEGORIES[catKey] || CATEGORIES.other;
                  const catLabelText = lang === 'en' ? (spec.shortLabelEn || spec.labelEn) : (spec.shortLabelPl || spec.labelPl);
                  return (
                    <span 
                      key={catKey} 
                      title={lang === 'en' ? spec.labelEn : spec.labelPl}
                      className="inline-flex items-center text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-editorial-accent bg-[#1D170E] px-1.5 sm:px-2 py-0.5 border border-editorial-accent/30 font-mono whitespace-nowrap shrink-0"
                    >
                      <span className="hidden short:inline font-mono uppercase">
                        {spec.abbr || spec.key.toUpperCase()}
                      </span>
                      <span className="short:hidden font-mono uppercase">
                        {catLabelText.toUpperCase()}
                      </span>
                    </span>
                  );
                })}
                {repo.lang && (
                  <span 
                    translate="no" 
                    title={repo.lang}
                    className="inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 border border-editorial-border text-editorial-muted text-[9px] sm:text-[10px] font-mono notranslate uppercase font-bold tracking-wider whitespace-nowrap shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
                    <span className="hidden short:inline font-mono uppercase">{getShortLang(repo.lang)}</span>
                    <span className="short:hidden font-mono uppercase">{repo.lang.toUpperCase()}</span>
                  </span>
                )}
                {/* Collapse button: only displayed on short screens when title is expanded */}
                {isShortTitleExpanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsShortTitleExpanded(false);
                    }}
                    className="hidden short:inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-400 text-cyan-300 text-[9px] font-mono uppercase hover:bg-cyan-900 transition-colors cursor-pointer shrink-0 shadow-sm"
                    title={lang === 'en' ? 'Collapse title' : 'Zwiń nazwę'}
                  >
                    <span>▲ {lang === 'en' ? 'COLLAPSE' : 'ZWIŃ'}</span>
                  </button>
                )}
              </div>

              {/* Repo Title - selectable, clickable only on short screens to expand */}
              <div 
                className={`w-full min-w-0 ${
                  isShortTitleExpanded
                    ? 'short:order-1 short:w-full'
                    : 'short:order-1 short:shrink short:max-w-[65%]'
                }`}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div
                  onClick={(e) => {
                    if (window.matchMedia('(max-height: 520px)').matches) {
                      e.stopPropagation();
                      setIsShortTitleExpanded(prev => !prev);
                    }
                  }}
                  className={`text-left w-full ${
                    isShortTitleExpanded
                      ? 'short:cursor-pointer'
                      : 'short:cursor-pointer short:flex short:items-center short:gap-1.5 short:min-w-0'
                  } cursor-text select-text`}
                  title={
                    isShortTitleExpanded
                      ? (lang === 'en' ? 'Click to collapse title' : 'Kliknij, aby zwinąć nazwę')
                      : (lang === 'en' ? 'Click to expand title' : 'Kliknij, aby rozwinąć nazwę')
                  }
                >
                  <h2 className={`font-bold font-mono text-white flex flex-wrap items-center gap-1.5 sm:gap-2 uppercase tracking-wider leading-snug text-base sm:text-2xl break-words ${
                    isShortTitleExpanded
                      ? 'short:text-xs sm:short:text-sm short:break-words short:whitespace-normal'
                      : 'short:text-base sm:short:text-lg short:flex-nowrap short:truncate'
                  }`}>
                    <span translate="no" className={`notranslate ${!isShortTitleExpanded ? 'short:truncate' : 'break-words'}`}>{repo.name}</span>
                    {repo.isPrivate && (
                      <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
                        <Lock size={10} />
                        <span className="hidden short:inline">PRIV</span>
                        <span className="short:hidden">{lang === 'en' ? 'Private' : 'Prywatne'}</span>
                      </span>
                    )}
                    {repo.isFork && (
                      <span className="inline-flex items-center gap-1 bg-[#181126] text-purple-400 border border-purple-500/40 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                        <GitFork size={10} className="text-purple-400 shrink-0" />
                        <span className="hidden short:inline">FORK</span>
                        <span className="short:hidden">
                          {repo.isContributed
                            ? (lang === 'en' ? 'Contributed Fork' : 'Wkład własny (Fork)')
                            : (lang === 'en' ? 'Fork' : 'Fork')}
                        </span>
                      </span>
                    )}
                  </h2>
                  {!isShortTitleExpanded && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsShortTitleExpanded(true);
                      }}
                      className="hidden short:inline-flex items-center gap-0.5 ml-1 text-[9px] text-cyan-400 font-mono font-normal border border-cyan-500/30 px-1 py-0.2 bg-cyan-950/40 hover:border-cyan-400 align-middle shrink-0 cursor-pointer"
                      title={lang === 'en' ? 'Expand title' : 'Rozwiń nazwę'}
                    >
                      ▼ {lang === 'en' ? 'FULL' : 'CAŁOŚĆ'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="minimize_modal_btn"
                onClick={onMinimize}
                className="w-8 h-8 sm:w-9 sm:h-9 short:w-7 short:h-7 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded-none transition-all border border-cyan-500/50 shrink-0 cursor-pointer flex items-center justify-center shadow-sm"
                title={lang === 'en' ? 'Minimize' : 'Zminimalizuj'}
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                id="close_modal_btn"
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 short:w-7 short:h-7 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 shrink-0 cursor-pointer flex items-center justify-center shadow-sm"
                title={lang === 'en' ? 'Close (Esc)' : 'Zamknij (Esc)'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs - Full width segmented on mobile, all tabs clearly visible */}
          <div className="flex border-b border-editorial-border bg-editorial-bg px-1 sm:px-6 overflow-x-auto scrollbar-none shrink-0 w-full h-11 sm:h-12 short:h-9">
            <button
              type="button"
              id="tab_info_btn"
              onClick={() => setActiveTab('info')}
              className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-4 h-full text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider sm:tracking-widest border-b-2 transition-all cursor-pointer whitespace-nowrap box-border
                ${activeTab === 'info' 
                  ? 'text-editorial-accent border-editorial-accent bg-editorial-accent/5' 
                  : 'text-editorial-muted border-transparent hover:text-white'}`}
            >
              <FileText size={13} className="shrink-0" />
              <span>{lang === 'en' ? 'Overview' : 'Przegląd'}</span>
            </button>
            
            {!repo.isPrivate && (
              <button
                type="button"
                id="tab_code_btn"
                onClick={() => setActiveTab('code')}
                className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-4 h-full text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider sm:tracking-widest border-b-2 transition-all cursor-pointer whitespace-nowrap box-border
                  ${activeTab === 'code' 
                    ? 'text-editorial-accent border-editorial-accent bg-editorial-accent/5' 
                    : 'text-editorial-muted border-transparent hover:text-white'}`}
              >
                <Code size={13} className="shrink-0" />
                <span className="sm:hidden">README</span>
                <span className="hidden sm:inline">README.md</span>
              </button>
            )}

            <button
              type="button"
              id="tab_ai_btn"
              onClick={() => setActiveTab('ai')}
              className={`flex-1 sm:flex-initial flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-2 sm:px-4 h-full text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider sm:tracking-widest border-b-2 transition-all cursor-pointer whitespace-nowrap box-border
                ${activeTab === 'ai' 
                  ? 'text-editorial-accent border-editorial-accent bg-editorial-accent/10' 
                  : 'text-editorial-muted border-transparent hover:text-white'}`}
            >
              <Bot size={13} className={`shrink-0 ${activeTab === 'ai' ? 'text-editorial-accent' : ''}`} />
              <span className="sm:hidden">{lang === 'en' ? 'AI Chat' : 'Asystent AI'}</span>
              <span className="hidden sm:inline">{lang === 'en' ? 'AI Terminal / Chat' : 'Asystent AI / Terminal'}</span>
              <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 leading-none bg-editorial-accent/20 text-editorial-accent border border-editorial-accent/40 uppercase font-bold tracking-wider">
                AI
              </span>
            </button>
          </div>

          {/* Body Content */}
          <div 
            ref={modalBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-5 short:p-2 space-y-3 sm:space-y-4 short:space-y-2 scrollbar-thin scrollbar-thumb-neutral-800 min-w-0 w-full"
          >
            {activeTab === 'info' ? (
              <div className="space-y-3 sm:space-y-6 animate-fadeIn font-sans">
                {/* Mobile stats collapse bar (visible only on small screens) */}
                <div className="flex sm:hidden items-center justify-between px-3 py-1.5 border border-editorial-border bg-editorial-sidebar-bg shrink-0">
                  <span className="text-[10px] font-mono uppercase text-editorial-muted tracking-wider">
                    {lang === 'en' ? 'Repository Stats' : 'Statystyki Repozytorium'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStats(v => !v)}
                    className="text-[10px] font-mono uppercase text-editorial-accent hover:text-white cursor-pointer px-2 py-0.5 border border-editorial-accent/40 bg-editorial-accent/10 transition-colors"
                  >
                    {showStats ? (lang === 'en' ? 'Hide ▲' : 'Zwiń ▲') : (lang === 'en' ? 'Show ▼' : 'Pokaż ▼')}
                  </button>
                </div>

                {/* Statistics panel - collapsible on mobile via showStats, always visible on desktop */}
                <div className={`grid transition-[grid-template-rows,opacity] duration-200 sm:!grid-rows-[1fr] sm:!opacity-100 ${
                  showStats ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}>
                  <div className="overflow-hidden">
                    {!repo.isPrivate ? (
                      <div className="grid grid-cols-2 gap-2 sm:gap-4 pb-0.5">
                        <div className="bg-editorial-sidebar-bg border border-editorial-border p-2.5 sm:p-3.5 short:p-1.5 rounded-none text-center">
                          <div className="flex justify-center mb-1 short:hidden text-editorial-accent">
                            <Star size={16} />
                          </div>
                          <div className="text-sm font-mono font-bold text-white"><AnimatedNumber value={repo.stars} /></div>
                          <div className="text-[10px] text-editorial-muted font-mono uppercase tracking-wider mt-0.5">Stars</div>
                        </div>

                        <div className="bg-editorial-sidebar-bg border border-editorial-border p-2.5 sm:p-3.5 short:p-1.5 rounded-none text-center">
                          <div className="flex justify-center mb-1 short:hidden text-editorial-accent">
                            <Code size={16} />
                          </div>
                          <div className="text-sm font-mono font-bold text-white"><AnimatedNumber value={repo.commitsCount || 0} /></div>
                          <div className="text-[10px] text-editorial-muted font-mono uppercase tracking-wider mt-0.5 font-bold">Commits</div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-neutral-950/60 border border-rose-900/50 p-4 sm:p-5 rounded-none text-center flex flex-col items-center justify-center space-y-1.5 pb-0.5">
                        <Lock size={18} className="text-rose-500 mb-0.5" />
                        <div className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
                          {lang === 'en' ? 'Private Repository' : 'Prywatne Repozytorium'}
                        </div>
                        <div className="text-[11px] text-editorial-muted font-mono max-w-md leading-relaxed">
                          {lang === 'en' 
                            ? 'Source code, repository commits, and README.md documentation are kept private and restricted.' 
                            : 'Kod źródłowy, commity oraz dokumentacja README.md są prywatne i niedostępne publicznie.'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Narrative Detail / Archival Summary */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-[#8b949e] flex items-center gap-1.5">
                      <BookOpen size={12} className="text-editorial-accent" />
                      <span>
                        {repo.isPrivate 
                          ? (lang === 'en' ? 'Project Overview' : 'Przegląd projektu')
                          : (lang === 'en' ? 'Overview & Project Architecture' : 'Przegląd projektu i architektura')}
                      </span>
                    </h4>
                    {repo.cat && repo.cat[0] && (
                      <span className="text-[9.5px] font-mono uppercase px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-accent font-bold whitespace-nowrap shrink-0">
                        {CATEGORIES[repo.cat[0]] 
                          ? (lang === 'en' ? (CATEGORIES[repo.cat[0]].shortLabelEn || CATEGORIES[repo.cat[0]].labelEn) : (CATEGORIES[repo.cat[0]].shortLabelPl || CATEGORIES[repo.cat[0]].labelPl)) 
                          : repo.cat[0]}
                      </span>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 rounded-none bg-editorial-sidebar-bg border border-editorial-border space-y-2.5">
                    <p className="text-[13px] sm:text-sm leading-relaxed text-editorial-text font-serif italic">
                      {(() => {
                        const isVehicleDetector = repo.name.toLowerCase() === 'vehicle-detector-dev';
                        const raw = lang === 'en' 
                          ? (repo.longDescEn || repo.desc || '') 
                          : (repo.longDescPl || repo.descPl || repo.desc || '');
                        let clean = raw
                          .replace(/Engineered with modular architecture, strict error handling, and optimized performance for seamless in-game and developer integration\.?/gi, '')
                          .replace(/Comprehensive TrackMania extension providing live in-game UI overlays, real-time event signal processing, and low-latency state synchronization\.?/gi, '')
                          .replace(/Zaawansowane rozszerzenie dla ekosystemu TrackMania oferujące interaktywne nakładki w grze, bezpośrednią obsługę zdarzeń i niskie narzuty na wydajność silnika\.?/gi, '')
                          .replace(/Stworzony w architekturze modułowej z nastawieniem na wysoką wydajność, niezawodność i łatwą rozbudowę\.?/gi, '')
                          .trim();

                        if (!isVehicleDetector && (
                          clean.includes('bounding boxes') || 
                          clean.includes('3D wireframe') || 
                          clean.includes('YOLO') || 
                          clean.includes('convolutional neural networks') ||
                          clean.includes('wyciągający współrzędne 3D aut')
                        )) {
                          clean = (lang === 'en' ? repo.desc : (repo.descPl || repo.desc)) || '';
                        }
                        return clean || repo.desc || '';
                      })()}
                    </p>

                    {/* Sourced directly from README indicator & jump button */}
                    {!repo.isPrivate && (
                      <div className="pt-2 border-t border-editorial-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="text-editorial-muted flex items-center gap-1.5">
                          <CheckCircle2 size={11} className="text-emerald-400" />
                          <span>
                            {lang === 'en' 
                              ? 'Verified scope sourced from repository metadata & README.md' 
                              : 'Zweryfikowany zakres z metadanych repozytorium i pliku README.md'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('code')}
                          className="text-editorial-accent hover:text-white flex items-center gap-1 cursor-pointer font-bold uppercase transition-colors"
                          title={lang === 'en' ? 'Switch to README documentation tab' : 'Przejdź do zakładki z dokumentacją README'}
                        >
                          <span>{lang === 'en' ? 'View README.md tab →' : 'Zobacz zakładkę README.md →'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plugin Technical Specification Banner for PyPlanet / Openplanet plugins (Public repos only) */}
                {!repo.isPrivate && (repo.cat.includes('pyplanet') || repo.cat.includes('openplanet')) && !repo.cat.includes('kul') && (
                  <div className="p-3 sm:p-3.5 bg-[#0e0c08] border border-editorial-accent/40 space-y-2">
                    <div className="flex items-center justify-between border-b border-editorial-accent/20 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-editorial-accent/10 border border-editorial-accent/40 text-editorial-accent">
                          <Boxes size={13} />
                        </span>
                        <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-editorial-accent">
                          {lang === 'en' ? 'Plugin Specification & Runtime Target' : 'Specyfikacja Techniczna Wtyczki'}
                        </h4>
                      </div>
                      <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-editorial-accent/10 text-editorial-accent border border-editorial-accent/30 font-bold">
                        {repo.cat.includes('pyplanet') ? 'PyPlanet Dedicated' : 'Openplanet In-Game'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="p-2 bg-black/40 border border-editorial-border">
                        <div className="text-editorial-muted text-[8.5px] uppercase">{lang === 'en' ? 'Runtime' : 'Środowisko'}</div>
                        <div className="text-white font-bold truncate">
                          {repo.cat.includes('pyplanet') ? 'Python 3.8+ / Asyncio' : 'AngelScript / Native'}
                        </div>
                      </div>
                      <div className="p-2 bg-black/40 border border-editorial-border">
                        <div className="text-editorial-muted text-[8.5px] uppercase">{lang === 'en' ? 'Target Game' : 'Docelowa Gra'}</div>
                        <div className="text-white font-bold truncate">TrackMania 2020</div>
                      </div>
                      <div className="p-2 bg-black/40 border border-editorial-border">
                        <div className="text-editorial-muted text-[8.5px] uppercase">{lang === 'en' ? 'UI Rendering' : 'Interfejs UI'}</div>
                        <div className="text-white font-bold truncate">
                          {repo.cat.includes('pyplanet') ? 'ManiaLink / ManiaScript' : 'Dear ImGui (60+ FPS)'}
                        </div>
                      </div>
                      <div className="p-2 bg-black/40 border border-editorial-border">
                        <div className="text-editorial-muted text-[8.5px] uppercase">{lang === 'en' ? 'Status' : 'Status Wdrożenia'}</div>
                        <div className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          <span>{lang === 'en' ? 'Active / Verified' : 'Aktywna / Gotowa'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Co zostało zrobione // Implemented Deliverables (Public repos only & filtered for genuine, non-generic items only) */}
                {!repo.isPrivate && (() => {
                  const GENERIC_FEATURE_PATTERNS = [
                    /Implementation of core computational algorithms/i,
                    /Modular architecture with input validation/i,
                    /Practical engineering satisfying academic/i,
                    /Comprehensive project documentation and technical design/i,
                    /Modular software architecture with clean separation/i,
                    /Optimized asynchronous I\/O/i,
                    /Comprehensive edge-case error handling/i,
                    /Standardized deployment tooling/i,
                    /Implementacja kluczowych algorytmów/i,
                    /Architektura modułowa z walidacją wejścia/i,
                    /Praktyczna realizacja wymagań akademickich/i,
                    /Kompletna dokumentacja projektowa/i,
                    /Modularna architektura z wyraźnym podziałem/i,
                    /Zoptymalizowana obsługa wejścia\/wyjścia/i,
                    /Obsługa błędów brzegowych/i,
                    /Kompletny zestaw skryptów/i,
                  ];
                  const rawList = ((lang === 'en' ? repo.featuresEn : repo.featuresPl) || repo.featuresPl || repo.featuresEn || []);
                  const list = rawList.filter(f => !GENERIC_FEATURE_PATTERNS.some(p => p.test(f)));
                  
                  if (list.length === 0) return null;

                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-editorial-border/60 pb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 size={13} />
                          </div>
                          <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-emerald-400">
                            {lang === 'en' ? 'What Was Implemented // Core Features' : 'Co zostało zrobione // Zaimplementowane funkcjonalności'}
                          </h4>
                        </div>
                        <span className="text-[9.5px] font-mono text-editorial-muted">
                          {list.length} {lang === 'en' ? 'features' : 'funkcjonalności'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {list.map((feature, idx) => (
                          <div 
                            key={idx}
                            className="p-3 bg-neutral-900/60 border border-editorial-border hover:border-emerald-500/40 transition-colors flex items-start gap-2.5 group"
                          >
                            <div className="w-4 h-4 rounded-none bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                              <Check size={10} />
                            </div>
                            <p className="text-xs text-zinc-200 leading-relaxed font-sans break-words">
                              {renderInlineMarkdown(feature)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Architecture Model & Component Flow (Public repos only) */}
                {!repo.isPrivate && (
                  <div className="space-y-2">
                    <RepoArchitectureUml repo={repo} lang={lang} readmeContent={readmeContent} />
                  </div>
                )}

                {/* Capabilities and Tech Stack (Public repos only) */}
                {!repo.isPrivate && repo.capabilities && repo.capabilities.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-[#8b949e] flex items-center gap-1.5">
                      <Layers size={12} className="text-editorial-accent" />
                      <span>{lang === 'en' ? 'Ecosystem Capabilities & Stack' : 'Możliwości i Integracje'}</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold">
                      {repo.capabilities.map((cap, i) => (
                        <span key={i} className="px-2 py-0.5 bg-neutral-900/90 border border-editorial-border text-zinc-300 uppercase">
                          {cap.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional capability tags */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase font-mono tracking-widest text-[#8b949e]">
                    {lang === 'en' ? 'System Metadata' : 'Metadane Systemowe'}
                  </h4>
                  <div className="flex flex-wrap gap-2 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold">
                    <span translate="no" className="bg-neutral-900 border border-editorial-border px-2 py-1 rounded-none text-editorial-muted notranslate uppercase">
                      {(repo.lang || 'Git Shell').toUpperCase()}
                    </span>
                    {repo.isFork && (
                      repo.forkParent ? (
                        <a
                          href={`https://github.com/${repo.forkParent}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#181126] hover:bg-[#231738] border border-purple-500/40 hover:border-purple-400 px-2 py-1 rounded-none text-purple-300 hover:text-purple-200 flex items-center gap-1.5 shadow-[0_0_8px_rgba(168,85,247,0.15)] transition-all cursor-pointer group/fork"
                          title={lang === 'en' ? `Open upstream repository ${repo.forkParent}` : `Otwórz oryginalne repozytorium ${repo.forkParent}`}
                        >
                          <GitFork size={11} className="text-purple-400 group-hover/fork:scale-110 transition-transform shrink-0" />
                          <span className="underline decoration-dotted underline-offset-2">
                            {repo.isContributed
                              ? (lang === 'en' ? `Contributed Fork (Upstream: ${repo.forkParent})` : `Wkład własny w fork (Baza: ${repo.forkParent})`)
                              : (lang === 'en' ? `Forked from ${repo.forkParent}` : `Sforkowane z ${repo.forkParent}`)}
                          </span>
                          <ExternalLink size={9} className="opacity-70 group-hover/fork:opacity-100" />
                        </a>
                      ) : (
                        <a
                          href={`https://github.com/tomekdot/${repo.name}/network/members`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#181126] hover:bg-[#231738] border border-purple-500/40 hover:border-purple-400 px-2 py-1 rounded-none text-purple-300 hover:text-purple-200 flex items-center gap-1.5 shadow-[0_0_8px_rgba(168,85,247,0.15)] transition-all cursor-pointer group/fork"
                          title={lang === 'en' ? 'Find upstream repository in network graph' : 'Znajdź oryginalne repozytorium w grafie sieciowym'}
                        >
                          <GitFork size={11} className="text-purple-400 group-hover/fork:scale-110 transition-transform shrink-0" />
                          <span className="underline decoration-dotted underline-offset-2">
                            {lang === 'en' ? 'Forked Repository (Upstream)' : 'Sforkowane Repozytorium'}
                          </span>
                          <ExternalLink size={9} className="opacity-70 group-hover/fork:opacity-100" />
                        </a>
                      )
                    )}
                    {repo.createdYear && (
                      <span className="bg-neutral-900 border border-editorial-border px-2 py-1 rounded-none text-sky-400 flex items-center gap-1.5" title={lang === 'en' ? 'Repository creation year' : 'Rok utworzenia repozytorium'}>
                        <Calendar size={11} className="text-sky-400 shrink-0" />
                        <span>{lang === 'en' ? 'Created: ' : 'Utworzono: '}{repo.createdYear}</span>
                      </span>
                    )}
                    {repo.pushedAt && (
                      <span className="bg-neutral-900 border border-editorial-border px-2 py-1 rounded-none text-editorial-accent">
                        {lang === 'en' ? 'Updated: ' : 'Aktualizacja: '}{new Date(repo.pushedAt).toISOString().replace('T', ' ').substring(0, 16)} UTC
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Navigation Footer */}
                <div className="pt-2 border-t border-editorial-border/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!repo.isPrivate && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('code')}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Code size={12} className="text-editorial-accent" />
                        <span>{lang === 'en' ? 'Read full README.md →' : 'Czytaj pełny README.md →'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('ai')}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Bot size={12} className="text-editorial-accent" />
                      <span>{lang === 'en' ? 'Ask AI Assistant →' : 'Zadaj pytanie Asystentowi AI →'}</span>
                    </button>
                  </div>

                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-editorial-accent/10 hover:bg-editorial-accent/20 border border-editorial-accent/40 text-editorial-accent hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
                  >
                    <span>GitHub</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ) : activeTab === 'code' && !repo.isPrivate ? (
              <div className="space-y-4 animate-fadeIn font-sans leading-relaxed min-w-0 max-w-full overflow-hidden">
                {isLoadingReadme ? (
                  <div className="py-20 text-center font-mono text-xs text-editorial-accent animate-pulse uppercase tracking-widest">
                    &gt;&gt; [FETCHING LIVE ARCHIVAL README.MD...]
                  </div>
                ) : sanitizedReadme ? (
                  <div className="markdown-body text-editorial-text space-y-4 p-3 sm:p-5 bg-neutral-950/30 border border-editorial-border min-w-0 max-w-full overflow-hidden">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h1: ({ children }) => <h1 className="text-base sm:text-lg font-bold font-mono text-white border-b border-editorial-border pb-2 mt-4 mb-3 w-full break-words">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm sm:text-base font-bold font-mono text-white border-b border-editorial-border pb-1.5 mt-4 mb-2 w-full break-words">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-xs sm:text-sm font-bold font-mono text-editorial-accent mt-3 mb-1.5 break-words">{children}</h3>,
                        h4: ({ children }) => <h4 className="text-xs font-bold font-mono text-white mt-2 mb-1 break-words">{children}</h4>,
                        h5: ({ children }) => <h5 className="text-xs font-semibold font-mono text-editorial-muted mt-2 mb-1 break-words">{children}</h5>,
                        h6: ({ children }) => <h6 className="text-xs font-semibold font-mono text-editorial-muted mt-2 mb-1 break-words">{children}</h6>,
                        hr: () => <hr className="border-t border-editorial-border my-4 w-full" />,
                        p: ({ children, className, align }: any) => {
                          const isCenter = align === 'center';
                          return (
                            <div className={`text-xs font-sans text-editorial-text leading-relaxed mb-3 break-words [overflow-wrap:anywhere] ${isCenter ? 'text-center flex flex-wrap justify-center items-center gap-2' : ''} ${className || ''}`}>
                              {children}
                            </div>
                          );
                        },
                        div: ({ children, className, align }: any) => {
                          const isCenter = align === 'center';
                          return (
                            <div className={`break-words ${isCenter ? 'text-center flex flex-wrap justify-center items-center gap-2 my-2' : ''} ${className || ''}`}>
                              {children}
                            </div>
                          );
                        },
                        b: ({ children }) => <strong className="font-bold text-white font-mono">{children}</strong>,
                        strong: ({ children }) => <strong className="font-bold text-white font-mono">{children}</strong>,
                        em: ({ children }) => <em className="italic text-editorial-text">{children}</em>,
                        i: ({ children }) => <i className="italic text-editorial-text">{children}</i>,
                        pre: ({ children }: any) => <ReadmeCodeBlock lang={lang}>{children}</ReadmeCodeBlock>,
                        code: ({ children, className, inline }: any) => {
                          const isInline = inline || (!className && typeof children === 'string' && !children.includes('\n'));
                          return isInline ? (
                            <code translate="no" className="bg-neutral-900 text-editorial-accent font-mono text-[10px] sm:text-xs px-1 py-0.5 border border-editorial-border notranslate break-words [overflow-wrap:anywhere] whitespace-normal">
                              {children}
                            </code>
                          ) : (
                            <code translate="no" className="notranslate font-mono block">
                              {children}
                            </code>
                          );
                        },
                        li: ({ children }) => <li className="text-xs font-sans text-editorial-text leading-relaxed break-words">{children}</li>,
                        ul: ({ children }) => <ul className="my-2.5 space-y-1.5 list-disc pl-5 text-xs text-editorial-text">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2.5 space-y-1.5 list-decimal pl-5 text-xs text-editorial-text">{children}</ol>,
                        a: ({ href, children }) => {
                          let resolvedHref = href;
                          if (resolvedHref && !resolvedHref.startsWith('http') && !resolvedHref.startsWith('mailto:') && !resolvedHref.startsWith('#')) {
                            const cleanHref = resolvedHref.replace(/^\.?\/+/, '');
                            const match = repo?.url?.match(/github\.com\/([^/]+)\/([^/]+)/);
                            const owner = match ? match[1] : (repo?.forkParent ? repo.forkParent.split('/')[0] : 'tomekdot');
                            const actualName = match ? match[2] : (repo?.forkParent ? repo.forkParent.split('/')[1] : repo?.name);
                            resolvedHref = `https://github.com/${owner}/${actualName}/blob/main/${cleanHref}`;
                          }
                          return (
                            <InAnchorContext.Provider value={true}>
                              <a 
                                href={resolvedHref} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-editorial-accent hover:underline decoration-dotted font-mono text-xs inline-flex items-center gap-1 mx-0.5 break-all"
                              >
                                {children}
                              </a>
                            </InAnchorContext.Provider>
                          );
                        },
                        img: ({ src, alt, width, height, ...props }: any) => {
                          return (
                            <ReadmeImageRenderer
                              src={src}
                              alt={alt}
                              width={width}
                              height={height}
                              repo={repo}
                              lang={lang}
                              {...props}
                            />
                          );
                        },
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-editorial-accent pl-3.5 pr-2 py-1.5 italic font-serif text-editorial-muted my-3 bg-neutral-900/40 break-words">{children}</blockquote>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-4 w-full max-w-full min-w-0 border border-editorial-border bg-neutral-950/40">
                            <table className="w-full text-left border-collapse text-xs font-sans">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-neutral-900/90 border-b border-editorial-border text-editorial-accent font-mono uppercase text-[11px]">{children}</thead>,
                        tbody: ({ children }) => <tbody className="divide-y divide-editorial-border/40">{children}</tbody>,
                        tr: ({ children }) => <tr className="hover:bg-neutral-900/40 transition-colors">{children}</tr>,
                        th: ({ children }) => <th className="px-3.5 py-2.5 font-semibold font-mono border-r border-editorial-border/40 last:border-0">{children}</th>,
                        td: ({ children }) => <td className="px-3.5 py-2.5 border-r border-editorial-border/40 last:border-0 text-editorial-text leading-relaxed break-words">{children}</td>,
                        details: ({ children }) => <details className="my-3 border border-editorial-border bg-neutral-900/30 p-3 rounded-none open:bg-neutral-900/50 min-w-0 max-w-full overflow-hidden">{children}</details>,
                        summary: ({ children }) => <summary className="cursor-pointer font-mono font-bold text-editorial-accent hover:text-white mb-2 select-none break-words">{children}</summary>,
                      }}
                    >
                      {sanitizedReadme}
                    </Markdown>
                  </div>
                ) : (
                  <div className="py-12 px-6 text-center border border-dashed border-neutral-800 bg-neutral-950/40 font-mono text-xs text-neutral-400 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-amber-500 font-bold uppercase tracking-wider">
                      <AlertTriangle size={16} />
                      <span>{lang === 'en' ? 'README.md file is missing' : 'Brak pliku README.md'}</span>
                    </div>
                    <p className="text-editorial-muted text-[11px] leading-relaxed max-w-md mx-auto">
                      {lang === 'en' 
                        ? 'This repository does not contain a README.md file on the main or master branch.' 
                        : 'To repozytorium nie zawiera pliku dokumentacji README.md w gałęzi głównej.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* AI Terminal Assistant / Chatbot Tab */
              <div className="space-y-2.5 sm:space-y-3.5 animate-fadeIn font-mono">
                {/* Terminal Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-950 border border-editorial-border text-[10px] text-editorial-muted">
                  <div className="flex items-center gap-2 text-editorial-accent font-bold">
                    <Terminal size={13} />
                    <span>TOMEKDOT REPO TERMINAL AI</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* API Key Status Pill / Toggle Button */}
                    <button
                      type="button"
                      id="btn_toggle_api_config"
                      onClick={() => setShowApiKeyConfig(prev => !prev)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        localApiKey
                          ? `${savedProvider.badgeClass} hover:brightness-110`
                          : serverConfigStatus?.hasServerKey
                          ? 'bg-sky-950/60 border-sky-600/70 text-sky-300 hover:bg-sky-900/80'
                          : 'bg-neutral-900 border-editorial-border text-editorial-muted hover:text-white hover:border-editorial-accent'
                      }`}
                      title={lang === 'en' ? 'Configure Google Gemini or Local PC Engine (Ollama / LM Studio)' : 'Skonfiguruj Google Gemini lub Silnik Lokalny (Ollama / LM Studio)'}
                    >
                      <Key size={11} className={localApiKey ? savedProvider.textClass : 'text-editorial-accent'} />
                      <span>
                        {localApiKey
                          ? `${savedProvider.shortName}: ${activeModel ? activeModel.split('-')[0].toUpperCase() : 'ACTIVE'}`
                          : serverConfigStatus?.hasServerKey
                          ? (lang === 'en' ? 'Google Gemini: Server Key' : 'Google Gemini: Klucz Serwera')
                          : (lang === 'en' ? 'AI Engine: Set Up' : 'Silnik AI: Konfiguracja')}
                      </span>
                      {showApiKeyConfig ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {/* Clear Chat Button */}
                    <button
                      type="button"
                      id="btn_clear_chat"
                      onClick={() => {
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setChatMessages([
                          {
                            role: 'system',
                            text: lang === 'en'
                              ? `⚡ **TERMINAL RESET** // Context: \`${repo.name}\`\n\nNeural memory buffer refreshed.`
                              : `⚡ **RESET TERMINALA** // Kontekst: \`${repo.name}\`\n\nBufor pamięci asystenta został wyczyszczony.`,
                            time: timeStr,
                          }
                        ]);
                      }}
                      className="px-2 py-1 text-[10px] text-editorial-muted hover:text-white bg-neutral-900 border border-editorial-border hover:border-neutral-700 transition-all cursor-pointer"
                      title={lang === 'en' ? 'Clear terminal history' : 'Wyczyść historię terminala'}
                    >
                      {lang === 'en' ? 'Clear' : 'Wyczyść'}
                    </button>
                  </div>
                </div>

                {/* Collapsible Universal Local AI Key & Model Setup Box */}
                {showApiKeyConfig && (
                  <div className="p-4 bg-neutral-950 border border-editorial-accent/60 space-y-4 animate-fadeIn text-xs font-sans">
                    <div className="flex items-start justify-between gap-2 border-b border-editorial-border/60 pb-2.5">
                      <div className="flex items-center gap-2 text-editorial-accent font-mono font-bold uppercase text-[11px]">
                        <ShieldCheck size={15} className="text-emerald-400" />
                        <span>{lang === 'en' ? 'AI Engine & Model Configuration (Google AI Studio & Local PC)' : 'Konfiguracja Silników AI i Modeli (Google AI Studio i Lokalny PC)'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowApiKeyConfig(false)}
                        className="text-editorial-muted hover:text-white text-[12px] font-mono px-1 py-0.5"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Active Provider & Key Status Overview */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-900/80 border border-editorial-border font-mono text-[11px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-editorial-muted uppercase">{lang === 'en' ? 'Active Engine:' : 'Aktywny Silnik:'}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${effectiveProviderInfo.badgeClass}`}>
                          {lang === 'en' ? effectiveProviderInfo.nameEn : effectiveProviderInfo.namePl}
                        </span>
                        <span className="text-white font-bold">
                          [{activeModel || effectiveProviderInfo.defaultModel}]
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-editorial-muted">
                        <span>{lang === 'en' ? 'Endpoint:' : 'Adres:'}</span>
                        <code className="text-editorial-accent">{customBaseUrl || effectiveProviderInfo.defaultBaseUrl || (lang === 'en' ? 'Default Gateway' : 'Brama Domyślna')}</code>
                      </div>
                    </div>

                    {/* Quick Provider Selection Grid / Pills */}
                    <div className="space-y-1.5">
                      <div className="text-[10.5px] font-mono uppercase font-bold text-editorial-muted">
                        {lang === 'en' ? '1. Select AI Engine (Google Gemini or Local PC / Server):' : '1. Wybierz Silnik AI (Google Gemini lub Lokalny PC / Serwer):'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10.5px]">
                        {(['gemini', 'ollama', 'lmstudio', 'custom'] as AIProviderId[]).map((provId) => {
                          const conf = PROVIDERS_CONFIG[provId];
                          const isSelected = (effectiveProviderInfo.id === provId && selectedProviderId === 'unknown') || selectedProviderId === provId;
                          return (
                            <button
                              key={provId}
                              type="button"
                              onClick={() => {
                                setSelectedProviderId(provId);
                                if (provId === 'ollama') {
                                  setCustomBaseUrl('http://localhost:11434/v1');
                                  setSelectedModel('llama3.2');
                                } else if (provId === 'lmstudio') {
                                  setCustomBaseUrl('http://localhost:1234/v1');
                                  setSelectedModel('local-model');
                                } else if (provId === 'custom') {
                                  if (!customBaseUrl) setCustomBaseUrl('http://localhost:8080/v1');
                                  if (!selectedModel || selectedModel === 'gemini-2.5-flash') setSelectedModel('local-model');
                                } else {
                                  setCustomBaseUrl('');
                                  setSelectedModel('gemini-2.5-flash');
                                }
                              }}
                              className={`p-2.5 text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? `${conf.borderClass} ${conf.bgClass} text-white font-bold ring-1 ring-editorial-accent`
                                  : 'bg-neutral-900/60 border-editorial-border/60 text-editorial-muted hover:text-white hover:border-editorial-border'
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-bold text-xs">{lang === 'en' ? conf.shortNameEn : conf.shortNamePl}</span>
                                <span className="text-[9.5px] text-editorial-muted truncate">
                                  {conf.isLocal 
                                    ? (lang === 'en' ? 'Local PC / Server ($0 / offline)' : 'Lokalny PC / Serwer (0 zł / offline)') 
                                    : (lang === 'en' ? 'Google AI Studio (Cloud API)' : 'Google AI Studio (Chmura API)')}
                                </span>
                              </div>
                              {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Provider Details & Explanation */}
                    <div className={`p-3 border text-xs font-mono space-y-2.5 transition-all ${effectiveProviderInfo.bgClass} ${effectiveProviderInfo.borderClass}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={13} className={effectiveProviderInfo.textClass} />
                          <span className="text-white font-bold uppercase text-[10.5px]">
                            {lang === 'en' ? effectiveProviderInfo.nameEn : effectiveProviderInfo.namePl}
                          </span>
                          <span className="text-[10px] text-editorial-muted">
                            {effectiveProviderInfo.requiresKey === false 
                              ? (lang === 'en' ? '• Local Engine (No Key Required)' : '• Silnik Lokalny (Bez Klucza)') 
                              : (lang === 'en' ? '• Requires API Key (Google AI Studio)' : '• Wymaga Klucza API (Google AI Studio)')}
                          </span>
                        </div>

                        {effectiveProviderInfo.prefix && (
                          <span className="text-[9.5px] text-editorial-muted">
                            Prefix: <code className="text-editorial-accent">{effectiveProviderInfo.prefix}</code>
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-sans text-editorial-text leading-relaxed">
                        {lang === 'en' ? effectiveProviderInfo.descriptionEn : effectiveProviderInfo.descriptionPl}
                      </p>

                      {/* HTTPS Mixed Content Guidance for Local PC Engines */}
                      {effectiveProviderInfo.isLocal && typeof window !== 'undefined' && window.location.protocol === 'https:' && (
                        <div className="p-2.5 bg-amber-950/40 border border-amber-600/60 text-amber-300 text-[10.5px] font-sans leading-relaxed space-y-1">
                          <div className="font-bold flex items-center gap-1.5 font-mono text-[11px] text-amber-200">
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>{lang === 'en' ? 'Running on GitHub Pages (HTTPS)' : 'Uruchomiono na GitHub Pages (HTTPS)'}</span>
                          </div>
                          <p>
                            {lang === 'en'
                              ? 'Browsers block direct connections from HTTPS sites to insecure local endpoints (http://localhost). Local engines work seamlessly when you clone the repo and run "npm run dev" locally (http://localhost:3000), or by using Google Gemini on GitHub Pages.'
                              : 'Przeglądarki blokują bezpośrednie zapytania ze stron HTTPS do lokalnego http://localhost (Mixed Content). Silniki lokalne działają w pełni po sklonowaniu repozytorium i uruchomieniu "npm run dev" (http://localhost:3000), lub przez darmowy klucz Google Gemini online.'}
                          </p>
                        </div>
                      )}

                      {/* Endpoint Base URL (for Local Custom Gateways / Ollama / LM Studio) */}
                      {effectiveProviderInfo.isLocal && (
                        <div className="pt-2 border-t border-editorial-border/40 space-y-1.5">
                          <label className="text-[10px] text-editorial-muted uppercase font-bold flex items-center justify-between">
                            <span>{lang === 'en' ? 'API Base URL / Endpoint:' : 'Adres Base URL / Endpoint:'}</span>
                            <span className="text-[9px] text-editorial-muted font-mono">
                              (np. http://localhost:11434/v1 lub http://localhost:1234/v1)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={customBaseUrl}
                            onChange={(e) => setCustomBaseUrl(e.target.value)}
                            placeholder="http://localhost:11434/v1"
                            className="w-full bg-neutral-900 border border-editorial-border px-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-editorial-accent"
                          />
                        </div>
                      )}

                      {/* Model Input - Direct type & name */}
                      <div className="pt-2 border-t border-editorial-border/40 space-y-1.5">
                        <label className="text-[10px] text-editorial-muted uppercase font-bold flex items-center justify-between">
                          <span>{lang === 'en' ? '2. Model Selection (Type & Name):' : '2. Wybór Modelu (Wpisz i Nazwij):'}</span>
                          <span className="text-[9px] text-editorial-muted font-mono lowercase">
                            {effectiveProviderInfo.id === 'custom' || effectiveProviderInfo.isLocal ? 'np. llama3.2, deepseek-r1:8b, local-model' : 'np. gemini-2.5-flash, gemini-2.5-pro'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={customModelInput || selectedModel || (effectiveProviderInfo.isLocal ? 'llama3.2' : 'gemini-2.5-flash')}
                          onChange={(e) => {
                            setSelectedModel(e.target.value);
                            setCustomModelInput(e.target.value);
                            setIsCustomModelMode(true);
                          }}
                          placeholder={effectiveProviderInfo.isLocal ? 'llama3.2' : 'gemini-2.5-flash'}
                          className="w-full bg-neutral-900 border border-editorial-border focus:border-editorial-accent px-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Key Input Field & Actions */}
                    <div className="space-y-2">
                      <label className="text-[10.5px] font-mono uppercase font-bold text-editorial-muted block">
                        {lang === 'en' ? '3. API Key (Not required for Local Ollama / LM Studio):' : '3. Klucz API (Opcjonalny dla modeli lokalnych Ollama / LM Studio):'}
                      </label>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="relative flex-1 min-w-[200px]">
                          <input
                            type={showKeySecret ? 'text' : 'password'}
                            id="custom_universal_api_key_input"
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder={
                              effectiveProviderInfo.requiresKey === false
                                ? (lang === 'en' ? 'Optional (Not needed for local engines)' : 'Opcjonalny (Brak wymogu dla silnika lokalnego)')
                                : (lang === 'en' ? effectiveProviderInfo.placeholderEn : effectiveProviderInfo.placeholderPl)
                            }
                            className="w-full bg-neutral-900 border border-editorial-border p-2 pr-9 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-editorial-accent"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeySecret(prev => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                            title={showKeySecret ? (lang === 'en' ? 'Hide key' : 'Ukryj klucz') : (lang === 'en' ? 'Show key' : 'Pokaż klucz')}
                          >
                            {showKeySecret ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>

                        <button
                          type="button"
                          id="btn_save_custom_api_key"
                          onClick={handleSaveApiKey}
                          className="px-3.5 py-2 bg-editorial-accent text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Save size={12} />
                          <span>{lang === 'en' ? 'Save Locally' : 'Zapisz Lokalnie'}</span>
                        </button>

                        {(localApiKey || customBaseUrl || selectedProviderId !== 'unknown') && (
                          <button
                            type="button"
                            id="btn_clear_custom_api_key"
                            onClick={handleClearApiKey}
                            className="px-3 py-2 bg-rose-950/70 border border-rose-800 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider hover:bg-rose-900 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                            title={lang === 'en' ? 'Clear AI settings from browser' : 'Usuń ustawienia AI z przeglądarki'}
                          >
                            <Trash2 size={12} />
                            <span>{lang === 'en' ? 'Reset' : 'Wyczyść'}</span>
                          </button>
                        )}
                      </div>

                      {/* Session-only checkbox option */}
                      <label className="flex items-center gap-2 text-[10px] font-mono text-editorial-muted cursor-pointer select-none pt-0.5">
                        <input
                          type="checkbox"
                          checked={sessionOnlyKey}
                          onChange={(e) => setSessionOnlyKey(e.target.checked)}
                          className="accent-editorial-accent"
                        />
                        <span>
                          {lang === 'en' 
                            ? 'Keep only for this active browser tab (sessionStorage, deleted upon close)' 
                            : 'Zapisz tylko na czas otwartej karty (sessionStorage, zniknie po zamknięciu przeglądarki)'}
                        </span>
                      </label>

                      {/* Feedback status badge */}
                      {keyStatusFeedback && (
                        <div className="p-2 bg-editorial-accent/15 border border-editorial-accent/60 text-editorial-accent font-mono text-[10px] flex items-center gap-2 animate-fadeIn">
                          <span>{keyStatusFeedback}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Provider Documentation & Resources */}
                    <div className="p-3 bg-neutral-900/60 border border-editorial-border/80 text-[11px] space-y-2 font-sans text-editorial-text">
                      <div className="font-bold text-white font-mono uppercase text-[10px] flex items-center gap-1.5">
                        <HelpCircle size={12} className="text-editorial-accent" />
                        <span>{lang === 'en' ? 'Official Documentation & Getting Started:' : 'Oficjalna Dokumentacja i Narzędzia:'}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[10.5px] font-mono">
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-900 border border-sky-500/40 text-sky-300 flex items-center justify-between gap-1 transition-all"
                        >
                          <span>🔵 {lang === 'en' ? 'Google AI Studio (Gemini)' : 'Google AI Studio (Gemini)'}</span>
                          <ExternalLink size={10} />
                        </a>
                        <a
                          href="https://ollama.com"
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-900 border border-teal-500/40 text-teal-300 flex items-center justify-between gap-1 transition-all"
                        >
                          <span>💻 {lang === 'en' ? 'Ollama (Local PC / 0$)' : 'Ollama (Lokalny PC / 0 zł)'}</span>
                          <ExternalLink size={10} />
                        </a>
                        <a
                          href="https://lmstudio.ai"
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-900 border border-cyan-500/40 text-cyan-300 flex items-center justify-between gap-1 transition-all"
                        >
                          <span>💻 {lang === 'en' ? 'LM Studio (Local GUI / 0$)' : 'LM Studio (Lokalny PC GUI)'}</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>

                      <p className="text-[10px] text-emerald-400/90 pt-1 font-mono flex items-center gap-1">
                        <CheckCircle size={11} className="shrink-0" />
                        <span>
                          {lang === 'en' 
                            ? '🔒 Zero-Server Storage: Your keys and local endpoints are stored purely in your browser memory and never transmitted to external analytics.'
                            : '🔒 100% Prywatności: Twoje klucze i adresy lokalne są zapisywane wyłącznie w pamięci przeglądarki.'}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Knowledge Sources & Context Inspector Bar */}
                <div className="bg-neutral-950/70 border border-editorial-border p-2.5 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-editorial-border/40 pb-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-editorial-accent uppercase tracking-wider">
                      <BookOpen size={12} className="text-editorial-accent" />
                      <span>{lang === 'en' ? 'AI Knowledge Sources & Context:' : 'Źródła wiedzy i kontekst asystenta:'}</span>
                    </div>

                    <button
                      type="button"
                      id="btn_toggle_context_inspector"
                      onClick={() => setShowContextInspector(prev => !prev)}
                      className="inline-flex items-center gap-1 text-[10px] font-mono text-editorial-muted hover:text-white bg-neutral-900 px-2 py-0.5 border border-editorial-border hover:border-editorial-accent transition-all cursor-pointer"
                    >
                      <Info size={10} />
                      <span>{showContextInspector 
                        ? (lang === 'en' ? 'Hide Injected Context' : 'Ukryj wstrzyknięty kontekst') 
                        : (lang === 'en' ? 'Inspect Injected Data' : '🔍 Zobacz skąd AI czerpie wiedzę')}</span>
                      {showContextInspector ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  </div>

                  {/* Active Data Source Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    {/* 1. Readme Source */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-editorial-border text-neutral-300">
                      <FileText size={10} className={sanitizedReadme ? "text-emerald-400" : "text-amber-400"} />
                      <span>README: {sanitizedReadme ? (lang === 'en' ? 'GitHub (Live)' : 'GitHub (Zsynchronizowany)') : (lang === 'en' ? 'None / Missing' : 'Brak')}</span>
                    </div>

                    {/* 2. Status */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-editorial-border text-neutral-300">
                      <Code size={10} className="text-cyan-400" />
                      <span>{lang === 'en' ? 'Access:' : 'Dostęp:'} {repo.isPrivate ? (lang === 'en' ? 'Private' : 'Prywatny') : (lang === 'en' ? 'Public Repo' : 'Repozytorium Publiczne')}</span>
                    </div>

                    {/* 3. Category & Domain Specs */}
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-900 border border-editorial-border text-neutral-300">
                      <Layers size={10} className="text-fuchsia-400" />
                      <span>{lang === 'en' ? 'Domain:' : 'Domena:'} {repo.cat?.map(c => c === 'ai' ? 'AI' : (c === 'kul' ? 'KUL' : (c.charAt(0).toUpperCase() + c.slice(1)))).join(', ') || 'Trackmania/PyPlanet'}</span>
                    </div>

                    {/* 4. Active Engine */}
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${
                      localApiKey 
                        ? savedProvider.badgeClass
                        : serverConfigStatus?.hasServerKey
                        ? 'bg-sky-950/50 border-sky-600/70 text-sky-300'
                        : 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                    }`}>
                      <Cpu size={10} className={localApiKey ? `${savedProvider.textClass} animate-pulse` : serverConfigStatus?.hasServerKey ? "text-sky-400 animate-pulse" : "text-amber-400"} />
                      <span>
                        {localApiKey 
                          ? `${lang === 'en' ? (savedProvider.nameEn || savedProvider.name) : (savedProvider.namePl || savedProvider.name)} • ${activeModel} (${lang === 'en' ? 'Custom Key' : 'Twój Klucz'})`
                          : serverConfigStatus?.hasServerKey
                          ? (lang === 'en' ? 'Google Gemini (Server)' : 'Google Gemini (Serwer)')
                          : (lang === 'en' ? 'Autonomic Knowledge Base (No Key Needed)' : 'Autonomiczna Baza Wiedzy (Bez Klucza)')}
                      </span>
                    </div>
                  </div>

                  {/* Expandable Deep Context Inspector */}
                  {showContextInspector && (
                    <div className="p-3 bg-neutral-900/90 border border-editorial-border space-y-2.5 text-xs animate-fadeIn font-sans">
                      <div className="text-[11px] text-white font-mono font-bold uppercase flex items-center justify-between border-b border-neutral-800 pb-1.5">
                        <span className="flex items-center gap-1.5 text-editorial-accent">
                          <Database size={12} />
                          {lang === 'en' ? 'Injected Context & Knowledge Sources' : 'Szczegóły wstrzykniętej wiedzy do asystenta'}
                        </span>
                        <span className="text-[9px] text-neutral-400">Context Length: {(sanitizedReadme || '').length} chars</span>
                      </div>

                      <p className="text-[11px] text-editorial-text leading-relaxed">
                        {lang === 'en' 
                          ? 'The assistant answers questions by synthesizing genuine repository metadata and documentation:'
                          : 'Asystent odpowiada na pytania, syntetyzując autentyczne metadane repozytorium i dokumentację:'}
                      </p>

                      <ul className="text-[11px] space-y-1 text-neutral-300 list-disc pl-4 font-mono">
                        <li><strong>{lang === 'en' ? 'Repository Target:' : 'Repozytorium:'}</strong> {repo.name} ({repo.lang || 'Code'})</li>
                        <li><strong>{lang === 'en' ? 'Visibility:' : 'Widoczność:'}</strong> {repo.isPrivate ? (lang === 'en' ? 'Private' : 'Prywatne') : (lang === 'en' ? 'Public' : 'Publiczne')}</li>
                        <li><strong>{lang === 'en' ? 'README Content:' : 'Plik README.md:'}</strong> {sanitizedReadme ? `${sanitizedReadme.slice(0, 160)}...` : (lang === 'en' ? 'No README found / Private' : 'Brak pliku README / Prywatne')}</li>
                        <li><strong>{lang === 'en' ? 'Fallback Engine:' : 'Silnik wiedzy bez klucza API:'}</strong> {lang === 'en' ? 'Deterministic technical knowledge engine capable of resolving installation, architecture, and command queries.' : 'Wbudowany deterministyczny silnik wiedzy technicznej wyjaśniający instalację, architekturę i komendy bez potrzeby podawania klucza API.'}</li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Quick Action Prompt Chips */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-editorial-muted uppercase tracking-wider font-bold">
                    {lang === 'en' ? '⚡ Quick Inquiries & AI Actions:' : '⚡ Szybkie zapytania i akcje AI:'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        label: lang === 'en' ? '✨ Generate Full Archival Summary' : '✨ Wygeneruj pełny opis archiwalny',
                        handler: () => handleGenerateArchivalSummaryInChat(),
                      },
                      {
                        label: lang === 'en' ? '⚡ What exactly does this plugin do?' : '⚡ Co dokładnie robi ten plugin / projekt?',
                        handler: () => handleSendChatMessage(lang === 'en' ? 'What exactly does this plugin do?' : 'Co dokładnie robi ten plugin / projekt?'),
                      },
                      {
                        label: lang === 'en' ? '📦 Installation & Setup guide' : '📦 Jak zainstalować i skonfigurować?',
                        handler: () => handleSendChatMessage(lang === 'en' ? 'How do I install and configure this plugin in the server?' : 'Jak zainstalować i skonfigurować ten plugin na serwerze gry?'),
                      },
                      {
                        label: lang === 'en' ? '⚙️ Architecture & Code logic' : '⚙️ Jaka jest architektura kodu i technologie?',
                        handler: () => handleSendChatMessage(lang === 'en' ? 'Explain the code architecture and core design patterns of this repository.' : 'Wyjaśnij architekturę kodu i kluczowe wzorce projektowe tego repozytorium.'),
                      },
                      {
                        label: lang === 'en' ? '🎮 Game & Command integration' : '🎮 Jakie są komendy i integracja z grą?',
                        handler: () => handleSendChatMessage(lang === 'en' ? 'What in-game commands and event hooks are registered by this plugin?' : 'Jakie komendy w grze i hooki eventowe rejestruje ten plugin?'),
                      },
                      {
                        label: lang === 'en' ? '🔑 API Key Guide' : '🔑 Instrukcja klucza API',
                        handler: () => handleShowApiKeyGuideInChat(),
                      },
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={item.handler}
                        disabled={isChatLoading}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border/80 hover:border-editorial-accent text-[10px] text-editorial-text hover:text-white rounded-none transition-all cursor-pointer disabled:opacity-50 text-left"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat conversation history window */}
                <div 
                  ref={chatMessagesContainerRef}
                  className="bg-neutral-950 border border-editorial-border p-3 sm:p-4 short:p-2 min-h-[160px] sm:min-h-[220px] short:min-h-[120px] max-h-[360px] short:max-h-[45dvh] overflow-y-auto space-y-3 sm:space-y-3.5 short:space-y-2 scrollbar-thin scrollbar-thumb-neutral-800"
                >
                  {chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`space-y-1 ${
                        msg.role === 'user'
                          ? 'border-l-2 border-editorial-accent pl-3 py-1 bg-editorial-accent/5'
                          : msg.role === 'system'
                          ? 'border-l-2 border-emerald-500/80 pl-3 py-1 bg-emerald-950/20'
                          : 'border-l-2 border-neutral-700 pl-3 py-1 bg-neutral-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] text-editorial-muted">
                        <span className="font-bold uppercase tracking-wider">
                          {msg.role === 'user' ? (lang === 'en' ? '> YOU' : '> TY') : msg.role === 'system' ? '⚡ SYSTEM' : '🤖 AI ASSISTANT'}
                        </span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="text-xs text-editorial-text leading-relaxed font-sans prose prose-invert max-w-none">
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <div className="mb-1.5 text-xs text-editorial-text leading-relaxed font-sans">{children}</div>,
                            code: ({ children, className }) => {
                              const isInline = !className;
                              return isInline ? (
                                <code translate="no" className="bg-neutral-900 text-editorial-accent font-mono text-[11px] px-1 py-0.5 border border-editorial-border notranslate">{children}</code>
                              ) : (
                                <pre className="bg-black p-2.5 border border-neutral-800 font-mono text-xs text-emerald-400 overflow-x-auto my-2 rounded-none">
                                  <code translate="no" className="notranslate">{children}</code>
                                </pre>
                              );
                            },
                            ul: ({ children }) => <ul className="my-1.5 space-y-1 list-disc pl-4 text-xs text-editorial-text font-sans">{children}</ul>,
                            li: ({ children }) => <li className="text-xs text-editorial-text font-sans">{children}</li>,
                            strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
                          }}
                        >
                          {msg.text}
                        </Markdown>
                      </div>
                    </div>
                  ))}

                  {/* Blinking loader indicator */}
                  {isChatLoading && (
                    <div className="flex items-center justify-between gap-2 text-editorial-accent text-xs p-2 bg-neutral-900 border border-editorial-border animate-pulse font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <Sparkles size={13} className="animate-spin shrink-0" />
                        <span className="truncate">&gt;&gt; [AI ANALYZING REPO CODE &amp; PREPARING RESPONSE...]</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStopChatAi}
                        className="px-2 py-0.5 bg-red-950 hover:bg-red-900 border border-red-500 hover:border-red-400 text-red-300 hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shrink-0 shadow-sm"
                        title={lang === 'en' ? 'Stop AI analysis' : 'Zatrzymaj odpowiedź AI'}
                      >
                        <Square size={10} className="fill-red-300" />
                        <span>{lang === 'en' ? 'Stop' : 'Zatrzymaj'}</span>
                      </button>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isChatLoading) {
                      handleStopChatAi();
                    } else {
                      handleSendChatMessage();
                    }
                  }}
                  className="flex items-center gap-2 bg-neutral-900 border border-editorial-border p-1.5 sm:p-2 shrink-0 mb-1 sm:mb-1.5 shadow-sm"
                >
                  <span className="text-editorial-accent pl-2 text-xs font-mono select-none">&gt;</span>
                  <input
                    type="text"
                    id="chat_repo_input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isChatLoading
                        ? (lang === 'en' ? "AI is generating... Click Stop to cancel." : "AI generuje odpowiedź... Kliknij Zatrzymaj, aby anulować.")
                        : (lang === 'en'
                            ? "Ask what this plugin does, how to configure it, etc..."
                            : "Zadaj pytanie co robi ten plugin, jak go skonfigurować...")
                    }
                    disabled={isChatLoading}
                    className="flex-1 bg-transparent border-none text-xs text-white placeholder-neutral-500 font-mono focus:outline-none px-2 py-1 disabled:opacity-60"
                  />
                  {isChatLoading ? (
                    <button
                      type="button"
                      onClick={handleStopChatAi}
                      className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
                      title={lang === 'en' ? 'Stop AI analysis' : 'Zatrzymaj odpowiedź AI'}
                    >
                      <Square size={11} className="fill-red-300" />
                      <span>{lang === 'en' ? 'Stop' : 'Zatrzymaj'}</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      id="chat_repo_submit_btn"
                      disabled={!chatInput.trim()}
                      className="px-3 py-1.5 bg-editorial-accent text-neutral-950 hover:brightness-110 disabled:opacity-40 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>{lang === 'en' ? 'Send' : 'Wyślij'}</span>
                      <Send size={12} />
                    </button>
                  )}
                </form>
              </div>
            )}
          </div>

          {/* Actions / Buttons Footer */}
          <div className="shrink-0 bg-editorial-sidebar-bg border-t border-editorial-border px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-wrap items-center justify-between gap-2.5 font-medium min-w-0 short:hidden">
            <div className="text-xs text-editorial-muted font-mono uppercase tracking-wider">
              {repo.isPrivate ? (
                lang === 'en' ? '🔒 Private Archive' : '🔒 Prywatne Archiwum'
              ) : (
                `★ ${repo.stars} ${lang === 'en' ? 'stargazers on GitHub' : 'gwiazdek na GitHubie'}`
              )}
            </div>

            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-none border border-editorial-accent text-editorial-accent hover:bg-editorial-accent/10 text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              <span>{lang === 'en' ? 'Open Archive' : 'Otwórz Repozytorium'}</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </motion.div>
        )}
      </motion.div>
      )
      )}
    </AnimatePresence>
  );
}
