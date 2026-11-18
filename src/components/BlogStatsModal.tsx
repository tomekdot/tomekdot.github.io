/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  FileText,
  Clock,
  Calendar,
  Tag,
  Sparkles,
  BookOpen,
  GitCompare,
  Copy,
  Check,
  Send,
  Bot,
  Terminal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Layers,
  CheckCircle2,
  ListFilter,
  Newspaper,
  Key,
  Cpu,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ExternalLink,
  HelpCircle,
  CheckCircle,
  Info,
  Database,
  Square,
  Star
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChatMessageView from './ChatMessageView';
import { BlogPost } from '../types';
import { BLOG_POSTS as FALLBACK_BLOG_POSTS, calculateReadingTime } from '../data';
import {
  getLocalAIKey,
  getLocalAIModel,
  getLocalAIBaseUrl,
  getLocalAIProvider,
  setLocalAIKey,
  clearLocalAIKey,
  detectAIProvider,
  getSessionTokenLimit,
  setSessionTokenLimit,
  getMaxOutputTokens,
  setMaxOutputTokens,
  getSessionTokensUsed,
  addSessionTokensUsed,
  resetSessionTokensUsed,
  isSessionQuotaExhausted,
  getSavedQuotaStatus,
  setSavedQuotaStatus,
  QuotaCheckStatus,
  PROVIDERS_CONFIG,
  AIProviderId,
  AIProviderInfo
} from '../lib/apiKeyStorage';
import { handleClientSideBlogAiFallback, validateAiKeyLive, localizeQuotaCheckStatus, streamAiChat, StreamAiError, TokenUsage, HAS_BACKEND } from '../lib/clientAi';

interface BlogStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogPosts?: BlogPost[];
  lang: 'en' | 'pl';
  onSelectBlogPost?: (post: BlogPost) => void;
  onOpenGalaxyGraph?: (tag: string) => void;
  initialPostId?: string | null;
  initialTab?: 'synthesis' | 'analytics' | 'interactive_chat';
  initialVersionMode?: 'v2_ai' | 'v1_draft' | 'diff';
  initialPrompt?: string | null;
  openRequestKey?: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  provider?: string;
  usage?: TokenUsage;
}

export default function BlogStatsModal({
  isOpen,
  onClose,
  blogPosts,
  lang,
  onSelectBlogPost,
  onOpenGalaxyGraph,
  initialPostId,
  initialTab,
  initialVersionMode,
  initialPrompt,
  openRequestKey = 0
}: BlogStatsModalProps) {
  const [activeTab, setActiveTab] = useState<'synthesis' | 'analytics' | 'interactive_chat'>(initialTab || 'synthesis');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPostId, setSelectedPostId] = useState<string>(initialPostId || '1');
  const [versionMode, setVersionMode] = useState<'v2_ai' | 'v1_draft' | 'diff'>(initialVersionMode || 'v2_ai');
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');
  const [showArticleSearchInput, setShowArticleSearchInput] = useState<boolean>(false);
  const [isAiNoteExpanded, setIsAiNoteExpanded] = useState<boolean>(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const chatSliderRef = useRef<HTMLDivElement>(null);

  const handleScrollSlider = (direction: 'left' | 'right', isChat = false) => {
    const targetRef = isChat ? chatSliderRef : sliderRef;
    if (targetRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      targetRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [selectedArticleText, setSelectedArticleText] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingInitialPromptRef = useRef<string | null>(null);
  const handleSendMessageRef = useRef<((customPrompt?: string) => void) | null>(null);

  // Auto-grow chat textarea proportionally so long pastes never crush the chat stream
  useEffect(() => {
    const resize = () => {
      const el = chatTextareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const isShortViewport = vh <= 539;
      const minHeight = isShortViewport ? 34 : 40;
      const maxHeight = isShortViewport
        ? Math.max(64, Math.min(88, Math.floor(vh * 0.19)))
        : Math.max(88, Math.min(128, Math.floor(vh * 0.17)));
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight));
      el.style.height = `${nextHeight}px`;
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [inputQuery, activeTab, isOpen]);

  const handleArticleSelectionCheck = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection()?.toString().trim() || '';
    if (sel && sel.length >= 8) {
      setSelectedArticleText(sel.slice(0, 800));
    }
  };

  // Sync targeted open props (article, tab, diff/version mode, initial prompt) when opened
  useEffect(() => {
    if (!isOpen) return;
    if (initialPostId) setSelectedPostId(initialPostId);
    if (initialTab) setActiveTab(initialTab);
    if (initialVersionMode) setVersionMode(initialVersionMode);
    if (initialPrompt && initialPrompt.trim()) {
      pendingInitialPromptRef.current = initialPrompt.trim();
    }
  }, [isOpen, openRequestKey, initialPostId, initialTab, initialVersionMode, initialPrompt]);

  // Reset scroll on tab change or modal open
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [activeTab, isOpen]);

  // Stop AI Generation / Analysis
  const handleStopAi = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAiThinking(false);
    setChatMessages(prev => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: lang === 'en' 
          ? '⏹️ _[AI analysis stopped by user]_' 
          : '⏹️ _[Analiza AI zatrzymana przez użytkownika]_',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // AI Configuration State (Google Gemini & Local PC Engines)
  const [showApiKeyConfig, setShowApiKeyConfig] = useState<boolean>(false);
  const [selectedProviderId, setSelectedProviderId] = useState<AIProviderId>('unknown');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKeySecret, setShowKeySecret] = useState<boolean>(false);
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [isCustomModelMode, setIsCustomModelMode] = useState<boolean>(false);
  const [sessionOnlyKey, setSessionOnlyKey] = useState<boolean>(false);
  const [keyStatusFeedback, setKeyStatusFeedback] = useState<string | null>(null);
  const [serverHasKey, setServerHasKey] = useState<boolean>(false);
  const [quotaCheckStatus, setQuotaCheckStatus] = useState<QuotaCheckStatus | null>(() => getSavedQuotaStatus());
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(false);
  const [sessionTokenLimitInput, setSessionTokenLimitInput] = useState<string>(() => {
    const val = getSessionTokenLimit();
    return val ? String(val) : '';
  });
  const [maxOutputTokensInput, setMaxOutputTokensInput] = useState<string>(() => {
    const val = getMaxOutputTokens();
    return val ? String(val) : '';
  });
  const [tokensUsedSession, setTokensUsedSession] = useState<number>(() => getSessionTokensUsed());

  // Read stored keys & preferences
  const localApiKey = getLocalAIKey();
  const activeModel = getLocalAIModel();
  const savedProvider: AIProviderInfo = useMemo(() => {
    const pId = getLocalAIProvider();
    if (pId && PROVIDERS_CONFIG[pId]) return PROVIDERS_CONFIG[pId];
    return detectAIProvider(localApiKey);
  }, [localApiKey]);

  // Compute effective provider
  const effectiveProviderInfo: AIProviderInfo = useMemo(() => {
    if (selectedProviderId !== 'unknown' && PROVIDERS_CONFIG[selectedProviderId]) {
      return PROVIDERS_CONFIG[selectedProviderId];
    }
    return savedProvider;
  }, [selectedProviderId, savedProvider]);

  // Initialize & sync stored AI config on open (so clearing/exiting paid mode in another modal syncs cleanly)
  useEffect(() => {
    if (isOpen) {
      const storedKey = getLocalAIKey();
      const storedModel = getLocalAIModel();
      const storedBaseUrl = getLocalAIBaseUrl();
      const storedProvider = getLocalAIProvider();

      setApiKeyInput(storedKey || '');
      setCustomBaseUrl(storedBaseUrl || '');
      setSelectedProviderId(storedProvider && PROVIDERS_CONFIG[storedProvider] ? storedProvider : 'unknown');
      setSelectedModel(storedModel || '');
      setIsCustomModelMode(false);
      setCustomModelInput('');
      setTokensUsedSession(getSessionTokensUsed());
      setSessionTokenLimitInput(() => {
        const val = getSessionTokenLimit();
        return val ? String(val) : '';
      });
      setMaxOutputTokensInput(() => {
        const val = getMaxOutputTokens();
        return val ? String(val) : '';
      });
      if (HAS_BACKEND) {
        fetch('/api/ai/config-status')
          .then(r => r.json())
          .then(d => setServerHasKey(Boolean(d.hasServerKey)))
          .catch(() => {});
      }
    }
  }, [isOpen]);

  // Auto scroll chat
  useEffect(() => {
    if (activeTab === 'interactive_chat' && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isAiThinking, activeTab]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const postsList = useMemo(() => {
    return blogPosts && blogPosts.length > 0 ? blogPosts : FALLBACK_BLOG_POSTS;
  }, [blogPosts]);

  const selectedPost = useMemo(() => {
    return postsList.find(p => p.id === selectedPostId) || postsList[0];
  }, [postsList, selectedPostId]);

  // Compute Blog Metrics (used by index tab and footer)
  const metrics = useMemo(() => {
    const totalPosts = postsList.length;
    const allTags = Array.from(new Set(postsList.flatMap(p => p.tags)));
    return {
      totalPosts,
      allTags,
    };
  }, [postsList]);

  // Filtered posts based on tag and search query
  const filteredPosts = useMemo(() => {
    let posts = postsList;
    if (selectedTag !== 'all') {
      posts = posts.filter(p => p.tags.includes(selectedTag));
    }
    if (articleSearchQuery.trim()) {
      const q = articleSearchQuery.toLowerCase().trim();
      posts = posts.filter(p => {
        const title = (lang === 'en' ? p.titleEn : p.titlePl).toLowerCase();
        const excerpt = (lang === 'en' ? p.excerptEn : p.excerptPl).toLowerCase();
        return title.includes(q) || excerpt.includes(q) || p.tags.some(t => t.toLowerCase().includes(q)) || p.id.includes(q);
      });
    }
    return posts;
  }, [postsList, selectedTag, articleSearchQuery, lang]);

  // Keep active post visible in slider
  useEffect(() => {
    if (sliderRef.current) {
      const activeEl = sliderRef.current.querySelector(`[data-article-id="${selectedPostId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
    if (chatSliderRef.current) {
      const activeEl = chatSliderRef.current.querySelector(`[data-chat-article-id="${selectedPostId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedPostId, activeTab]);

  // Initialize chat when post changes or lang switches, and trigger queued initial prompt if present
  useEffect(() => {
    if (!selectedPost) return;
    const initialText = lang === 'en'
      ? `⚡ **DEV LOG AI ASSISTANT & PEER REVIEWER** // Article: **${selectedPost.titleEn}**\n\nDebate any claim if you disagree, inspect what was added in **v2.0** vs the **v1.0 Raw Draft**, check code snippets, or paste a hard-to-read section for a clear breakdown!`
      : `⚡ **ASYSTENT AI DZIENNIKA & RECENZENT** // Wpis: **${selectedPost.titlePl}**\n\nMożesz tu polemizować z artykułem (gdy się nie zgadzasz), sprawdzić co dopisano w **v2.0** względem surowego szkicu **v1.0 Raw**, ocenić kod lub uprościć trudny fragment!`;

    setChatMessages([
      {
        id: 'init',
        sender: 'assistant',
        text: initialText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (isOpen && pendingInitialPromptRef.current) {
      const queued = pendingInitialPromptRef.current;
      pendingInitialPromptRef.current = null;
      const timer = setTimeout(() => {
        handleSendMessageRef.current?.(queued);
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [selectedPostId, lang, selectedPost, isOpen]);

  // Check API Key & Quota live
  const handleCheckApiKeyQuota = async (overrideKey?: string, overrideProv?: AIProviderId, overrideModel?: string, overrideUrl?: string) => {
    setIsCheckingKey(true);
    try {
      const keyToCheck = overrideKey !== undefined ? overrideKey.trim() : (apiKeyInput.trim() || getLocalAIKey());
      const provToCheck = overrideProv || (selectedProviderId !== 'unknown' ? selectedProviderId : detectAIProvider(keyToCheck).id);
      const modelToCheck = overrideModel || ((isCustomModelMode && customModelInput.trim()) ? customModelInput.trim() : (selectedModel || 'gemini-3.1-flash-lite'));
      const urlToCheck = overrideUrl !== undefined ? overrideUrl : customBaseUrl.trim();

      const result = await validateAiKeyLive({
        apiKey: keyToCheck,
        provider: provToCheck,
        model: modelToCheck,
        baseUrl: urlToCheck,
        siteLang: lang,
      });
      setQuotaCheckStatus(result);
      return result;
    } finally {
      setIsCheckingKey(false);
    }
  };

  // Save AI API Key & Engine settings
  const handleSaveApiKey = async () => {
    const trimmedKey = apiKeyInput.trim();
    let targetProviderId: AIProviderId = selectedProviderId;

    if (targetProviderId === 'unknown' || !targetProviderId) {
      if (trimmedKey) {
        const detected = detectAIProvider(trimmedKey);
        targetProviderId = detected.id;
      } else {
        targetProviderId = 'gemini';
      }
    }

    const parsedLimit = sessionTokenLimitInput.trim() ? Number(sessionTokenLimitInput.trim()) : null;
    setSessionTokenLimit(parsedLimit && parsedLimit > 0 ? parsedLimit : null);
    const parsedMaxOut = maxOutputTokensInput.trim() ? Number(maxOutputTokensInput.trim()) : null;
    setMaxOutputTokens(parsedMaxOut && parsedMaxOut > 0 ? parsedMaxOut : null);

    const provInfo = PROVIDERS_CONFIG[targetProviderId] || PROVIDERS_CONFIG.gemini;
    const finalModel = (isCustomModelMode && customModelInput.trim())
      ? customModelInput.trim()
      : (selectedModel || provInfo.defaultModel);

    const finalBaseUrl = customBaseUrl.trim() || provInfo.defaultBaseUrl || '';

    setLocalAIKey(trimmedKey, sessionOnlyKey, finalModel, targetProviderId, finalBaseUrl);

    setKeyStatusFeedback(
      lang === 'en'
        ? `✓ Saved ${provInfo.nameEn} (${finalModel}). Checking key & quota...`
        : `✓ Zapisano ${provInfo.namePl} (${finalModel}). Sprawdzam klucz i limity...`
    );

    const check = await handleCheckApiKeyQuota(trimmedKey, targetProviderId, finalModel, finalBaseUrl);
    if (check?.valid) {
      setKeyStatusFeedback(`✓ ${check.message}`);
    } else if (check) {
      setKeyStatusFeedback(`⚠️ ${check.message}`);
    }

    setTimeout(() => {
      setKeyStatusFeedback(null);
    }, 5500);
  };

  // Clear AI API Key & reset settings
  const handleClearApiKey = () => {
    clearLocalAIKey();
    setApiKeyInput('');
    setCustomBaseUrl('');
    setSelectedModel('');
    setCustomModelInput('');
    setSelectedProviderId('unknown');
    setIsCustomModelMode(false);
    setQuotaCheckStatus(null);
    setSavedQuotaStatus(null);
    setKeyStatusFeedback(
      lang === 'en' ? '✓ AI configuration cleared.' : '✓ Zresetowano konfigurację AI.'
    );
    setTimeout(() => setKeyStatusFeedback(null), 1800);
  };

  // Active post content & notes dynamically computed with respect to language
  const activeAiNote = selectedPost
    ? (lang === 'en' ? (selectedPost.aiVersionNoteEn || selectedPost.aiVersionNote) : (selectedPost.aiVersionNotePl || selectedPost.aiVersionNote))
    : undefined;

  const rawDraftContent = selectedPost
    ? (lang === 'en'
        ? (selectedPost.draftVersionContentEn || selectedPost.draftVersionContent || selectedPost.excerptEn)
        : (selectedPost.draftVersionContentPl || selectedPost.draftVersionContent || selectedPost.excerptPl))
    : '';
  const activeDraftContent = rawDraftContent.replace(/file:\/\/\/[^\s\)"']*/gi, '#').replace(/file:\/\/[^\s\)"']*/gi, '#');

  const rawV2Content = selectedPost
    ? (lang === 'en' ? selectedPost.contentEn : selectedPost.contentPl)
    : '';
  const activeV2Content = rawV2Content.replace(/file:\/\/\/[^\s\)"']*/gi, '#').replace(/file:\/\/[^\s\)"']*/gi, '#');

  // Copy synthesis / content
  const handleCopy = () => {
    if (!selectedPost) return;
    const textToCopy = versionMode === 'v1_draft' 
      ? activeDraftContent 
      : activeV2Content;

    navigator.clipboard.writeText(textToCopy);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  // Launch AI Chat directly from Synthesis / Diff tab with targeted prompt
  const handleDiscussInChat = (overridePrompt?: string) => {
    if (!selectedPost) return;
    const pTitle = lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl;
    const prompt = overridePrompt || (
      versionMode === 'diff'
        ? (lang === 'en'
            ? `Compare v1.0 Raw Draft vs v2.0 AI for "${pTitle}". Show exactly what existed in Raw v1.0, what was added/extrapolated only in v2.0 (including code or metrics), and where you see technical gaps to improve.`
            : `Porównaj surowy szkic v1.0 Raw z wersją v2.0 dla "${pTitle}". Wskaż dokładnie, co było w oryginalnym Raw v1.0, co zostało dopisane lub rozszerzone dopiero w v2.0 (w tym kod i liczby) oraz co warto poprawić.`)
        : versionMode === 'v1_draft'
          ? (lang === 'en'
              ? `Discuss the v1.0 raw draft of article #${selectedPost.id}: "${pTitle}". What ideas should be expanded, challenged, or refined?`
              : `Przedyskutujmy surowy szkic v1.0 artykułu #${selectedPost.id}: "${pTitle}". Jakie pomysły warto rozwinąć, zakwestionować lub doprecyzować?`)
          : (lang === 'en'
              ? `Critically analyze article #${selectedPost.id}: "${pTitle}". State what you agree with, what you disagree with or consider oversimplified/risky (including code snippets & timing claims), and what should be improved.`
              : `Przeanalizuj krytycznie artykuł #${selectedPost.id}: "${pTitle}". Napisz z czym się zgadzasz, z czym polemizujesz lub co jest zbyt uproszczone/ryzykowne (w tym fragmenty kodu i liczby) oraz co warto poprawić.`)
    );

    setActiveTab('interactive_chat');
    setTimeout(() => {
      handleSendMessage(prompt);
    }, 100);
  };

  // Instant Offline API Key Guide
  const handleShowApiKeyGuideInBlog = () => {
    setShowApiKeyConfig(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const guideMsg = lang === 'en'
      ? `### 🔑 **Quick Guide: How to Get a Free Google Gemini API Key**\n\nGoogle provides free API keys for developers to access Gemini Flash (Latest) and Gemini Pro models:\n\n1. **Open Google AI Studio**: Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n2. **Sign In**: Log in using your Google / Gmail account.\n3. **Create Key**: Click the blue **"Create API key"** button and select a project.\n4. **Copy Key**: Copy your generated key (starts with \`AIzaSy...\`).\n5. **Paste & Save**: Paste your key into the **"API Key"** field in the setup box above, then click **"Save Locally"**.\n\n---\n💡 **Local PC Models (100% Offline / No Key Needed)**\nIf you prefer running models locally without cloud accounts, switch the engine above to **"Local PC / Server"** and point to your local Ollama or LM Studio endpoint (\`http://localhost:11434/v1\`).`
      : `### 🔑 **Szybki Przewodnik: Jak bezpłatnie uzyskać klucz API Google Gemini**\n\nGoogle udostępnia bezpłatne klucze API dla deweloperów z dostępem do modeli Gemini Flash (Latest) i Gemini Pro:\n\n1. **Otwórz Google AI Studio**: Wejdź na [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n2. **Zaloguj się**: Użyj swojego konta Google / Gmail.\n3. **Utwórz klucz**: Kliknij niebieski przycisk **"Create API key"** i wybierz projekt.\n4. **Skopiuj klucz**: Skopiuj wygenerowany klucz (zaczyna się od \`AIzaSy...\`).\n5. **Wklej i zapisz**: Wklej klucz w pole **"Klucz API"** w panelu powyżej i kliknij **"Zapisz lokalnie"**.\n\n---\n💡 **Lokalne Modele PC (100% Offline / Bez Klucza)**\nMożesz też przełączyć silnik powyżej na **"Lokalny PC (Ollama / LM Studio)"** i połączyć się z lokalną instancją (\`http://localhost:11434/v1\`) bez potrzeby posiadania żadnego klucza chmurowego.`;

    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text: lang === 'en' ? '🔑 API Key Guide' : '🔑 Instrukcja klucza API',
        timestamp: timeStr,
      },
      {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: guideMsg,
        timestamp: timeStr,
      }
    ]);
  };

  // Handle Chat Input Submission
  const handleSendMessage = async (customPrompt?: string) => {
    const query = (customPrompt || inputQuery).trim();
    if (!query || isAiThinking || !selectedPost) return;

    const qLower = query.toLowerCase().trim();
    const isExplicitGuidePreset = query === '🔑 API Key Guide' || query === '🔑 Instrukcja klucza API';
    const isExplicitGuideQuestion = /^(jak\s*(uzyskać|zdobyć|wygenerować|pobrać|znaleźć)\s*klucz|skąd\s*(wziąć|pobrać)\s*klucz|how\s*to\s*(get|obtain|find|generate)\s*(an?\s*)?api\s*key)/i.test(qLower);

    if (isExplicitGuidePreset || isExplicitGuideQuestion) {
      handleShowApiKeyGuideInBlog();
      if (!customPrompt) setInputQuery('');
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputQuery('');
    setIsAiThinking(true);

    const activeKey = getLocalAIKey() || apiKeyInput.trim();
    const activeModelChoice = (isCustomModelMode && customModelInput.trim())
      ? customModelInput.trim()
      : (selectedModel || getLocalAIModel() || effectiveProviderInfo.defaultModel);
    const activeProviderChoice = (selectedProviderId !== 'unknown' ? selectedProviderId : getLocalAIProvider()) || effectiveProviderInfo.id;
    const activeBaseUrlChoice = customBaseUrl.trim() || getLocalAIBaseUrl();
    const maxOutputTokens = getMaxOutputTokens();

    const isLocalEngine = activeProviderChoice === 'ollama' || activeProviderChoice === 'lmstudio' || effectiveProviderInfo.requiresKey === false;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const runBlogFallback = async () => {
      try {
        const fallback = await handleClientSideBlogAiFallback({
          query,
          postId: selectedPost.id,
          postTitle: lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl,
          postExcerpt: lang === 'en' ? selectedPost.excerptEn : selectedPost.excerptPl,
          postContent: lang === 'en' ? selectedPost.contentEn : selectedPost.contentPl,
          versionMode,
          draftContent: activeDraftContent,
          aiRevisionNote: activeAiNote,
          tags: selectedPost.tags,
          lang,
          signal: controller.signal
        });
        setTokensUsedSession(getSessionTokensUsed());
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: fallback.reply,
            timestamp: replyTime,
            provider: fallback.provider,
            usage: fallback.usage,
          }
        ]);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: lang === 'en'
              ? `⚠️ **Error:** ${err.message || 'Could not retrieve response from AI model.'}`
              : `⚠️ **Błąd:** ${err.message || 'Nie udało się pobrać odpowiedzi od modelu AI.'}`,
            timestamp: replyTime
          }
        ]);
      } finally {
        setIsAiThinking(false);
        abortControllerRef.current = null;
      }
    };

    if (!HAS_BACKEND || isSessionQuotaExhausted() || (!isLocalEngine && !activeKey && !serverHasKey)) {
      await runBlogFallback();
      return;
    }

    const streamMsgId = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const v2Text = String(activeV2Content || '').slice(0, 6500);
    const v1DraftText = String(activeDraftContent || '').slice(0, 3000);

    const systemInstruction = `You are tomekdot Dev Journal AI Assistant & Critical Engineering Peer Reviewer.
Article #${selectedPost.id}: "${lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl}" (Tags: ${selectedPost.tags.join(', ')})
Excerpt: ${lang === 'en' ? selectedPost.excerptEn : selectedPost.excerptPl}
${activeAiNote ? `AI Revision Note (v1.0 -> v2.0): ${activeAiNote}` : ''}

=== v1.0 RAW DEVELOPER DRAFT (ORIGINAL AUTHOR NOTES) ===
${v1DraftText || '(No separate v1.0 raw draft)'}

=== v2.0 FULL ARTICLE (SYNTHESIZED / EXPANDED VERSION) ===
${v2Text || '(No v2.0 content)'}

Instructions:
- Reply naturally, honestly, concisely, and critically in ${lang === 'en' ? 'English' : 'Polish'} using clear Markdown.
- FORMATTING & READABILITY (ANTI-BLOAT):
  * BE CONCISE, SCANNABLE, AND DIRECT. Do NOT generate overwhelming walls of text.
  * Use 2-3 short paragraphs or bullet points per topic (max 2-3 sentences each).
  * Structure code snippets concisely (max 8-15 lines) with explicit language tags.
  * If the user sends a greeting (e.g. "czesc", "hello"), reply with a brief 1-2 sentence greeting and 3 quick bulleted questions or topics they can explore about this article.
- PASTED TEXT & SELECTED PASSAGE ANALYSIS:
  * When the user submits or pastes custom text, an external article fragment, or a specific passage to analyze (whether from this article, another plugin like Event Calendar, or pasted directly):
    Accept it directly and make that submitted text the central subject of critical engineering debate!
- When debating or critiquing an article or pasted text, organize directly into 3 clear sections:
  1. ⚖️ **Co się broni (Solid aspects)**: 1-2 points.
  2. ⚠️ **Z czym polemizować / Wątpliwości techniczne**: 2-3 konkretne uwagi (np. race condition, brak transakcji, blokujące IO, brak obsługi limitów API lub błędów sieci, uproszczenia w kodzie).
  3. 🛠️ **Konkretne ulepszenia / Co poprawić**: 2-3 zwięzłe punkty lub krótki snippet.
- When asked what was added/changed in v2.0 vs v1.0 Raw, compare both texts transparently: explicitly list what appears verbatim in v1.0 Raw vs what paragraphs, code snippets, or metrics were synthesized/added only in v2.0.`;

    const priorHistory = chatMessages
      .filter(m => m.id !== 'init' && !m.provider?.includes('ERROR'))
      .slice(-10)
      .map(m => ({
        role: m.sender === 'assistant' ? ('model' as const) : ('user' as const),
        content: m.text,
      }));

    try {
      const streamResult = await streamAiChat({
        messages: [...priorHistory, { role: 'user' as const, content: query }],
        systemInstruction,
        provider: activeProviderChoice,
        model: activeModelChoice,
        apiKey: activeKey,
        baseUrl: activeBaseUrlChoice,
        maxOutputTokens,
        siteLang: lang,
        signal: controller.signal,
        timeoutMs: 22000,
        onChunk: (fullText, _delta, meta) => {
          const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const provTag = meta?.endpointMode === 'vertex'
            ? `GOOGLE VERTEX AQ. (${(meta?.model || activeModelChoice || 'GEMINI-3.1-FLASH-LITE').toUpperCase()})`
            : `GOOGLE GEMINI (${(meta?.model || activeModelChoice || 'GEMINI-3.1-FLASH-LITE').toUpperCase()})`;

          setChatMessages(prev => {
            const exists = prev.some(m => m.id === streamMsgId);
            if (!exists) {
              return [
                ...prev,
                {
                  id: streamMsgId,
                  sender: 'assistant',
                  text: fullText,
                  timestamp: ts,
                  provider: provTag,
                },
              ];
            }
            return prev.map(m =>
              m.id === streamMsgId
                ? { ...m, text: fullText, provider: provTag }
                : m
            );
          });
        },
      });

      const finalText = streamResult.text?.trim();
      if (!finalText) {
        await runBlogFallback();
        return;
      }

      setTokensUsedSession(getSessionTokensUsed());
      setQuotaCheckStatus(prev => {
        const isVertex = streamResult.endpointMode === 'vertex' || /^AQ\./i.test(activeKey);
        const resolved = streamResult.model || activeModelChoice;
        const normalizedEndpoint: 'vertex' | 'studio' | undefined =
          streamResult.endpointMode === 'vertex'
            ? 'vertex'
            : streamResult.endpointMode === 'studio'
              ? 'studio'
              : prev?.endpointMode;
        const nextStatus: QuotaCheckStatus = {
          ...(prev || { valid: true, status: 'ok' }),
          valid: true,
          status: 'ok',
          lang: undefined,
          keyType: normalizedEndpoint === 'vertex' ? 'vertex_express' : 'ai_studio',
          endpointMode: normalizedEndpoint,
          providerLabel: streamResult.provider || prev?.providerLabel,
          resolvedModel: resolved,
          testTokensUsed: streamResult.usage?.totalTokens ?? prev?.testTokensUsed,
          quotaInfo: prev?.quotaInfo || (isVertex ? {
            tier: 'Vertex AI Express / Google Cloud',
            rpm: lang === 'en' ? 'Dynamic / Express Tier (GCP project dependent)' : 'Dynamiczny / Express Tier (zależny od projektu GCP)',
            tpm: lang === 'en' ? 'Per GCP Vertex AI project quota (e.g. 1M+ TPM)' : 'Wg kwoty Vertex AI projektu (np. 1M+ TPM)',
            rpd: lang === 'en' ? 'Per Vertex AI Express credits / quota' : 'Wg kredytów / limitu Vertex AI Express',
          } : {
            tier: 'Google AI Studio (Gemini API)',
            rpm: lang === 'en' ? '15 RPM (Free) / up to 2,000 RPM (Tier 1+)' : '15 RPM (Free) / do 2 000 RPM (Tier 1+)',
            tpm: lang === 'en' ? '250,000 – 1,000,000 tokens / min' : '250 000 – 1 000 000 tokenów / min',
            rpd: lang === 'en' ? '1,500 req/day (Free) / unlimited on Tier 1' : '1 500 zap./dzień (Free) / brak limitu w Tier 1',
          }),
        };
        const localized = localizeQuotaCheckStatus(nextStatus, lang) || nextStatus;
        setSavedQuotaStatus(localized);
        return localized;
      });

      const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => {
        const exists = prev.some(m => m.id === streamMsgId);
        if (exists) {
          return prev.map(m =>
            m.id === streamMsgId
              ? {
                  ...m,
                  text: finalText,
                  timestamp: ts,
                  provider: streamResult.provider || m.provider || 'GOOGLE GEMINI',
                  usage: streamResult.usage,
                }
              : m
          );
        }
        return [
          ...prev,
          {
            id: streamMsgId,
            sender: 'assistant',
            text: finalText,
            timestamp: ts,
            provider: streamResult.provider || 'GOOGLE GEMINI',
            usage: streamResult.usage,
          },
        ];
      });
    } catch (err: any) {
      if (err?.name === 'AbortError' && controller.signal.aborted) {
        return;
      }

      if (err instanceof StreamAiError) {
        if (err.quotaExhausted || err.code === 429) {
          setSavedQuotaStatus({
            valid: false,
            status: 'quota_exhausted',
            message: err.message,
            hint: err.hint,
            checkedAt: new Date().toISOString(),
          });
          await runBlogFallback();
          return;
        }
        if ((err.invalidKey || err.code === 401 || err.code === 403 || err.code === 400) && !err.missingKey) {
          setChatMessages(prev => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              sender: 'assistant',
              text: `⚠️ **${lang === 'en' ? 'API Key Error' : 'Błąd Klucza API'} (${err.code}):** ${err.message || 'Invalid API key.'}\n\n${err.hint ? `💡 *${err.hint}*` : ''}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              provider: `GEMINI ERROR (${err.code})`,
            },
          ]);
          return;
        }
      }

      await runBlogFallback();
    } finally {
      abortControllerRef.current = null;
      setIsAiThinking(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="blog_stats_modal_wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="modal-portal-viewport z-50 flex items-center justify-center p-0 desk:p-4 md:desk:p-6 overflow-hidden overscroll-contain"
        >
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/80 touch-none overscroll-none"
          />

          {/* Modal Window Container: Fullscreen on mobile portrait & rotated landscape, centered window on desk+ */}
          <motion.div
            key="blog_stats_modal"
            id="blog_stats_modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="relative z-10 bg-editorial-bg border-0 desk:border-2 desk:border-editorial-border w-full h-full max-h-[100dvh] desk:w-[92vw] md:desk:w-[88vw] max-w-3xl lg:max-w-4xl desk:h-[90dvh] desk:max-h-[min(820px,calc(100dvh-2rem))] rounded-none shadow-2xl flex flex-col overflow-hidden desk:my-auto min-w-0 font-mono text-xs select-text"
          >
          {/* Pull-down bar shown only on desk+ */}
          <div 
            className="hidden desk:flex w-full items-center justify-center pt-1.5 pb-1 bg-editorial-sidebar-bg cursor-pointer select-none shrink-0 group border-b border-editorial-border/30 touch-none"
            onClick={onClose}
            title={lang === 'en' ? 'Close window' : 'Zamknij okno'}
          >
            <div className="w-10 h-1 rounded-full bg-neutral-600 group-hover:bg-fuchsia-400 transition-colors" />
          </div>

          {/* Header */}
          <div className="shrink-0 px-3.5 sm:px-5 desk:px-6 py-2.5 land:py-1.5 desk:py-2.5 border-b border-editorial-border bg-editorial-sidebar-bg flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-1.5 land:p-1 desk:p-2 bg-[#1A1128] border border-fuchsia-500/50 text-fuchsia-400 shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="hidden desk:flex items-center gap-1.5 text-[9.5px] uppercase text-editorial-muted tracking-wider truncate">
                  <span className="text-fuchsia-400 font-bold shrink-0">@tomekdot Dev Log</span>
                  <span>·</span>
                  <span className="truncate">{lang === 'en' ? 'Journal & AI Inspector' : 'Dziennik & Inspektor AI'}</span>
                </div>
                <h2 className="text-xs sm:text-sm desk:text-base font-bold font-mono text-white tracking-wider uppercase truncate leading-tight">
                  <span className="sm:hidden">{lang === 'en' ? 'BLOG STATS & AI' : 'STATYSTYKI BLOGA'}</span>
                  <span className="hidden sm:inline">{lang === 'en' ? 'BLOG STATS & ARTICLE AI SYNTHESIS' : 'STATYSTYKI BLOGA I SYNTEZA AI'}</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenGalaxyGraph && (
                <button
                  type="button"
                  onClick={() => onOpenGalaxyGraph('all')}
                  className="desk:hidden h-9 land:h-8 px-2.5 sm:px-3 w-9 sm:w-auto bg-[#1A1128] hover:bg-fuchsia-950/60 border border-fuchsia-500/60 text-fuchsia-300 rounded-none transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider touch-manipulation"
                  title={lang === 'en' ? 'Galaxy Graph' : 'Graf Galaktyki'}
                  aria-label={lang === 'en' ? 'Open Galaxy Graph' : 'Otwórz Graf Galaktyki'}
                >
                  <Sparkles size={14} className="text-fuchsia-400 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'en' ? 'GALAXY GRAPH' : 'GRAF GALAKTYKI'}</span>
                </button>
              )}
              <button
                type="button"
                id="blog_stats_close_btn"
                onClick={onClose}
                className="w-9 h-9 land:w-8 land:h-8 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 shrink-0 cursor-pointer flex items-center justify-center shadow-sm touch-manipulation"
                title={lang === 'en' ? 'Close (Esc)' : 'Zamknij (Esc)'}
                aria-label={lang === 'en' ? 'Close modal' : 'Zamknij okno'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs: Fixed 3-column grid with compact height on rotated landscape & desktop */}
          <div className="shrink-0 grid grid-cols-3 border-b border-editorial-border font-mono bg-editorial-bg">
            <button
              type="button"
              id="blog_modal_tab_synthesis"
              title={lang === 'en' ? 'AI ARTICLE SYNTHESIS' : 'SYNTEZA ARTYKUŁÓW AI'}
              onClick={() => setActiveTab('synthesis')}
              className={`min-w-0 h-11 land:h-8 short:h-8 desk:h-9 xl:h-10 px-1.5 xl:px-4 flex items-center justify-center gap-1.5 border-b-2 text-[10.5px] xl:text-xs font-bold uppercase transition-all cursor-pointer touch-manipulation ${
                activeTab === 'synthesis'
                  ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-500/10'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <GitCompare size={13} className="text-fuchsia-400 shrink-0" />
              <span className="truncate 2xl:hidden">{lang === 'en' ? 'SYNTHESIS' : 'SYNTEZA'}</span>
              <span className="hidden 2xl:inline truncate">{lang === 'en' ? 'AI ARTICLE SYNTHESIS' : 'SYNTEZA ARTYKUŁÓW AI'}</span>
            </button>

            <button
              type="button"
              id="blog_modal_tab_chat"
              title={lang === 'en' ? 'ARTICLE AI CHAT' : 'CZAT AI Z ARTYKUŁEM'}
              onClick={() => setActiveTab('interactive_chat')}
              className={`min-w-0 h-11 land:h-8 short:h-8 desk:h-9 xl:h-10 px-1.5 xl:px-4 flex items-center justify-center gap-1.5 border-b-2 text-[10.5px] xl:text-xs font-bold uppercase transition-all cursor-pointer touch-manipulation ${
                activeTab === 'interactive_chat'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-400/10'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Bot size={13} className="text-cyan-400 shrink-0" />
              <span className="truncate 2xl:hidden">{lang === 'en' ? 'AI CHAT' : 'CZAT AI'}</span>
              <span className="hidden 2xl:inline truncate">{lang === 'en' ? 'ARTICLE AI CHAT' : 'CZAT AI Z ARTYKUŁEM'}</span>
            </button>

            <button
              type="button"
              id="blog_modal_tab_index"
              title={lang === 'en' ? 'JOURNAL INDEX' : 'INDEKS DZIENNIKA'}
              onClick={() => setActiveTab('analytics')}
              className={`min-w-0 h-11 land:h-8 short:h-8 desk:h-9 xl:h-10 px-1.5 xl:px-4 flex items-center justify-center gap-1.5 border-b-2 text-[10.5px] xl:text-xs font-bold uppercase transition-all cursor-pointer touch-manipulation ${
                activeTab === 'analytics'
                  ? 'border-editorial-accent text-editorial-accent bg-editorial-accent/10'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <BookOpen size={13} className="text-editorial-accent shrink-0" />
              <span className="truncate 2xl:hidden">{lang === 'en' ? 'INDEX' : 'INDEKS'}</span>
              <span className="hidden 2xl:inline truncate">{lang === 'en' ? 'JOURNAL INDEX' : 'INDEKS DZIENNIKA'}</span>
            </button>
          </div>

          {/* Body: messenger flex layout on Chat tab (scrolls only if min-heights exceed viewport); single-scroll on Synthesis & Index */}
          <div 
            ref={modalBodyRef}
            className={`flex-1 min-h-0 min-w-0 w-full bg-editorial-bg modal-scroll-safe ${
              activeTab === 'interactive_chat'
                ? 'overflow-y-auto overflow-x-hidden flex flex-col p-2.5 desk:p-3 short:p-1.5 scrollbar-thin scrollbar-thumb-neutral-800'
                : 'overflow-y-auto overflow-x-hidden p-3 desk:p-5 short:p-2 space-y-3 short:space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-800'
            }`}
          >
            {/* TAB 1: SYNTHESIS & VERSION COMPARISON */}
            {activeTab === 'synthesis' && (() => {
              const stepList = filteredPosts.length > 0 ? filteredPosts : postsList;
              const currentStepIdx = Math.max(0, stepList.findIndex(p => p.id === selectedPostId));
              const stepPost = (direction: -1 | 1) => {
                if (stepList.length === 0) return;
                const nextIdx = (currentStepIdx + direction + stepList.length) % stepList.length;
                setSelectedPostId(stepList[nextIdx].id);
              };

              return (
              <div className="space-y-3 desk:space-y-4 land:space-y-2 min-w-0">
                {/* Article Selector & Version Controls */}
                <div className="bg-editorial-sidebar-bg p-2.5 sm:p-2.5 desk:p-3 land:p-2 border border-editorial-border space-y-2 land:space-y-1.5 desk:space-y-2.5 min-w-0">
                  {/* Narrow Portrait Mobile 1-row Stepper (< sm) */}
                  <div className="flex sm:hidden items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => stepPost(-1)}
                      className="w-9 h-9 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-fuchsia-400 text-editorial-muted hover:text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                      title={lang === 'en' ? 'Previous article' : 'Poprzedni artykuł'}
                      aria-label={lang === 'en' ? 'Previous article' : 'Poprzedni artykuł'}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex-1 min-w-0 px-1.5 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono leading-none mb-0.5">
                        <span className="text-fuchsia-400 font-bold tabular-nums shrink-0">
                          #{selectedPost?.id}
                        </span>
                        <span className="text-editorial-muted tabular-nums shrink-0">
                          ({currentStepIdx + 1}/{stepList.length})
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-white truncate">
                        {selectedPost ? (lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl) : ''}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => stepPost(1)}
                      className="w-9 h-9 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-fuchsia-400 text-editorial-muted hover:text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                      title={lang === 'en' ? 'Next article' : 'Następny artykuł'}
                      aria-label={lang === 'en' ? 'Next article' : 'Następny artykuł'}
                    >
                      <ChevronRight size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowArticleSearchInput(prev => !prev)}
                      className={`w-9 h-9 border transition-all cursor-pointer flex items-center justify-center shrink-0 touch-manipulation ${
                        showArticleSearchInput || articleSearchQuery
                          ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500'
                          : 'bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white'
                      }`}
                      title={lang === 'en' ? 'Filter articles' : 'Filtruj artykuły'}
                      aria-label={lang === 'en' ? 'Filter articles' : 'Filtruj artykuły'}
                    >
                      <Search size={14} />
                    </button>
                  </div>

                  {/* Top Bar (Unified Navigator + Version Mode on sm+: landscape, tablet, desktop) */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between min-w-0">
                    <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-editorial-muted font-bold uppercase tracking-wider text-[10px] shrink-0 font-mono">
                        {lang === 'en' ? 'Article Navigator:' : 'Pasek Artykułów:'}
                      </span>
                      <span className="text-[10px] text-fuchsia-400 font-mono font-bold shrink-0">
                        ({filteredPosts.length} {lang === 'en' ? 'posts' : 'wpisów'})
                      </span>

                      {/* Slider Scroll Arrows */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={() => handleScrollSlider('left', false)}
                          className="p-1 land:p-0.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white transition-all cursor-pointer"
                          title={lang === 'en' ? 'Scroll left' : 'Przewiń w lewo'}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScrollSlider('right', false)}
                          className="p-1 land:p-0.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white transition-all cursor-pointer"
                          title={lang === 'en' ? 'Scroll right' : 'Przewiń w prawo'}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      {/* Search Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowArticleSearchInput(prev => !prev)}
                        className={`p-1 land:py-0.5 border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono shrink-0 ${
                          showArticleSearchInput || articleSearchQuery
                            ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500'
                            : 'bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white'
                        }`}
                        title={lang === 'en' ? 'Filter articles by title or tag' : 'Filtruj artykuły'}
                      >
                        <Search size={12} />
                        <span>{lang === 'en' ? 'Filter' : 'Szukaj'}</span>
                      </button>
                    </div>

                    {/* Mode Selector (v2.0 AI / v1.0 Draft / Diff View) */}
                    <div className="grid grid-cols-3 sm:flex items-center gap-1 p-0.5 bg-neutral-950 border border-editorial-border w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setVersionMode('v2_ai')}
                        className={`min-h-[36px] sm:min-h-0 px-2 sm:px-2.5 py-1 land:py-0.5 text-[10.5px] uppercase font-bold text-center transition-all cursor-pointer touch-manipulation ${
                          versionMode === 'v2_ai'
                            ? 'bg-fuchsia-950 text-fuchsia-300 border border-fuchsia-500'
                            : 'text-editorial-muted hover:text-white'
                        }`}
                      >
                        v2.0 AI
                      </button>
                      <button
                        type="button"
                        onClick={() => setVersionMode('v1_draft')}
                        className={`min-h-[36px] sm:min-h-0 px-2 sm:px-2.5 py-1 land:py-0.5 text-[10.5px] uppercase font-bold text-center transition-all cursor-pointer touch-manipulation ${
                          versionMode === 'v1_draft'
                            ? 'bg-amber-950 text-amber-300 border border-amber-500'
                            : 'text-editorial-muted hover:text-white'
                        }`}
                      >
                        v1.0 Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => setVersionMode('diff')}
                        className={`min-h-[36px] sm:min-h-0 px-2 sm:px-2.5 py-1 land:py-0.5 text-[10.5px] uppercase font-bold text-center transition-all cursor-pointer touch-manipulation ${
                          versionMode === 'diff'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500'
                            : 'text-editorial-muted hover:text-white'
                        }`}
                      >
                        <span className="sm:hidden">Diff</span>
                        <span className="hidden sm:inline">Diff View</span>
                      </button>
                    </div>
                  </div>

                  {/* Search Input Bar + Mobile Filtered Results */}
                  {showArticleSearchInput && (
                    <div className="space-y-1.5 pt-1.5 border-t border-editorial-border/60 animate-fadeIn">
                      <div className="flex items-center gap-2">
                        <Search size={12} className="text-editorial-muted shrink-0" />
                        <input
                          type="text"
                          value={articleSearchQuery}
                          onChange={e => setArticleSearchQuery(e.target.value)}
                          placeholder={lang === 'en' ? 'Search articles by keywords, topics, tags...' : 'Szukaj artykułów po tytule, tagach...'}
                          className="flex-1 min-h-[36px] sm:min-h-0 bg-neutral-950 border border-editorial-border px-2.5 py-1 text-xs sm:text-[11px] font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-400"
                          autoFocus
                        />
                        {articleSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setArticleSearchQuery('')}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-xs text-editorial-muted hover:text-white font-mono cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <div className="sm:hidden flex flex-col gap-1 max-h-36 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800">
                        {filteredPosts.length === 0 ? (
                          <div className="p-2 text-[11px] font-mono text-editorial-muted text-center">
                            {lang === 'en' ? 'No articles match your search query.' : 'Brak artykułów spełniających kryteria.'}
                          </div>
                        ) : (
                          filteredPosts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPostId(p.id);
                                setShowArticleSearchInput(false);
                              }}
                              className={`min-h-[38px] px-2.5 py-1.5 border text-left flex items-center gap-2 text-[11px] font-mono touch-manipulation ${
                                p.id === selectedPostId
                                  ? 'bg-[#150F1E] border-fuchsia-500 text-white font-bold'
                                  : 'bg-neutral-950/70 border-editorial-border text-zinc-300'
                              }`}
                            >
                              <span className="text-fuchsia-400 font-bold shrink-0">#{p.id}</span>
                              <span className="truncate flex-1">{lang === 'en' ? p.titleEn : p.titlePl}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Horizontal Scroll Slider Bar (Unified across landscape, tablet, desktop; ultra-compact cards on land:) */}
                  <div 
                    ref={sliderRef}
                    className="hidden sm:flex gap-3 land:gap-2 overflow-x-auto pb-2 land:pb-1 pt-1 land:pt-0.5 scroll-smooth select-none scrollbar-thin scrollbar-thumb-neutral-800 overscroll-contain snap-x snap-mandatory min-w-0 max-w-full w-full"
                  >
                    {filteredPosts.length === 0 ? (
                      <div className="p-3 text-[11px] font-mono text-editorial-muted text-center w-full">
                        {lang === 'en' ? 'No articles match your search query.' : 'Brak artykułów spełniających kryteria.'}
                      </div>
                    ) : (
                      filteredPosts.map(p => {
                        const isSelected = p.id === selectedPostId;
                        const pTitle = lang === 'en' ? p.titleEn : p.titlePl;
                        return (
                          <button
                            type="button"
                            key={p.id}
                            data-article-id={p.id}
                            onClick={() => setSelectedPostId(p.id)}
                            className={`snap-start shrink-0 w-[min(260px,78vw)] land:w-[215px] p-2.5 land:p-1.5 border transition-all cursor-pointer flex flex-col justify-between text-left ${
                              isSelected
                                ? 'bg-[#150F1E] border-fuchsia-500 shadow-sm shadow-fuchsia-500/20 ring-1 ring-fuchsia-500/50'
                                : 'bg-neutral-950/70 border-editorial-border hover:border-editorial-border/90 hover:bg-neutral-900/50'
                            }`}
                          >
                            <div className="land:flex land:items-center land:gap-1.5 desk:block min-w-0">
                              <div className="flex items-center justify-between gap-1.5 mb-1 land:mb-0 desk:mb-1 text-[9px] font-mono shrink-0">
                                <span className={`px-1.5 py-0.5 land:px-1 land:py-0 border font-bold ${
                                  isSelected 
                                    ? 'bg-fuchsia-900/60 border-fuchsia-400 text-fuchsia-200' 
                                    : 'bg-neutral-900 border-editorial-border text-editorial-muted'
                                }`}>
                                  #{p.id}
                                </span>
                                <div className="hidden desk:flex items-center gap-1.5 text-[8.5px]">
                                  <span className="text-editorial-muted truncate">{p.date}</span>
                                </div>
                              </div>
                              <h4 className={`text-[11px] land:text-[10.5px] desk:text-[11px] font-mono line-clamp-2 land:line-clamp-1 desk:line-clamp-2 leading-tight min-w-0 ${
                                isSelected ? 'text-white font-bold' : 'text-zinc-300'
                              }`}>
                                {pTitle}
                              </h4>
                            </div>

                            <div className="flex land:hidden desk:flex items-center justify-between gap-1 pt-1.5 mt-1 border-t border-editorial-border/40 text-[8.5px] font-mono text-editorial-muted">
                              <span className="truncate">
                                {p.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
                              </span>
                              {isSelected && (
                                <span className="text-fuchsia-400 font-bold uppercase text-[8px] shrink-0">
                                  ● {lang === 'en' ? 'Active' : 'Aktywny'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Post Display */}
                {selectedPost && (
                  <div className="border border-editorial-border bg-editorial-sidebar-bg p-3 land:p-2 desk:p-4 space-y-2.5 land:space-y-1.5 desk:space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 land:pb-1.5 border-b border-editorial-border">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex land:hidden short:hidden desk:flex items-center gap-2 text-[10px] text-editorial-muted uppercase tracking-wider font-mono tabular-nums">
                          <span className="text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                            {selectedPost.date}
                          </span>
                          <span className="whitespace-nowrap inline-flex items-center gap-1 font-semibold">
                            · <Clock size={10} className="text-editorial-accent shrink-0" />
                            <span>{calculateReadingTime(lang === 'en' ? selectedPost.contentEn : selectedPost.contentPl, lang)}</span>
                          </span>
                        </div>
                        <h3 className="text-xs desk:text-sm md:desk:text-base font-bold text-white font-mono uppercase break-words leading-snug">
                          {lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:flex items-center gap-2 self-stretch sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDiscussInChat()}
                          className="min-h-[38px] short:min-h-[32px] desk:min-h-0 px-2.5 py-1.5 desk:py-1 bg-fuchsia-950/80 border border-fuchsia-500/80 hover:bg-fuchsia-900 text-fuchsia-300 hover:text-white flex items-center justify-center gap-1.5 text-[10px] desk:text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm touch-manipulation"
                        >
                          <Bot size={13} className="text-fuchsia-400 shrink-0" />
                          <span className="truncate">
                            {versionMode === 'diff'
                              ? (lang === 'en' ? 'Audit Diff' : 'Audyt Diff')
                              : versionMode === 'v1_draft'
                                ? (lang === 'en' ? 'Discuss v1.0' : 'Omów v1.0')
                                : (lang === 'en' ? 'Debate AI' : 'Polemika AI')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopy}
                          className="min-h-[38px] short:min-h-[32px] desk:min-h-0 px-2.5 py-1.5 desk:py-1 bg-neutral-950 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white flex items-center justify-center gap-1.5 text-[10px] desk:text-[10.5px] transition-all cursor-pointer font-mono touch-manipulation"
                        >
                          {copiedContent ? <Check size={13} className="text-emerald-400 shrink-0" /> : <Copy size={13} className="shrink-0" />}
                          <span className="truncate">{copiedContent ? (lang === 'en' ? 'Copied!' : 'Skopiowano!') : (lang === 'en' ? 'Copy MD' : 'Kopiuj')}</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Revision Note Banner: Collapsible on portrait mobile (< sm), visible with compact padding on sm+ (landscape & desktop) */}
                    {activeAiNote && (
                      <div className="bg-[#130E1F] border border-fuchsia-500/40 text-fuchsia-300 text-xs">
                        <button
                          type="button"
                          onClick={() => setIsAiNoteExpanded(prev => !prev)}
                          className="w-full p-2.5 flex items-center justify-between gap-2 text-left sm:hidden cursor-pointer touch-manipulation"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Sparkles size={13} className="text-fuchsia-400 shrink-0" />
                            <span className="font-bold uppercase text-[10px] text-fuchsia-300 truncate">
                              {lang === 'en' ? 'v2.0 AI Synthesis Log' : 'Dziennik Syntezy v2.0 AI'}
                            </span>
                          </div>
                          {isAiNoteExpanded ? <ChevronUp size={14} className="text-fuchsia-400 shrink-0" /> : <ChevronDown size={14} className="text-fuchsia-400 shrink-0" />}
                        </button>

                        <div className={`${isAiNoteExpanded ? 'block px-2.5 pb-2.5 pt-0.5' : 'hidden'} sm:flex p-2.5 land:p-2 items-start gap-2`}>
                          <Sparkles size={13} className="hidden sm:block text-fuchsia-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="hidden sm:flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-bold uppercase text-[9px] text-fuchsia-400 block">
                                {lang === 'en' ? 'v2.0 AI Synthesis Log:' : 'Dziennik Syntezy v2.0 AI:'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDiscussInChat()}
                                className="text-[9px] font-mono text-fuchsia-400 hover:text-fuchsia-200 underline cursor-pointer"
                              >
                                {lang === 'en' ? 'Debate & check Raw vs v2.0 →' : 'Polemizuj i sprawdź Raw vs v2.0 →'}
                              </button>
                            </div>
                            <p className="text-[11px] sm:text-[10.5px] leading-relaxed sm:mt-0.5 text-fuchsia-200/90">
                              {activeAiNote}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selected Text Instant AI Discussion Bar */}
                    {selectedArticleText && (
                      <div className="mb-2.5 p-2 bg-neutral-900 border border-cyan-500/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-md">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-full sm:max-w-md">
                          <Sparkles size={13} className="text-cyan-400 shrink-0" />
                          <span className="text-cyan-300 font-bold uppercase text-[10px] shrink-0">
                            {lang === 'en' ? 'Selected excerpt:' : 'Zaznaczony fragment:'}
                          </span>
                          <span className="text-zinc-200 truncate text-[11px] italic bg-neutral-950 px-1.5 py-0.5 border border-neutral-800">
                            "{selectedArticleText}"
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const sel = selectedArticleText;
                              const currentArticleTitle = lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl;
                              setSelectedArticleText('');
                              handleDiscussInChat(
                                lang === 'en'
                                  ? `Critically debate this specific excerpt from article #${selectedPost.id} ("${currentArticleTitle}"):\n\n> "${sel}"\n\nState what you agree with (strengths), what technical risks/limitations you disagree with or challenge, and how to improve this fragment.`
                                  : `Przeprowadź krytyczną polemikę do tego zaznaczonego fragmentu artykułu #${selectedPost.id} ("${currentArticleTitle}"):\n\n> "${sel}"\n\nWypunktuj z czym się zgadzasz, z czym polemizujesz (jakie są ryzyka/luki techniczne) i jak ten fragment poprawić.`
                              );
                            }}
                            className="min-h-[36px] sm:min-h-0 px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-500 hover:border-rose-300 text-rose-200 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
                          >
                            <span>{lang === 'en' ? 'Debate Selection' : 'Polemizuj'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sel = selectedArticleText;
                              setSelectedArticleText('');
                              handleDiscussInChat(
                                lang === 'en'
                                  ? `Analyze and rewrite this selected passage simply and clearly:\n\n> "${sel}"\n\nExplain it in 3 clear bullet points and list concrete improvements.`
                                  : `Wyjaśnij i uprość ten zaznaczony fragment:\n\n> "${sel}"\n\nRozpisz go w 3 prostych punktach i zasugeruj ulepszenia.`
                              );
                            }}
                            className="min-h-[36px] sm:min-h-0 px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500 hover:border-cyan-300 text-cyan-200 text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1 touch-manipulation"
                          >
                            <span>{lang === 'en' ? 'Clarify' : 'Uprość'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedArticleText('')}
                            className="min-w-[32px] min-h-[32px] flex items-center justify-center text-neutral-400 hover:text-white text-xs cursor-pointer"
                            title={lang === 'en' ? 'Dismiss' : 'Zamknij'}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Main Content View: single modal scroll on mobile portrait & landscape, inner scroll box on desk+ */}
                    <div
                      onMouseUp={handleArticleSelectionCheck}
                      onTouchEnd={handleArticleSelectionCheck}
                      className="bg-[#0e1015] p-3.5 desk:p-6 short:p-2.5 border border-editorial-border/80 desk:max-h-[66dvh] min-h-[160px] short:min-h-[120px] desk:min-h-[340px] desk:overflow-y-auto select-text scrollbar-thin scrollbar-thumb-neutral-700"
                    >
                      {versionMode === 'diff' ? (() => {
                        const rawLines = activeDraftContent
                          .split('\n')
                          .map(l => l.trim())
                          .filter(l => Boolean(l));
                        const draftWords = activeDraftContent.trim().split(/\s+/).filter(Boolean).length;
                        const v2Words = activeV2Content.trim().split(/\s+/).filter(Boolean).length;
                        const v2Headings = activeV2Content
                          .split('\n')
                          .filter(l => l.trim().startsWith('#'))
                          .map(h => h.replace(/^#+\s*/, '').trim());

                        return (
                          <div className="space-y-3.5 text-xs font-sans">
                            {/* Quick Readability & Audit Bar */}
                            <div className="p-2.5 bg-neutral-900/90 border border-cyan-500/40 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-1.5 py-0.5 bg-amber-950/70 border border-amber-500/50 text-amber-300 font-bold">
                                    v1.0 Raw: {draftWords} {lang === 'en' ? 'words' : 'słów'}
                                  </span>
                                  <span className="text-neutral-500">→</span>
                                  <span className="px-1.5 py-0.5 bg-fuchsia-950/70 border border-fuchsia-500/50 text-fuchsia-300 font-bold">
                                    v2.0 AI: {v2Words} {lang === 'en' ? 'words' : 'słów'} ({v2Headings.length} {lang === 'en' ? 'sections' : 'sekcji'})
                                  </span>
                                </div>
                                <span className="text-[9.5px] text-cyan-300">
                                  {lang === 'en'
                                    ? 'Clear comparison — ask AI to audit or debate'
                                    : 'Czytelne porównanie — sprawdź lub polemizuj z AI'}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 font-mono">
                                <button
                                  type="button"
                                  onClick={() => handleDiscussInChat(
                                    lang === 'en'
                                      ? `Compare v1.0 Raw Draft vs v2.0 AI in detail. Clearly separate: (1) facts originally in Raw v1.0, and (2) code snippets, metrics, or explanations synthesized ONLY in v2.0.`
                                      : `Sprawdź dokładnie co było w surowym szkicu v1.0 Raw, a co zostało dopisane dopiero w wersji v2.0 (w tym przykłady kodu, liczby jak 50ms/100Hz i rozszerzenia).`
                                  )}
                                  className="px-2 py-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/70 text-cyan-200 text-[9.5px] font-bold uppercase cursor-pointer transition-all"
                                >
                                  🔍 {lang === 'en' ? 'What was added only in v2.0?' : 'Co tylko dopisane w v2.0 vs Raw?'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDiscussInChat(
                                    lang === 'en'
                                      ? `Let's debate this article critically. List what is solid (Agree), what claims or code patterns I can disagree with or challenge (Disagree / Risks), and what can be improved.`
                                      : `Podyskutujmy krytycznie o tym artykule. Wypunktuj z czym można się zgodzić, z czym warto polemizować (luki, ryzyka w kodzie, niezweryfikowane tezy) i co poprawić.`
                                  )}
                                  className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-500/70 text-amber-200 text-[9.5px] font-bold uppercase cursor-pointer transition-all"
                                >
                                  ⚖️ {lang === 'en' ? 'Agree vs Disagree' : 'Zgadzam się vs Polemizuję'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDiscussInChat(
                                    lang === 'en'
                                      ? `The article or diff is dense/hard to read. Rewrite the core argument into 5 crystal-clear points and suggest concrete technical & clarity improvements.`
                                      : `Treść artykułu lub różnice między wersjami są nieczytelne. Rozpisz główną myśl w 5 prostych punktach oraz zaproponuj konkretne poprawki tekstu i kodu.`
                                  )}
                                  className="px-2 py-1 bg-fuchsia-950/70 hover:bg-fuchsia-900 border border-fuchsia-500/70 text-fuchsia-200 text-[9.5px] font-bold uppercase cursor-pointer transition-all"
                                >
                                  🛠️ {lang === 'en' ? 'Clarify & Improve' : 'Uprość i zasugeruj poprawki'}
                                </button>
                              </div>
                            </div>

                            {/* Readable Block 1: Original v1.0 Raw Draft Notes */}
                            <div className="p-3 bg-amber-950/15 border border-amber-500/40 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-amber-400 font-mono font-bold uppercase text-[10px]">
                                  {lang === 'en' ? '1. Original v1.0 Raw Draft Notes' : '1. Oryginalne surowe notatki (v1.0 Raw)'}
                                </span>
                                <span className="text-[9px] font-mono text-amber-300/80 uppercase">
                                  {lang === 'en' ? 'Author Source' : 'Źródło autora'}
                                </span>
                              </div>
                              <ul className="space-y-1 font-mono text-[11px] text-amber-100/90 leading-relaxed pl-1">
                                {rawLines.map((line, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-amber-400 select-none shrink-0">•</span>
                                    <span className="break-words">{line.replace(/^[-*]\s*/, '')}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Readable Block 2: Formatted v2.0 Expanded Content */}
                            <div className="p-3 bg-fuchsia-950/15 border border-fuchsia-500/40 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-fuchsia-400 font-mono font-bold uppercase text-[10px]">
                                  {lang === 'en' ? '2. Expanded v2.0 Article (Formatted Sections & Added Code)' : '2. Rozwinięty artykuł v2.0 (Sekcje, opisy i dopisany kod)'}
                                </span>
                                <span className="text-[9px] font-mono text-fuchsia-300/80 uppercase">
                                  +{Math.max(0, v2Words - draftWords)} {lang === 'en' ? 'added words' : 'dopisanych słów'}
                                </span>
                              </div>
                              <div className="prose prose-invert max-w-none text-sm sm:text-[14.5px] leading-relaxed sm:leading-7 text-zinc-200 font-sans space-y-3 [&>*:first-child]:!mt-0">
                                <Markdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    h2: ({ node, ...props }) => <h3 className="text-base sm:text-lg font-mono font-bold text-fuchsia-300 uppercase mt-4 mb-2 border-b border-fuchsia-500/30 pb-1" {...props} />,
                                    h3: ({ node, ...props }) => <h4 className="text-sm sm:text-base font-mono font-bold text-fuchsia-200 uppercase mt-3.5 mb-1.5 border-b border-fuchsia-500/30 pb-0.5" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-2.5 text-zinc-200/90 leading-relaxed text-sm sm:text-[14.5px]" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="my-2.5 space-y-1.5 list-disc pl-5 text-sm text-zinc-200 font-sans marker:text-fuchsia-400" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="my-2.5 space-y-1.5 list-decimal pl-5 text-sm text-zinc-200 font-sans marker:text-fuchsia-400" {...props} />,
                                    li: ({ node, ...props }) => <li className="leading-relaxed pl-0.5" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                                    pre: ({ node, ...props }) => <pre className="p-3 my-2.5 bg-[#090b0e] border border-neutral-800 font-mono text-xs overflow-x-auto text-zinc-200" {...props} />,
                                    code: ({ node, ...props }) => <code className="px-1.5 py-0.5 bg-neutral-800 text-amber-200 font-mono text-xs border border-neutral-700/50" {...props} />,
                                  }}
                                >
                                  {activeV2Content}
                                </Markdown>
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="prose prose-invert max-w-none text-sm sm:text-[15px] leading-relaxed sm:leading-7 text-zinc-200/95 font-sans space-y-4 [&>*:first-child]:!mt-0">
                          <Markdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({ node, ...props }) => (
                                <h1 className="text-lg sm:text-2xl font-bold font-mono text-white uppercase tracking-wider border-b border-neutral-800 pb-2 mt-6 mb-3 break-words" {...props} />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2 className="text-base sm:text-xl font-bold font-mono text-cyan-300 uppercase tracking-wide border-b border-neutral-800/80 pb-1.5 mt-6 mb-3 break-words" {...props} />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3 className="text-sm sm:text-lg font-bold font-mono text-cyan-200 uppercase tracking-wide border-b border-neutral-800/60 pb-1 mt-5 mb-2.5 break-words flex items-center gap-2" {...props} />
                              ),
                              h4: ({ node, ...props }) => (
                                <h4 className="text-xs sm:text-sm font-bold font-mono text-amber-300 uppercase mt-4 mb-2 break-words" {...props} />
                              ),
                              p: ({ node, ...props }) => (
                                <p className="mb-3.5 leading-relaxed sm:leading-7 text-zinc-200/90 font-sans text-sm sm:text-[15px] break-words" {...props} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul className="my-3 space-y-2 list-disc list-outside pl-6 marker:text-cyan-400 text-sm sm:text-[14.5px] text-zinc-200 font-sans leading-relaxed" {...props} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol className="my-3 space-y-2 list-decimal list-outside pl-6 marker:text-cyan-400 marker:font-mono text-sm sm:text-[14.5px] text-zinc-200 font-sans leading-relaxed" {...props} />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="pl-1 font-sans text-zinc-200 leading-relaxed break-words" {...props} />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong className="text-white font-semibold" {...props} />
                              ),
                              em: ({ node, ...props }) => (
                                <em className="text-zinc-300 italic" {...props} />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote className="border-l-4 border-cyan-500/70 bg-neutral-900/60 pl-4 pr-3 py-2.5 my-3.5 italic text-zinc-200 text-sm font-sans rounded-none" {...props} />
                              ),
                              code: ({ node, inline, className, children, ...props }: any) => {
                                const isInline = inline || (!className && typeof children === 'string' && !children.includes('\n'));
                                if (isInline) {
                                  return (
                                    <code
                                      translate="no"
                                      className="px-1.5 py-0.5 bg-neutral-800 text-amber-200 border border-neutral-700/60 font-mono text-xs rounded-none break-words notranslate"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                }
                                return (
                                  <pre className="p-3 my-3 bg-[#0d1117] border border-neutral-800 text-xs sm:text-sm font-mono text-zinc-200 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-800 leading-relaxed">
                                    <code translate="no" className="block notranslate" {...props}>{children}</code>
                                  </pre>
                                );
                              },
                              a: ({ node, href, children, ...props }) => {
                                const safeHref = (href && !href.startsWith('file:') && !href.startsWith('file:///')) ? href : '#';
                                return (
                                  <a
                                    href={safeHref}
                                    className="text-cyan-400 hover:text-white underline decoration-dotted font-mono text-xs sm:text-sm break-words font-semibold"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                );
                              },
                              img: ({ node, src, alt, ...props }) => {
                                const safeSrc = (src && !src.startsWith('file:') && !src.startsWith('file:///')) ? src : '';
                                if (!safeSrc) return null;
                                return <img src={safeSrc} alt={alt || ''} className="max-w-full my-3 border border-editorial-border shadow-md" {...props} />;
                              },
                              hr: () => <hr className="my-5 border-neutral-800" />
                            }}
                          >
                            {versionMode === 'v1_draft' ? activeDraftContent : activeV2Content}
                          </Markdown>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              );
            })()}

            {/* TAB 2: INTERACTIVE ARTICLE AI CHAT & INSPECTOR */}
            {activeTab === 'interactive_chat' && (() => {
              const chatIdx = Math.max(0, postsList.findIndex(p => p.id === selectedPostId));
              const stepChatPost = (dir: -1 | 1) => {
                if (postsList.length === 0) return;
                const next = (chatIdx + dir + postsList.length) % postsList.length;
                setSelectedPostId(postsList[next].id);
              };

              return (
              <div className="flex-1 min-h-0 flex flex-col gap-1.5 land:gap-1 desk:gap-2 font-mono min-w-0">
                {/* Unified Header Bar: Portrait < sm shows compact stepper; sm+ shows DEV LOG AI CHAT badge + inline switcher on land: */}
                <div className="shrink-0 flex items-center justify-between gap-2 p-2 land:p-1.5 desk:px-2.5 desk:py-1.5 bg-neutral-950 border border-editorial-border text-xs min-w-0">
                  {/* Portrait (< sm) target article stepper */}
                  <div className="flex sm:hidden items-center gap-1 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => stepChatPost(-1)}
                      className="w-8 h-8 short:w-7 short:h-7 bg-neutral-900 border border-editorial-border text-editorial-muted hover:text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                      aria-label={lang === 'en' ? 'Previous article' : 'Poprzedni artykuł'}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <div className="min-w-0 flex-1 px-1 flex items-center gap-1">
                      <span className="text-[10px] text-cyan-400 font-bold shrink-0">#{selectedPost?.id}</span>
                      <span className="text-[10.5px] text-white font-bold truncate">
                        {selectedPost ? (lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl) : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => stepChatPost(1)}
                      className="w-8 h-8 short:w-7 short:h-7 bg-neutral-900 border border-editorial-border text-editorial-muted hover:text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                      aria-label={lang === 'en' ? 'Next article' : 'Następny artykuł'}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Unified sm+ AI Chat Status Badge (compact on land:, full on desk+) */}
                  <div className="hidden sm:flex items-center gap-2 text-cyan-300 font-bold text-[11px] shrink-0">
                    <Terminal size={13} className="text-cyan-400 shrink-0" />
                    <span className="desk:hidden">DEV LOG AI CHAT</span>
                    <span className="hidden desk:inline">DEV LOG AI CHAT ASSISTANT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  </div>

                  {/* Compact inline article switcher on mobile landscape (land:) since tall slider is hidden below desk: */}
                  <div className="hidden land:flex desk:hidden items-center gap-1 min-w-0 flex-1 max-w-xs mx-1 px-1.5 py-0.5 bg-neutral-900/80 border border-editorial-border/80">
                    <button
                      type="button"
                      onClick={() => stepChatPost(-1)}
                      className="w-6 h-6 bg-neutral-950 border border-editorial-border text-editorial-muted hover:text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                      aria-label={lang === 'en' ? 'Previous article' : 'Poprzedni artykuł'}
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <div className="min-w-0 flex-1 px-1 flex items-center gap-1">
                      <span className="text-[10px] text-cyan-400 font-bold shrink-0">#{selectedPost?.id}</span>
                      <span className="text-[10px] text-white font-bold truncate">
                        {selectedPost ? (lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl) : ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => stepChatPost(1)}
                      className="w-6 h-6 bg-neutral-950 border border-editorial-border text-editorial-muted hover:text-white flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                      aria-label={lang === 'en' ? 'Next article' : 'Następny artykuł'}
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Engine Status / Drawer Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowApiKeyConfig(prev => !prev)}
                      className={`min-h-[36px] land:min-h-[28px] desk:min-h-0 inline-flex items-center gap-1.5 px-2.5 py-1 land:py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer touch-manipulation ${
                        localApiKey
                          ? `${savedProvider.badgeClass} hover:brightness-110`
                          : 'bg-neutral-900 border-editorial-border text-editorial-muted hover:text-white hover:border-cyan-400'
                      }`}
                      title={lang === 'en' ? 'Configure Google Gemini or Local PC Engine (Ollama / LM Studio)' : 'Skonfiguruj Google Gemini lub Silnik Lokalny PC (Ollama / LM Studio)'}
                    >
                      <Key size={11} className={localApiKey ? savedProvider.textClass : 'text-cyan-400'} />
                      <span className="hidden sm:inline">
                        {localApiKey
                          ? `${savedProvider.shortName}: ${activeModel ? activeModel.split('-')[0].toUpperCase() : 'ACTIVE'}`
                          : (lang === 'en' ? 'AI Engine: Setup' : 'Silnik AI: Ustaw')}
                      </span>
                      <span className="sm:hidden">
                        {localApiKey ? savedProvider.shortName : 'AI'}
                      </span>
                      {showApiKeyConfig ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                    </button>

                    {/* Clear Chat */}
                    <button
                      type="button"
                      onClick={() => {
                        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setChatMessages([
                          {
                            id: 'reset',
                            sender: 'assistant',
                            text: lang === 'en'
                              ? `⚡ **CHAT BUFFER RESET** // Article: \`${selectedPost?.titleEn}\``
                              : `⚡ **RESET PAMIĘCI CZATU** // Artykuł: \`${selectedPost?.titlePl}\``,
                            timestamp: timeStr,
                          }
                        ]);
                      }}
                      className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2 desk:px-2.5 py-1 land:py-0.5 text-[10px] text-editorial-muted hover:text-white bg-neutral-900 border border-editorial-border hover:border-neutral-700 transition-all cursor-pointer touch-manipulation"
                      title={lang === 'en' ? 'Clear chat history' : 'Wyczyść historię czatu'}
                    >
                      {lang === 'en' ? 'Clear' : 'Wyczyść'}
                    </button>
                  </div>
                </div>

                {/* Collapsible Local & Google AI Configuration Box (scrollable so it fits mobile screens) */}
                {showApiKeyConfig && (
                  <div className="shrink-0 max-h-[48dvh] short:max-h-[55dvh] overflow-y-auto modal-scroll-safe p-3 desk:p-3.5 short:p-2 bg-neutral-950 border border-cyan-500/60 space-y-3 animate-fadeIn text-xs font-sans scrollbar-thin scrollbar-thumb-neutral-800">
                    <div className="flex items-start justify-between gap-2 border-b border-editorial-border/60 pb-2">
                      <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold uppercase text-[11px]">
                        <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                        <span>{lang === 'en' ? 'AI Engine Selection (Google AI Studio & Local PC)' : 'Wybór Silnika AI (Google AI Studio i Lokalny PC)'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowApiKeyConfig(false)}
                        className="text-editorial-muted hover:text-white text-[12px] font-mono px-1 py-0.5"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Engine Selection Pills */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-mono uppercase font-bold text-editorial-muted">
                        {lang === 'en' ? '1. Select Engine:' : '1. Wybierz Silnik AI:'}
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
                                  if (!selectedModel || selectedModel.startsWith('gemini-')) setSelectedModel('local-model');
                                } else {
                                  setCustomBaseUrl('');
                                  setSelectedModel('gemini-3.1-flash-lite');
                                }
                              }}
                              className={`p-2.5 text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isSelected
                                  ? `${conf.borderClass} ${conf.bgClass} text-white font-bold ring-1 ring-cyan-400`
                                  : 'bg-neutral-900/60 border-editorial-border/60 text-editorial-muted hover:text-white hover:border-editorial-border'
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-bold text-xs">{lang === 'en' ? conf.shortNameEn : conf.shortNamePl}</span>
                                <span className="text-[9.5px] text-editorial-muted truncate">
                                  {conf.isLocal 
                                    ? (lang === 'en' ? 'Local PC / Server ($0)' : 'Lokalny PC / Serwer (0 zł)') 
                                    : (lang === 'en' ? 'Google AI Studio (Cloud)' : 'Google AI Studio (Chmura)')}
                                </span>
                              </div>
                              {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Provider Details & Model Selector */}
                    <div className={`p-2.5 border text-xs font-mono space-y-2.5 ${effectiveProviderInfo.bgClass} ${effectiveProviderInfo.borderClass}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-bold uppercase text-[10.5px]">
                          {lang === 'en' ? effectiveProviderInfo.nameEn : effectiveProviderInfo.namePl}
                        </span>
                        <span className="text-[9.5px] text-editorial-muted">
                          {effectiveProviderInfo.requiresKey === false 
                            ? (lang === 'en' ? '• Local Engine (No Key Required)' : '• Silnik Lokalny (Bez Klucza)') 
                            : (lang === 'en' ? '• Requires Google AI Key' : '• Wymaga Klucza Google AI')}
                        </span>
                      </div>

                      {/* HTTPS Mixed Content Notice for Local Engines */}
                      {effectiveProviderInfo.isLocal && typeof window !== 'undefined' && window.location.protocol === 'https:' && (
                        <div className="p-2 bg-amber-950/40 border border-amber-600/60 text-amber-300 text-[10px] font-sans leading-relaxed">
                          <span>{lang === 'en' ? '⚠️ On GitHub Pages (HTTPS), browsers block direct requests to http://localhost. Run locally via "npm run dev" or use Gemini.' : '⚠️ Na GitHub Pages (HTTPS) przeglądarka blokuje połączenia do http://localhost. Uruchom "npm run dev" lokalnie lub użyj Gemini.'}</span>
                        </div>
                      )}

                      {/* Model Input - Quick-select pills + editable model name */}
                      <div className="pt-1.5 border-t border-editorial-border/40 space-y-1.5">
                        <label className="text-[9.5px] text-editorial-muted uppercase font-bold flex items-center justify-between gap-2 flex-wrap">
                          <span>{lang === 'en' ? 'Model Selection:' : 'Wybór Modelu:'}</span>
                          <span className="text-[8.5px] text-editorial-muted font-mono lowercase">
                            {effectiveProviderInfo.id === 'custom' || effectiveProviderInfo.isLocal
                              ? 'np. llama3.2, deepseek-r1:8b, local-model'
                              : 'gemini-3.1-flash-lite (default), gemini-3.5-flash-lite, gemini-3.8-flash, gemini-4-hydrogen, gemini-4-argon, gemini-4-carbon'}
                          </span>
                        </label>
                        {effectiveProviderInfo.availableModels?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pb-1">
                            {effectiveProviderInfo.availableModels.map((m) => {
                              const currentVal = (selectedModel || effectiveProviderInfo.defaultModel).trim();
                              const isCurrent = currentVal === m.id;
                              const badgeLabel = m.badge === 'Default' ? (lang === 'en' ? 'Default' : 'Domyślny') : m.badge;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setSelectedModel(m.id)}
                                  className={`px-2 py-1 text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isCurrent
                                      ? 'bg-sky-950/90 border-sky-400 text-sky-200 font-bold'
                                      : 'bg-neutral-900 border-editorial-border text-neutral-300 hover:text-white hover:border-neutral-500'
                                  }`}
                                >
                                  <span>{lang === 'en' ? m.labelEn : m.labelPl}</span>
                                  {badgeLabel && (
                                    <span className={`px-1 py-0.2 text-[8px] uppercase border ${
                                      m.badge === 'Default'
                                        ? 'border-cyan-400/70 text-cyan-300 bg-cyan-950/60'
                                        : m.badge?.includes('Paid')
                                        ? 'border-amber-500/60 text-amber-300 bg-amber-950/40'
                                        : m.badge?.includes('New')
                                        ? 'border-emerald-500/60 text-emerald-300 bg-emerald-950/40'
                                        : 'border-white/15 text-neutral-300 bg-black/30'
                                    }`}>
                                      {badgeLabel}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <input
                          type="text"
                          value={selectedModel || (effectiveProviderInfo.isLocal ? 'llama3.2' : 'gemini-3.1-flash-lite')}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          placeholder={effectiveProviderInfo.isLocal ? 'llama3.2' : 'gemini-3.1-flash-lite'}
                          className="w-full bg-neutral-900 border border-editorial-border text-white text-xs px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-400 placeholder:text-neutral-600"
                        />
                      </div>

                      {/* Base URL for Custom Engine */}
                      {effectiveProviderInfo.isLocal && (
                        <div className="pt-1.5 border-t border-editorial-border/40 space-y-1">
                          <label className="text-[9.5px] text-editorial-muted uppercase font-bold flex items-center justify-between">
                            <span>{lang === 'en' ? 'Endpoint Base URL:' : 'Adres Endpointu:'}</span>
                            <span className="text-[8.5px] text-editorial-muted font-mono">
                              (np. http://localhost:11434/v1 lub http://localhost:1234/v1)
                            </span>
                          </label>
                          <input
                            type="text"
                            value={customBaseUrl}
                            onChange={(e) => setCustomBaseUrl(e.target.value)}
                            placeholder="http://localhost:11434/v1"
                            className="w-full bg-neutral-900 border border-editorial-border px-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* Key Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase font-bold text-editorial-muted block">
                        {lang === 'en' ? 'API Key (Optional for Custom Host / Required for Gemini):' : 'Klucz API (Opcjonalny dla Własnego Hosta / Wymagany dla Gemini):'}
                      </label>
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="relative flex-1 min-w-[180px]">
                          <input
                            type={showKeySecret ? 'text' : 'password'}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder={
                              effectiveProviderInfo.requiresKey === false
                                ? (lang === 'en' ? 'Optional (Local Engine)' : 'Opcjonalny (Silnik Lokalny)')
                                : (lang === 'en' ? effectiveProviderInfo.placeholderEn : effectiveProviderInfo.placeholderPl)
                            }
                            className="w-full bg-neutral-900 border border-editorial-border p-1.5 pr-8 text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeySecret(prev => !prev)}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                          >
                            {showKeySecret ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={isCheckingKey}
                          onClick={() => handleCheckApiKeyQuota()}
                          className="px-2.5 py-1.5 bg-sky-950/80 border border-sky-500/70 text-sky-200 font-mono font-bold text-xs uppercase hover:bg-sky-900 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          <Sparkles size={12} className={isCheckingKey ? 'animate-spin' : ''} />
                          <span>{isCheckingKey ? (lang === 'en' ? 'Checking...' : 'Sprawdzam...') : (lang === 'en' ? 'Check Quota' : 'Limity')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveApiKey}
                          className="px-3 py-1.5 bg-cyan-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Save size={12} />
                          <span>{lang === 'en' ? 'Save' : 'Zapisz'}</span>
                        </button>

                        {(localApiKey || apiKeyInput || customBaseUrl || selectedModel || customModelInput || selectedProviderId !== 'unknown') && (
                          <button
                            type="button"
                            onClick={handleClearApiKey}
                            className="px-2.5 py-1.5 bg-rose-950/70 border border-rose-800 text-rose-300 font-mono font-bold text-xs uppercase hover:bg-rose-900 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                            title={lang === 'en' ? 'Exit paid/cloud key mode and return to free offline mode' : 'Wyjdź z trybu klucza API i wróć do darmowego trybu offline'}
                          >
                            <Trash2 size={12} />
                            <span>{lang === 'en' ? 'Reset / Offline' : 'Wyłącz / Offline'}</span>
                          </button>
                        )}
                      </div>

                      {/* Token Quota & Output Tokens Controls */}
                      <div className="p-2.5 bg-neutral-900/70 border border-editorial-border space-y-2 text-[10px] font-mono">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-cyan-300 font-bold uppercase">
                            {lang === 'en' ? 'Quota & Tokens:' : 'Quota i Limity Tokenów:'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-300">
                              {lang === 'en' ? 'Used:' : 'Zużyto:'} <strong className="text-white">{tokensUsedSession.toLocaleString()}</strong>
                              {sessionTokenLimitInput.trim() ? ` / ${Number(sessionTokenLimitInput).toLocaleString()} tok` : ' tok'}
                            </span>
                            <button
                              type="button"
                              onClick={() => { resetSessionTokensUsed(); setTokensUsedSession(0); }}
                              className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 text-[9px] uppercase cursor-pointer"
                            >
                              {lang === 'en' ? 'Reset' : 'Resetuj'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-editorial-muted uppercase block mb-0.5">
                              {lang === 'en' ? 'Session Token Limit:' : 'Limit tokenów sesji:'}
                            </label>
                            <input
                              type="number"
                              min={100}
                              step={1000}
                              value={sessionTokenLimitInput}
                              onChange={(e) => {
                                setSessionTokenLimitInput(e.target.value);
                                const v = e.target.value.trim() ? Number(e.target.value.trim()) : null;
                                setSessionTokenLimit(v && v > 0 ? v : null);
                              }}
                              placeholder={lang === 'en' ? 'Unlimited (e.g. 50000)' : 'Bez limitu (np. 50000)'}
                              className="w-full bg-neutral-950 border border-editorial-border px-2 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-editorial-muted uppercase block mb-0.5">
                              {lang === 'en' ? 'Max Output Tokens:' : 'Maks. tokenów odpowiedzi:'}
                            </label>
                            <input
                              type="number"
                              min={64}
                              max={65536}
                              step={256}
                              value={maxOutputTokensInput}
                              onChange={(e) => {
                                setMaxOutputTokensInput(e.target.value);
                                const v = e.target.value.trim() ? Number(e.target.value.trim()) : null;
                                setMaxOutputTokens(v && v > 0 ? v : null);
                              }}
                              placeholder={lang === 'en' ? 'Default (e.g. 2048)' : 'Domyślny (np. 2048)'}
                              className="w-full bg-neutral-950 border border-editorial-border px-2 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>

                        {(() => {
                          const displayQuota = localizeQuotaCheckStatus(quotaCheckStatus, lang);
                          if (!displayQuota) return null;
                          return (
                            <div className={`p-2 border text-[10px] font-sans space-y-0.5 ${
                              displayQuota.valid
                                ? 'bg-emerald-950/30 border-emerald-500/60 text-emerald-200'
                                : displayQuota.status === 'quota_exhausted'
                                ? 'bg-amber-950/35 border-amber-500/70 text-amber-200'
                                : 'bg-rose-950/35 border-rose-500/70 text-rose-200'
                            }`}>
                              <div className="font-mono font-bold">
                                {displayQuota.valid ? '✅ ' : '⚠️ '}
                                {displayQuota.providerLabel || displayQuota.status}
                              </div>
                              {displayQuota.message && <div>{displayQuota.message}</div>}
                              {displayQuota.quotaInfo && (
                                <div className="font-mono text-[9px] text-neutral-300">
                                  RPM: {displayQuota.quotaInfo.rpm} • TPM: {displayQuota.quotaInfo.tpm}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {keyStatusFeedback && (
                        <div className="p-1.5 bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-mono text-[9.5px]">
                          {keyStatusFeedback}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Compact 1-row Article Selector Bar in Chat Tab (Desktop desk+ only; saves vertical space for chat stream) */}
                <div className="hidden desk:flex items-center gap-2 shrink-0 bg-neutral-900/60 border border-editorial-border px-2.5 py-1.5 text-xs min-w-0">
                  <span className="text-editorial-muted text-[10px] uppercase font-bold tracking-wider shrink-0">
                    {lang === 'en' ? 'Target:' : 'Artykuł:'}
                  </span>

                  <div
                    ref={chatSliderRef}
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth min-w-0"
                  >
                    {postsList.map(p => {
                      const isSelected = p.id === selectedPostId;
                      const pTitle = lang === 'en' ? p.titleEn : p.titlePl;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          data-chat-article-id={p.id}
                          onClick={() => setSelectedPostId(p.id)}
                          title={pTitle}
                          className={`shrink-0 max-w-[230px] px-2 py-1 border text-[10.5px] font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-[#0A1624] border-cyan-400 text-white font-bold shadow-sm shadow-cyan-400/15'
                              : 'bg-neutral-950/80 border-editorial-border text-zinc-400 hover:text-white hover:border-neutral-600'
                          }`}
                        >
                          <span className={`font-bold shrink-0 ${isSelected ? 'text-cyan-300' : 'text-neutral-500'}`}>
                            #{p.id}
                          </span>
                          <span className="truncate">{pTitle}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleScrollSlider('left', true)}
                      className="p-1 bg-neutral-950 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-editorial-muted hover:text-white transition-all cursor-pointer"
                      title={lang === 'en' ? 'Scroll left' : 'Przewiń w lewo'}
                    >
                      <ChevronLeft size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScrollSlider('right', true)}
                      className="p-1 bg-neutral-950 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-editorial-muted hover:text-white transition-all cursor-pointer"
                      title={lang === 'en' ? 'Scroll right' : 'Przewiń w prawo'}
                    >
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>

                {/* Single-row horizontal quick-action strip (clean icons, zero multi-row bloat) */}
                <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none font-mono text-xs min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setInputQuery(lang === 'en'
                        ? `Critically analyze and debate the following text:\n\n> [PASTE YOUR TEXT OR CODE HERE]\n\nWhat are the solid arguments, what claims or technical details should be challenged (risks/oversimplifications), and what should be improved?`
                        : `Przeprowadź krytyczną analizę i polemikę do poniższego tekstu lub kodu:\n\n> [TUTAJ WKLEJ DOWOLNY TEKST LUB KOD]\n\nZ czym się zgadzasz, z czym polemizujesz (jakie są braki techniczne/ryzyka) i co należy poprawić?`
                      );
                    }}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/80 hover:border-emerald-300 text-emerald-200 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <FileText size={11} className="text-emerald-400 shrink-0" />
                    <span>{lang === 'en' ? 'Paste Text' : 'Wklej tekst'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en'
                      ? 'Let us debate this article critically. State what is technically solid (Agree), what claims or code snippets you disagree with or see as risky/oversimplified (Disagree), and what should be improved.'
                      : 'Podyskutujmy krytycznie o tym artykule. Napisz z czym się zgadzasz, z czym się nie zgadzasz lub co jest zbyt uproszczone/ryzykowne (w tym w kodzie i liczbach) oraz co warto poprawić.'
                    )}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/80 hover:border-rose-300 text-rose-200 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <GitCompare size={11} className="text-rose-400 shrink-0" />
                    <span>{lang === 'en' ? 'Agree vs Disagree' : 'Za i Przeciw'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en'
                      ? 'Compare v1.0 Raw Draft vs v2.0 AI in detail. Show what was in the original raw notes vs what paragraphs, code snippets, or metrics were added only in v2.0.'
                      : 'Porównaj szczegółowo surowy szkic v1.0 Raw z wersją v2.0. Wskaż dokładnie co pochodzi z surowego Raw v1.0, a co zostało dopisane lub rozszerzone dopiero w v2.0.'
                    )}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-amber-950/60 hover:bg-amber-900 border border-amber-600/80 hover:border-amber-400 text-amber-200 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <Search size={11} className="text-amber-400 shrink-0" />
                    <span>{lang === 'en' ? 'Raw vs v2.0' : 'Raw vs v2.0'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en'
                      ? 'Audit readability and code quality: rewrite unclear parts simply and list concrete code/architecture improvements.'
                      : 'Sprawdź czytelność i jakość kodu: uprość trudne do rozczytania fragmenty i podaj konkretne poprawki do wdrożenia.'
                    )}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-fuchsia-950/60 hover:bg-fuchsia-900 border border-fuchsia-700/80 hover:border-fuchsia-400 text-fuchsia-300 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <Sparkles size={11} className="text-fuchsia-400 shrink-0" />
                    <span>{lang === 'en' ? 'Clarify' : 'Uprość'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en' ? 'Extract code snippets and technical commands.' : 'Wyciągnij fragmenty kodu i komendy techniczne.')}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-emerald-400 text-emerald-300 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <Terminal size={11} className="text-emerald-400 shrink-0" />
                    <span>{lang === 'en' ? 'Code Snippets' : 'Kod'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en' ? 'Summarize key takeaways of this article.' : 'Podsumuj kluczowe wnioski z tego artykułu.')}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-cyan-300 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <BookOpen size={11} className="text-cyan-400 shrink-0" />
                    <span>{lang === 'en' ? 'Takeaways' : 'Wnioski'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShowApiKeyGuideInBlog()}
                    className="min-h-[36px] land:min-h-[28px] desk:min-h-0 px-2.5 py-1 land:py-0.5 bg-sky-950/70 hover:bg-sky-900 border border-sky-500 hover:border-sky-300 text-sky-200 text-[10px] desk:text-[11px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shrink-0 rounded-none flex items-center gap-1.5 touch-manipulation"
                  >
                    <Key size={11} className="text-sky-300 shrink-0" />
                    <span>{lang === 'en' ? 'API Key' : 'Klucz API'}</span>
                  </button>
                </div>

                {/* Chat Stream Window: guaranteed readable height even with long pasted text */}
                <div 
                  ref={chatContainerRef}
                  className="relative z-0 flex-1 min-h-[150px] land:min-h-[84px] desk:min-h-[200px] bg-neutral-950 border border-editorial-border p-3 land:p-2 desk:p-3.5 overflow-y-auto modal-scroll-safe space-y-3 land:space-y-2 min-w-0 scrollbar-thin scrollbar-thumb-neutral-800"
                >
                  {chatMessages.map(msg => (
                    <ChatMessageView
                      key={msg.id}
                      message={{
                        id: msg.id,
                        sender: msg.sender,
                        role: msg.sender === 'user' ? 'user' : 'assistant',
                        text: msg.text,
                        time: msg.timestamp,
                        timestamp: msg.timestamp,
                        provider: msg.provider,
                        usage: msg.usage,
                      }}
                      lang={lang}
                    />
                  ))}

                  {isAiThinking && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-cyan-950/40 border border-cyan-500/50 text-cyan-400 text-[11px] font-mono animate-pulse">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bot size={13} className="shrink-0" />
                        <span className="truncate">{lang === 'en' ? 'AI is analyzing article...' : 'AI analizuje treść wpisu...'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStopAi}
                        className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-500 hover:border-red-400 text-red-300 hover:text-white text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-sm"
                        title={lang === 'en' ? 'Stop AI analysis' : 'Zatrzymaj analizę AI'}
                      >
                        <Square size={10} className="fill-red-300" />
                        <span>{lang === 'en' ? 'Stop' : 'Zatrzymaj'}</span>
                      </button>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Unified Auto-Growing Composer Box */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (isAiThinking) {
                      handleStopAi();
                    } else {
                      handleSendMessage();
                    }
                  }}
                  className="shrink-0 relative z-10 min-w-0 pt-0.5"
                >
                  <div className="bg-neutral-950 border border-editorial-border focus-within:border-cyan-400 transition-colors flex flex-col min-w-0 shadow-sm">
                    <textarea
                      ref={chatTextareaRef}
                      value={inputQuery}
                      onChange={e => setInputQuery(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!isAiThinking && inputQuery.trim()) {
                            handleSendMessage();
                          }
                        }
                      }}
                      rows={1}
                      placeholder={
                        isAiThinking
                          ? (lang === 'en' ? 'AI analyzing...' : 'AI analizuje...')
                          : (lang === 'en'
                              ? 'Type or paste text to debate...'
                              : 'Napisz lub wklej tekst do analizy...')
                      }
                      disabled={isAiThinking}
                      className="w-full bg-transparent border-0 px-3 pt-2.5 pb-1.5 land:px-2.5 land:pt-1.5 land:pb-1 text-white text-xs font-mono placeholder-neutral-500 outline-none min-w-0 disabled:opacity-60 resize-none leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800"
                    />

                    {/* Aligned Bottom Toolbar Inside Unified Frame */}
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 land:px-2 land:py-1 border-t border-editorial-border/50 bg-[#080B10]/80">
                      <div className="flex items-center gap-2 min-w-0 text-[9.5px] font-mono text-neutral-500">
                        <span className="hidden desk:inline truncate">
                          {lang === 'en' ? 'Enter = send · Shift+Enter = newline' : 'Enter = wyślij · Shift+Enter = nowa linia'}
                        </span>
                        <span className="desk:hidden truncate text-[9px]">
                          {inputQuery.length === 0
                            ? (lang === 'en' ? 'Shift+Enter = newline' : 'Wpisz lub wklej tekst')
                            : `${inputQuery.length.toLocaleString()} ${lang === 'en' ? 'chars' : 'zn.'}`}
                        </span>
                        {inputQuery.length > 0 && (
                          <>
                            <span className="hidden desk:inline text-cyan-400/80 font-semibold tabular-nums shrink-0">
                              · {inputQuery.length.toLocaleString()} {lang === 'en' ? 'chars' : 'znaków'}
                            </span>
                            {!isAiThinking && (
                              <button
                                type="button"
                                onClick={() => setInputQuery('')}
                                className="text-neutral-400 hover:text-rose-300 underline cursor-pointer shrink-0 uppercase text-[9px]"
                                title={lang === 'en' ? 'Clear text' : 'Wyczyść tekst'}
                              >
                                {lang === 'en' ? 'Clear' : 'Wyczyść'}
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {isAiThinking ? (
                        <button
                          type="button"
                          onClick={handleStopAi}
                          className="h-8 land:h-7 px-3 desk:px-3.5 bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white font-bold uppercase tracking-wider text-[10px] desk:text-[10.5px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 font-mono shadow-sm animate-pulse touch-manipulation"
                          title={lang === 'en' ? 'Stop AI analysis' : 'Zatrzymaj analizę AI'}
                        >
                          <Square size={11} className="fill-red-300 shrink-0" />
                          <span>{lang === 'en' ? 'Stop' : 'Zatrzymaj'}</span>
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!inputQuery.trim()}
                          className="h-8 land:h-7 px-3 desk:px-3.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-300 hover:text-white font-bold uppercase tracking-wider text-[10px] desk:text-[10.5px] flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 font-mono touch-manipulation"
                        >
                          <Send size={11} className="shrink-0" />
                          <span>{lang === 'en' ? 'Ask AI' : 'Zapytaj'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              );
            })()}

            {/* TAB 3: JOURNAL INDEX & TAG ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-3 land:space-y-2 desk:space-y-4 font-mono min-w-0">
                {/* Single-row horizontal Galaxy Graph tag strip on mobile portrait; unified wrapped tag strip with label on sm+ */}
                <div className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap pb-2.5 land:pb-1.5 border-b border-editorial-border min-w-0 scrollbar-none">
                  <span className="hidden sm:inline text-editorial-muted text-xs uppercase font-bold tracking-wider mr-1 shrink-0 font-mono">
                    {lang === 'en' ? 'Open Galaxy Graph for tag:' : 'Otwórz Galaxy Graph dla tagu:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenGalaxyGraph) onOpenGalaxyGraph('all');
                    }}
                    className="min-h-[36px] sm:min-h-0 shrink-0 text-[10.5px] desk:text-xs font-mono uppercase px-2.5 py-1 land:py-0.5 border transition-all cursor-pointer font-semibold bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white whitespace-nowrap touch-manipulation"
                  >
                    # ALL ({postsList.length})
                  </button>
                  {metrics.allTags.map(tag => {
                    const count = postsList.filter(p => p.tags.includes(tag)).length;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (onOpenGalaxyGraph) onOpenGalaxyGraph(tag);
                        }}
                        className="min-h-[36px] sm:min-h-0 shrink-0 text-[10.5px] desk:text-xs font-mono uppercase px-2.5 py-1 land:py-0.5 border transition-all cursor-pointer font-semibold bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white whitespace-nowrap touch-manipulation"
                      >
                        #{tag.toUpperCase()} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Article List */}
                <div className="space-y-2.5 land:space-y-1.5 min-w-0">
                  {filteredPosts.map(post => {
                    const title = lang === 'en' ? post.titleEn : post.titlePl;
                    const excerpt = lang === 'en' ? post.excerptEn : post.excerptPl;
                    const content = lang === 'en' ? post.contentEn : post.contentPl;
                    const readTime = calculateReadingTime(content, lang);

                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          setSelectedPostId(post.id);
                          if (onSelectBlogPost) onSelectBlogPost(post);
                        }}
                        className="p-3 land:p-2 desk:p-3.5 bg-editorial-sidebar-bg border border-editorial-border hover:border-editorial-accent/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer group hover:bg-neutral-900/60 min-w-0 touch-manipulation"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 min-w-0">
                            <span className="text-xs desk:text-sm font-bold font-mono text-white group-hover:text-editorial-accent transition-colors truncate">
                              #{post.id} · {title}
                            </span>
                            <span className="text-editorial-accent group-hover:translate-x-0.5 transition-transform font-bold sm:hidden shrink-0">
                              →
                            </span>
                          </div>
                          <p className="text-xs text-editorial-muted font-sans line-clamp-2 sm:line-clamp-1 leading-relaxed">
                            {excerpt}
                          </p>
                          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[10px] font-mono text-editorial-muted pt-0.5 tabular-nums">
                            <span className="text-zinc-300 font-semibold land:hidden short:hidden desk:inline">{post.date}</span>
                            <span className="inline-flex land:hidden short:hidden desk:inline-flex items-center gap-1">
                              · <Clock size={10} className="text-editorial-accent shrink-0" />
                              <span>{readTime}</span>
                            </span>
                            <span className="text-editorial-accent truncate">
                              <span className="land:hidden short:hidden desk:inline">· </span>
                              {post.tags.slice(0, 3).map(t => `#${t}`).join(' ')}
                            </span>
                          </div>
                        </div>

                        <span className="hidden sm:inline text-editorial-accent group-hover:translate-x-0.5 transition-transform font-bold shrink-0">
                          →
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Footer (hidden on mobile portrait & rotated landscape to preserve vertical screen real estate) */}
          <div className="hidden desk:flex shrink-0 border-t border-editorial-border px-6 py-2 items-center justify-between gap-2 bg-editorial-sidebar-bg min-w-0 font-mono text-xs">
            <div className="flex text-[10px] desk:text-xs text-editorial-muted uppercase tracking-wider items-center gap-1.5 min-w-0 flex-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 shrink-0" />
              <span className="truncate">
                {selectedPost
                  ? `${lang === 'en' ? 'SELECTED' : 'WYBRANO'}: #${selectedPost.id} - ${lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl}`
                  : `${metrics.totalPosts} ${lang === 'en' ? 'ARTICLES' : 'ARTYKUŁÓW'}`}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {onOpenGalaxyGraph && (
                <button
                  type="button"
                  onClick={() => onOpenGalaxyGraph('all')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-fuchsia-500/70 text-fuchsia-300 hover:bg-fuchsia-500/10 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                >
                  <Sparkles size={12} className="text-fuchsia-400 shrink-0" />
                  <span>{lang === 'en' ? 'GALAXY GRAPH' : 'GRAF GALAKTYKI'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-editorial-accent text-editorial-accent hover:bg-editorial-accent/10 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
              >
                <span>{lang === 'en' ? 'CLOSE INSPECTOR' : 'ZAMKNIJ INSPEKTOR'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
