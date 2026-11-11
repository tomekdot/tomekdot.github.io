/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  PROVIDERS_CONFIG,
  AIProviderId,
  AIProviderInfo
} from '../lib/apiKeyStorage';
import { handleClientSideBlogAiFallback, HAS_BACKEND } from '../lib/clientAi';

interface BlogStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  blogPosts?: BlogPost[];
  lang: 'en' | 'pl';
  onSelectBlogPost?: (post: BlogPost) => void;
  onOpenGalaxyGraph?: (tag: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export default function BlogStatsModal({
  isOpen,
  onClose,
  blogPosts,
  lang,
  onSelectBlogPost,
  onOpenGalaxyGraph
}: BlogStatsModalProps) {
  const [activeTab, setActiveTab] = useState<'synthesis' | 'analytics' | 'interactive_chat'>('synthesis');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPostId, setSelectedPostId] = useState<string>('1');
  const [versionMode, setVersionMode] = useState<'v2_ai' | 'v1_draft' | 'diff'>('v2_ai');
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');
  const [showArticleSearchInput, setShowArticleSearchInput] = useState<boolean>(false);
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Initialize inputs on open or key load
  useEffect(() => {
    if (isOpen) {
      const storedKey = getLocalAIKey();
      const storedModel = getLocalAIModel();
      const storedBaseUrl = getLocalAIBaseUrl();
      const storedProvider = getLocalAIProvider();

      if (storedKey) setApiKeyInput(storedKey);
      if (storedBaseUrl) setCustomBaseUrl(storedBaseUrl);
      if (storedProvider && PROVIDERS_CONFIG[storedProvider]) {
        setSelectedProviderId(storedProvider);
      }
      if (storedModel) {
        setSelectedModel(storedModel);
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

  // Initialize chat when post changes or lang switches
  useEffect(() => {
    if (!selectedPost) return;
    const initialText = lang === 'en'
      ? `⚡ **DEV LOG AI ASSISTANT** // Article: **${selectedPost.titleEn}**\n\nAsk me about technical architecture, code snippets, or draft improvements!`
      : `⚡ **ASYSTENT AI DZIENNIKA** // Wpis: **${selectedPost.titlePl}**\n\nZapytaj mnie o architekturę techniczną, fragmenty kodu lub porównanie wersji!`;

    setChatMessages([
      {
        id: 'init',
        sender: 'assistant',
        text: initialText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [selectedPostId, lang, selectedPost]);

  // Save AI API Key & Engine settings
  const handleSaveApiKey = () => {
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

    const provInfo = PROVIDERS_CONFIG[targetProviderId] || PROVIDERS_CONFIG.gemini;
    const finalModel = (isCustomModelMode && customModelInput.trim())
      ? customModelInput.trim()
      : (selectedModel || provInfo.defaultModel);

    const finalBaseUrl = customBaseUrl.trim() || provInfo.defaultBaseUrl || '';

    setLocalAIKey(trimmedKey, sessionOnlyKey, finalModel, targetProviderId, finalBaseUrl);

    setKeyStatusFeedback(
      lang === 'en'
        ? `✓ AI Settings Saved: ${provInfo.nameEn} (${finalModel})`
        : `✓ Zapisano ustawienia: ${provInfo.namePl} (${finalModel})`
    );

    setTimeout(() => {
      setKeyStatusFeedback(null);
      setShowApiKeyConfig(false);
    }, 1800);
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

  // Launch AI Chat directly from Synthesis tab with v2.0 / v1.0 context
  const handleDiscussInChat = () => {
    if (!selectedPost) return;
    const pTitle = lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl;
    const prompt = versionMode === 'v1_draft'
      ? (lang === 'en'
          ? `Discuss the v1.0 raw draft of article #${selectedPost.id}: "${pTitle}". What ideas should be expanded or refined?`
          : `Przedyskutujmy surowy szkic v1.0 artykułu #${selectedPost.id}: "${pTitle}". Jakie pomysły warto rozwinąć lub doprecyzować?`)
      : (lang === 'en'
          ? `Analyze and discuss the v2.0 AI synthesis of article #${selectedPost.id}: "${pTitle}". What architectural and code improvements were introduced over the v1.0 draft?`
          : `Przeanalizujmy i podyskutujmy o syntezie v2.0 AI artykułu #${selectedPost.id}: "${pTitle}". Jakie ulepszenia kodu i architektury wprowadzono względem surowego szkicu v1.0?`);

    setActiveTab('interactive_chat');
    setTimeout(() => {
      handleSendMessage(prompt);
    }, 120);
  };

  // Instant Offline API Key Guide
  const handleShowApiKeyGuideInBlog = () => {
    setShowApiKeyConfig(true);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const guideMsg = lang === 'en'
      ? `### 🔑 **Quick Guide: How to Get a Free Google Gemini API Key**\n\nGoogle provides free API keys for developers to access Gemini 2.5 Flash and Gemini Pro models:\n\n1. **Open Google AI Studio**: Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n2. **Sign In**: Log in using your Google / Gmail account.\n3. **Create Key**: Click the blue **"Create API key"** button and select a project.\n4. **Copy Key**: Copy your generated key (starts with \`AIzaSy...\`).\n5. **Paste & Save**: Paste your key into the **"API Key"** field in the setup box above, then click **"Save Locally"**.\n\n---\n💡 **Local PC Models (100% Offline / No Key Needed)**\nIf you prefer running models locally without cloud accounts, switch the engine above to **"Local PC / Server"** and point to your local Ollama or LM Studio endpoint (\`http://localhost:11434/v1\`).`
      : `### 🔑 **Szybki Przewodnik: Jak bezpłatnie uzyskać klucz API Google Gemini**\n\nGoogle udostępnia bezpłatne klucze API dla deweloperów z dostępem do modeli Gemini 2.5 Flash i Gemini Pro:\n\n1. **Otwórz Google AI Studio**: Wejdź na [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).\n2. **Zaloguj się**: Użyj swojego konta Google / Gmail.\n3. **Utwórz klucz**: Kliknij niebieski przycisk **"Create API key"** i wybierz projekt.\n4. **Skopiuj klucz**: Skopiuj wygenerowany klucz (zaczyna się od \`AIzaSy...\`).\n5. **Wklej i zapisz**: Wklej klucz w pole **"Klucz API"** w panelu powyżej i kliknij **"Zapisz lokalnie"**.\n\n---\n💡 **Lokalne Modele PC (100% Offline / Bez Klucza)**\nMożesz też przełączyć silnik powyżej na **"Lokalny PC (Ollama / LM Studio)"** i połączyć się z lokalną instancją (\`http://localhost:11434/v1\`) bez potrzeby posiadania żadnego klucza chmurowego.`;

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

    const qLower = query.toLowerCase();
    if (qLower.includes('api key') || qLower.includes('klucz') || qLower.includes('guide') || qLower.includes('instrukcj') || qLower.includes('jak zdobyć') || qLower.includes('how to get')) {
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

    const activeKey = getLocalAIKey();
    const activeModelChoice = getLocalAIModel();
    const activeProviderChoice = getLocalAIProvider();
    const activeBaseUrlChoice = getLocalAIBaseUrl();

    // Check if key is required - do not hallucinate mock text when missing!
    const isLocalEngine = activeProviderChoice === 'ollama' || activeProviderChoice === 'lmstudio' || effectiveProviderInfo.requiresKey === false;
    if (!isLocalEngine && !activeKey) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const noKeyMsg = lang === 'en'
        ? `⚠️ **No Active Gemini / AI API Key Connected**\n\nThe AI assistant cannot analyze article **"${selectedPost.titleEn}"** without an active API key or connected local engine.\n\n### How to enable AI analysis:\n1. Click **[🔑 API Key Guide]** below for quick step-by-step instructions.\n2. Click **[⚙️ AI Engine: Setup]** above to paste your Google AI Studio key (\`AIzaSy...\`) or choose local Ollama.\n3. In the meantime, you can review the full v1.0 draft and v2.0 synthesis in the **Synthesis** tab.`
        : `⚠️ **Brak aktywnego klucza API Gemini / AI**\n\nModel AI nie może wygenerować analizy na żywo dla artykułu **"${selectedPost.titlePl}"** bez podłączonego klucza API lub lokalnego modelu.\n\n### Jak włączyć analizę AI:\n1. Kliknij poniżej **[🔑 Instrukcja klucza API]**, aby zobaczyć jak w 60 sekund bezpłatnie uzyskać klucz w Google AI Studio.\n2. Kliknij **[⚙️ Silnik AI: Ustaw]** u góry, aby wkleić darmowy klucz lub wybrać model lokalny.\n3. W międzyczasie pełny szkic v1.0 i zredagowaną wersję v2.0 możesz przeglądać w zakładce **Synteza**.`;

      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: noKeyMsg,
          timestamp: timeStr,
        }
      ]);
      setIsAiThinking(false);
      return;
    }

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
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: fallback.reply,
            timestamp: replyTime
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

    if (!HAS_BACKEND) {
      await runBlogFallback();
      return;
    }

    try {
      const res = await fetch('/api/ai/chat-blog', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-ai-api-key': activeKey,
          'x-gemini-api-key': activeKey,
          'x-ai-base-url': activeBaseUrlChoice || '',
          'x-ai-provider': activeProviderChoice || '',
          'x-ai-model': activeModelChoice || '',
        },
        body: JSON.stringify({
          postId: selectedPost.id,
          postTitle: lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl,
          postExcerpt: lang === 'en' ? selectedPost.excerptEn : selectedPost.excerptPl,
          postContent: lang === 'en' ? selectedPost.contentEn : selectedPost.contentPl,
          versionMode,
          aiRevisionNote: activeAiNote,
          draftContent: activeDraftContent,
          tags: selectedPost.tags,
          userMessage: query,
          customApiKey: activeKey,
          customModel: activeModelChoice,
          customBaseUrl: activeBaseUrlChoice,
          customProvider: activeProviderChoice,
          siteLang: lang,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'assistant',
            text: data.reply || (lang === 'en' ? 'No output generated.' : 'Brak odpowiedzi.'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsAiThinking(false);
        abortControllerRef.current = null;
        return;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        abortControllerRef.current = null;
        setIsAiThinking(false);
        return;
      }
      await runBlogFallback();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 short:p-1 overflow-hidden overscroll-contain">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85"
        />

        {/* Modal Window Container aligned with RepoModal standard */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 bg-editorial-bg border-2 border-editorial-border w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-3xl lg:max-w-4xl h-[86vh] max-h-[760px] short:h-[calc(100vh-1rem)] rounded-none shadow-2xl flex flex-col overflow-hidden my-auto min-w-0 font-mono text-xs select-text"
        >
          {/* iOS/iPhone-style pull-down handle (clean pill bar, no text) */}
          <div 
            className="w-full flex items-center justify-center pt-2.5 pb-2 short:pt-1 short:pb-1 bg-editorial-sidebar-bg cursor-pointer select-none shrink-0 group border-b border-editorial-border/30 touch-none"
            onClick={onClose}
            title={lang === 'en' ? 'Close window' : 'Zamknij okno'}
          >
            <div className="w-10 h-1 rounded-full bg-neutral-600 group-hover:bg-fuchsia-400 transition-colors" />
          </div>

          {/* nagłówek */}
          <div className="shrink-0 px-3.5 sm:px-6 py-2.5 sm:py-4 short:py-1.5 border-b border-editorial-border bg-editorial-sidebar-bg flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
              <div className="p-1.5 bg-[#1A1128] border border-fuchsia-500/50 text-fuchsia-400 shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[9px] uppercase text-editorial-muted tracking-wider truncate [@media(max-height:500px)]:hidden">
                  <span className="text-fuchsia-400 font-bold shrink-0">@tomekdot Dev Log</span>
                  <span>•</span>
                  <span className="truncate">{lang === 'en' ? 'Journal & AI Inspector' : 'Dziennik & Inspektor AI'}</span>
                </div>
                <h2 className="text-sm sm:text-base font-bold font-mono text-white tracking-wide uppercase break-words leading-tight">
                  {lang === 'en' ? 'BLOG STATS & ARTICLE AI SYNTHESIS' : 'STATYSTYKI BLOGA I SYNTEZA AI'}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 short:w-7 short:h-7 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 shrink-0 cursor-pointer flex items-center justify-center shadow-sm"
              title={lang === 'en' ? 'Close window' : 'Zamknij okno'}
            >
              <X size={16} />
            </button>
          </div>

          {/* zakładki: 3 równe kolumny w siatce CSS grid-cols-3, krótkie etykiety domyślnie, pełne dopiero od 2xl */}
          <div className="shrink-0 grid grid-cols-3 border-b border-editorial-border font-mono bg-editorial-bg">
            <button
              type="button"
              id="blog_modal_tab_synthesis"
              title={lang === 'en' ? 'AI ARTICLE SYNTHESIS' : 'SYNTEZA ARTYKUŁÓW AI'}
              onClick={() => setActiveTab('synthesis')}
              className={`min-w-0 h-10 xl:h-12 short:h-9 px-1 xl:px-4 flex items-center justify-center gap-1 border-b-2 text-[10px] xl:text-xs font-bold uppercase transition-all cursor-pointer ${
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
              className={`min-w-0 h-10 xl:h-12 short:h-9 px-1 xl:px-4 flex items-center justify-center gap-1 border-b-2 text-[10px] xl:text-xs font-bold uppercase transition-all cursor-pointer ${
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
              className={`min-w-0 h-10 xl:h-12 short:h-9 px-1 xl:px-4 flex items-center justify-center gap-1 border-b-2 text-[10px] xl:text-xs font-bold uppercase transition-all cursor-pointer ${
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

          {/* treść: jedyny element, który się przewija pionowo */}
          <div 
            ref={modalBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-5 short:p-2 space-y-3 short:space-y-2 bg-editorial-bg min-w-0 w-full scrollbar-thin scrollbar-thumb-neutral-800 overscroll-contain"
          >
            {/* TAB 1: SYNTHESIS & VERSION COMPARISON */}
            {activeTab === 'synthesis' && (
              <div className="space-y-4 min-w-0">
                {/* Article Selector & Version Controls */}
                <div className="bg-editorial-sidebar-bg p-3 border border-editorial-border space-y-2.5 min-w-0">
                  {/* Top Bar: Search, Arrows, and Version Mode */}
                  <div className="flex flex-wrap items-center gap-2 justify-between min-w-0">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      <span className="text-editorial-muted font-bold uppercase tracking-wider text-[10px] shrink-0 font-mono">
                        {lang === 'en' ? 'Article Navigator:' : 'Pasek Artykułów:'}
                      </span>
                      <span className="text-[10px] text-fuchsia-400 font-mono font-bold">
                        ({filteredPosts.length} {lang === 'en' ? 'posts' : 'wpisów'})
                      </span>

                      {/* Slider Scroll Arrows */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={() => handleScrollSlider('left', false)}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white transition-all cursor-pointer"
                          title={lang === 'en' ? 'Scroll left' : 'Przewiń w lewo'}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScrollSlider('right', false)}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white transition-all cursor-pointer"
                          title={lang === 'en' ? 'Scroll right' : 'Przewiń w prawo'}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>

                      {/* Search Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowArticleSearchInput(prev => !prev)}
                        className={`p-1 border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-mono shrink-0 ${
                          showArticleSearchInput || articleSearchQuery
                            ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500'
                            : 'bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white'
                        }`}
                        title={lang === 'en' ? 'Filter articles by title or tag' : 'Filtruj artykuły'}
                      >
                        <Search size={12} />
                        <span className="hidden sm:inline">{lang === 'en' ? 'Filter' : 'Szukaj'}</span>
                      </button>
                    </div>

                    {/* Mode Selector (v2.0 AI / v1.0 Draft / Diff) */}
                    <div className="flex flex-wrap items-center gap-1 p-0.5 bg-neutral-950 border border-editorial-border shrink-0">
                      <button
                        type="button"
                        onClick={() => setVersionMode('v2_ai')}
                        className={`shrink-0 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[10.5px] uppercase font-bold text-center transition-all cursor-pointer ${
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
                        className={`shrink-0 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[10.5px] uppercase font-bold text-center transition-all cursor-pointer ${
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
                        className={`shrink-0 px-2 sm:px-2.5 py-1 text-[10px] sm:text-[10.5px] uppercase font-bold text-center transition-all cursor-pointer ${
                          versionMode === 'diff'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-500'
                            : 'text-editorial-muted hover:text-white'
                        }`}
                      >
                        Diff View
                      </button>
                    </div>
                  </div>

                  {/* Search Input Bar if toggled */}
                  {showArticleSearchInput && (
                    <div className="flex items-center gap-2 pt-1 border-t border-editorial-border/60 animate-fadeIn">
                      <Search size={12} className="text-editorial-muted shrink-0" />
                      <input
                        type="text"
                        value={articleSearchQuery}
                        onChange={e => setArticleSearchQuery(e.target.value)}
                        placeholder={lang === 'en' ? 'Search articles by keywords, topics, tags...' : 'Szukaj artykułów po tytule, tagach...'}
                        className="flex-1 bg-neutral-950 border border-editorial-border px-2 py-1 text-[11px] font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-400"
                        autoFocus
                      />
                      {articleSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setArticleSearchQuery('')}
                          className="text-[10px] text-editorial-muted hover:text-white px-1.5 py-0.5 font-mono cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  {/* Horizontal Scroll Slider Bar ("Pasek suwak z artykułami") */}
                  <div 
                    ref={sliderRef}
                    className="flex gap-3 overflow-x-auto pb-2 pt-1 scroll-smooth select-none scrollbar-thin scrollbar-thumb-neutral-800 overscroll-contain snap-x snap-mandatory min-w-0 max-w-full w-full"
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
                            className={`snap-start shrink-0 w-[min(260px,78vw)] p-2.5 border transition-all cursor-pointer flex flex-col justify-between text-left ${
                              isSelected
                                ? 'bg-[#150F1E] border-fuchsia-500 shadow-sm shadow-fuchsia-500/20 ring-1 ring-fuchsia-500/50'
                                : 'bg-neutral-950/70 border-editorial-border hover:border-editorial-border/90 hover:bg-neutral-900/50'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5 mb-1 text-[9px] font-mono">
                                <span className={`px-1.5 py-0.5 border font-bold ${
                                  isSelected 
                                    ? 'bg-fuchsia-900/60 border-fuchsia-400 text-fuchsia-200' 
                                    : 'bg-neutral-900 border-editorial-border text-editorial-muted'
                                }`}>
                                  #{p.id}
                                </span>
                                <div className="flex items-center gap-1.5 text-[8.5px]">
                                  <span className="text-editorial-muted truncate">{p.date}</span>
                                </div>
                              </div>
                              <h4 className={`text-[11px] font-mono line-clamp-2 leading-tight ${
                                isSelected ? 'text-white font-bold' : 'text-zinc-300'
                              }`}>
                                {pTitle}
                              </h4>
                            </div>

                            <div className="flex items-center justify-between gap-1 pt-1.5 mt-1 border-t border-editorial-border/40 text-[8.5px] font-mono text-editorial-muted">
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
                  <div className="border border-editorial-border bg-editorial-sidebar-bg p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-editorial-border">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 text-[9px] text-editorial-muted uppercase tracking-wider min-w-0">
                          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                            {selectedPost.date}
                          </span>
                          <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-semibold">
                            <Clock size={9} className="text-editorial-accent shrink-0" />
                            {calculateReadingTime(lang === 'en' ? selectedPost.contentEn : selectedPost.contentPl, lang)}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm md:text-base font-bold text-white font-mono uppercase break-words leading-tight">
                          {lang === 'en' ? selectedPost.titleEn : selectedPost.titlePl}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={handleDiscussInChat}
                          className="px-2.5 py-1 bg-fuchsia-950/80 border border-fuchsia-500/80 hover:bg-fuchsia-900 text-fuchsia-300 hover:text-white flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                        >
                          <Bot size={12} className="text-fuchsia-400" />
                          <span>
                            {versionMode === 'v1_draft'
                              ? (lang === 'en' ? 'Discuss v1.0 with AI' : 'Dyskutuj o v1.0 z AI')
                              : (lang === 'en' ? 'Discuss v2.0 with AI' : 'Dyskutuj o v2.0 z AI')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopy}
                          className="px-2.5 py-1 bg-neutral-950 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white flex items-center gap-1.5 text-[10px] sm:text-[10.5px] transition-all cursor-pointer font-mono"
                        >
                          {copiedContent ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedContent ? (lang === 'en' ? 'Copied!' : 'Skopiowano!') : (lang === 'en' ? 'Copy Markdown' : 'Kopiuj')}</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Revision Note Banner */}
                    {activeAiNote && (
                      <div className="p-2.5 bg-[#130E1F] border border-fuchsia-500/40 text-fuchsia-300 text-xs flex items-start gap-2">
                        <Sparkles size={13} className="text-fuchsia-400 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold uppercase text-[9px] text-fuchsia-400 block">
                              {lang === 'en' ? 'v2.0 AI Synthesis Log:' : 'Dziennik Syntezy v2.0 AI:'}
                            </span>
                            <button
                              type="button"
                              onClick={handleDiscussInChat}
                              className="text-[9px] font-mono text-fuchsia-400 hover:text-fuchsia-200 underline cursor-pointer"
                            >
                              {lang === 'en' ? 'Ask AI about this upgrade →' : 'Zapytaj AI o tę zmianę →'}
                            </button>
                          </div>
                          <p className="text-[10.5px] leading-relaxed mt-0.5 text-fuchsia-200/90">
                            {activeAiNote}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Main Content View based on mode */}
                    <div className="bg-neutral-950 p-3 sm:p-4 border border-editorial-border/60 max-h-80 sm:max-h-96 overflow-y-auto">
                      {versionMode === 'diff' ? (
                        <div className="space-y-3 text-xs font-mono">
                          <div className="p-2.5 bg-amber-950/20 border-l-2 border-amber-500">
                            <span className="text-amber-400 font-bold block mb-1 uppercase text-[9.5px]">
                              {lang === 'en' ? '--- v1.0 Raw Developer Draft ---' : '--- v1.0 Surowy Szkic Deweloperski ---'}
                            </span>
                            <pre className="whitespace-pre-wrap font-mono text-[10.5px] text-zinc-300">
                              {activeDraftContent}
                            </pre>
                          </div>

                          <div className="p-2.5 bg-fuchsia-950/20 border-l-2 border-fuchsia-500">
                            <span className="text-fuchsia-400 font-bold block mb-1 uppercase text-[9.5px]">
                              {lang === 'en' ? '+++ v2.0 AI Polished & Formatted Version +++' : '+++ v2.0 Wersja Zredagowana przez AI +++'}
                            </span>
                            <pre className="whitespace-pre-wrap font-mono text-[10.5px] text-zinc-200">
                              {activeV2Content}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-invert max-w-none text-xs leading-relaxed text-zinc-300 font-sans">
                          <Markdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ node, href, children, ...props }) => {
                                const safeHref = (href && !href.startsWith('file:') && !href.startsWith('file:///')) ? href : '#';
                                return <a href={safeHref} className="text-cyan-400 underline hover:text-white font-mono break-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                              },
                              img: ({ node, src, alt, ...props }) => {
                                const safeSrc = (src && !src.startsWith('file:') && !src.startsWith('file:///')) ? src : '';
                                if (!safeSrc) return null;
                                return <img src={safeSrc} alt={alt || ''} className="max-w-full my-2 border border-editorial-border" {...props} />;
                              }
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
            )}

            {/* TAB 2: INTERACTIVE ARTICLE AI CHAT & INSPECTOR */}
            {activeTab === 'interactive_chat' && (
              <div className="space-y-3 font-mono min-w-0">
                {/* Header bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-950 border border-editorial-border text-xs min-w-0">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px] shrink-0">
                    <Terminal size={13} className="text-cyan-400" />
                    <span>DEV LOG AI CHAT ASSISTANT</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Engine Status / Drawer Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowApiKeyConfig(prev => !prev)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        localApiKey
                          ? `${savedProvider.badgeClass} hover:brightness-110`
                          : 'bg-neutral-900 border-editorial-border text-editorial-muted hover:text-white hover:border-cyan-400'
                      }`}
                      title={lang === 'en' ? 'Configure Google Gemini or Local PC Engine (Ollama / LM Studio)' : 'Skonfiguruj Google Gemini lub Silnik Lokalny PC (Ollama / LM Studio)'}
                    >
                      <Key size={11} className={localApiKey ? savedProvider.textClass : 'text-cyan-400'} />
                      <span>
                        {localApiKey
                          ? `${savedProvider.shortName}: ${activeModel ? activeModel.split('-')[0].toUpperCase() : 'ACTIVE'}`
                          : (lang === 'en' ? 'AI Engine: Setup' : 'Silnik AI: Ustaw')}
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
                      className="px-2 py-1 text-[10px] text-editorial-muted hover:text-white bg-neutral-900 border border-editorial-border hover:border-neutral-700 transition-all cursor-pointer"
                      title={lang === 'en' ? 'Clear chat history' : 'Wyczyść historię czatu'}
                    >
                      {lang === 'en' ? 'Clear' : 'Wyczyść'}
                    </button>
                  </div>
                </div>

                {/* Collapsible Local & Google AI Configuration Box */}
                {showApiKeyConfig && (
                  <div className="p-3.5 bg-neutral-950 border border-cyan-500/60 space-y-3 animate-fadeIn text-xs font-sans">
                    <div className="flex items-start justify-between gap-2 border-b border-editorial-border/60 pb-2">
                      <div className="flex items-center gap-2 text-cyan-300 font-mono font-bold uppercase text-[11px]">
                        <ShieldCheck size={14} className="text-emerald-400" />
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
                                  if (!selectedModel || selectedModel === 'gemini-2.5-flash') setSelectedModel('local-model');
                                } else {
                                  setCustomBaseUrl('');
                                  setSelectedModel('gemini-2.5-flash');
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

                      {/* Model Input - Directly type and name any model */}
                      <div className="pt-1.5 border-t border-editorial-border/40 space-y-1.5">
                        <label className="text-[9.5px] text-editorial-muted uppercase font-bold flex items-center justify-between">
                          <span>{lang === 'en' ? 'Model Name (Type any model):' : 'Nazwa Modelu (Wpisz i Nazwij):'}</span>
                          <span className="text-[8.5px] text-editorial-muted font-mono lowercase">
                            {effectiveProviderInfo.id === 'custom' || effectiveProviderInfo.isLocal
                              ? 'np. llama3.2, deepseek-r1:8b, local-model'
                              : 'np. gemini-2.5-flash, gemini-2.5-pro'}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={selectedModel || (effectiveProviderInfo.isLocal ? 'llama3.2' : 'gemini-2.5-flash')}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          placeholder={effectiveProviderInfo.isLocal ? 'llama3.2' : 'gemini-2.5-flash'}
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
                          onClick={handleSaveApiKey}
                          className="px-3 py-1.5 bg-cyan-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Save size={12} />
                          <span>{lang === 'en' ? 'Save' : 'Zapisz'}</span>
                        </button>

                        {(localApiKey || customBaseUrl || selectedProviderId !== 'unknown') && (
                          <button
                            type="button"
                            onClick={handleClearApiKey}
                            className="px-2.5 py-1.5 bg-rose-950/70 border border-rose-800 text-rose-300 font-mono font-bold text-xs uppercase hover:bg-rose-900 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 size={12} />
                            <span>{lang === 'en' ? 'Reset' : 'Wyczyść'}</span>
                          </button>
                        )}
                      </div>

                      {keyStatusFeedback && (
                        <div className="p-1.5 bg-cyan-950/80 border border-cyan-400 text-cyan-300 font-mono text-[9.5px]">
                          {keyStatusFeedback}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Article Selector Slider in Chat Tab */}
                <div className="bg-neutral-900/60 border border-editorial-border p-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-editorial-muted text-[10px] uppercase font-bold">
                        {lang === 'en' ? 'Target Article:' : 'Wybrany Artykuł:'}
                      </span>
                      <span className="text-[10px] text-cyan-400 font-bold">
                        #{selectedPost?.id}
                      </span>
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

                  {/* Horizontal Scroll Slider Bar for Chat Tab */}
                  <div 
                    ref={chatSliderRef}
                    className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 scroll-smooth select-none scrollbar-thin scrollbar-thumb-neutral-800 overscroll-contain snap-x snap-mandatory min-w-0 max-w-full w-full"
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
                          className={`snap-start shrink-0 w-[min(260px,78vw)] p-2 border transition-all cursor-pointer flex flex-col justify-between text-left ${
                            isSelected
                              ? 'bg-[#0A1624] border-cyan-400 shadow-sm shadow-cyan-400/20 ring-1 ring-cyan-400/50'
                              : 'bg-neutral-950/80 border-editorial-border hover:border-editorial-border/90 hover:bg-neutral-900/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1 text-[8.5px] font-mono">
                              <span className={`px-1 py-0.2 border font-bold ${
                                isSelected 
                                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200' 
                                    : 'bg-neutral-900 border-editorial-border text-editorial-muted'
                              }`}>
                                #{p.id}
                              </span>
                              <span className="text-editorial-muted text-[8px] truncate">
                                {p.date}
                              </span>
                            </div>
                            <h4 className={`text-[10px] font-mono line-clamp-1 leading-tight ${
                              isSelected ? 'text-white font-bold' : 'text-zinc-300'
                            }`}>
                              {pTitle}
                            </h4>
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 mt-1 border-t border-editorial-border/30 text-[8px] font-mono text-editorial-muted">
                            <span className="truncate">
                              {p.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
                            </span>
                            {isSelected && (
                              <span className="text-cyan-400 font-bold uppercase text-[7.5px] shrink-0">
                                ● {lang === 'en' ? 'Active' : 'Aktywny'}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Action Preset Prompt Chips */}
                <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleShowApiKeyGuideInBlog()}
                    className="px-2.5 py-1 bg-sky-950/70 hover:bg-sky-900 border border-sky-500 hover:border-sky-300 text-sky-200 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-none flex items-center gap-1 shadow-sm"
                  >
                    <span>🔑</span>
                    <span>{lang === 'en' ? 'API Key Guide' : 'Instrukcja klucza API'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en' ? 'Discuss v2.0 AI synthesis & architectural upgrades.' : 'Przedyskutuj syntezę v2.0 AI i architekturę.')}
                    className="px-2.5 py-1 bg-fuchsia-950/60 hover:bg-fuchsia-900 border border-fuchsia-700/80 hover:border-fuchsia-400 text-fuchsia-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-none flex items-center gap-1"
                  >
                    <span>🤖</span>
                    <span>{lang === 'en' ? 'Discuss v2.0 AI' : 'Dyskutuj o v2.0 AI'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en' ? 'Compare v1.0 developer draft vs v2.0 AI version in detail.' : 'Porównaj szczegółowo surowy szkic v1.0 z wersją v2.0 AI.')}
                    className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-700/80 hover:border-amber-400 text-amber-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-none flex items-center gap-1"
                  >
                    <span>⚖️</span>
                    <span>{lang === 'en' ? 'v1.0 vs v2.0 Diff' : 'Porównaj v1.0 z v2.0'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en' ? 'Summarize key takeaways of this article.' : 'Podsumuj kluczowe wnioski z tego artykułu.')}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-cyan-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-none flex items-center gap-1"
                  >
                    <span>💡</span>
                    <span>{lang === 'en' ? 'Key Takeaways' : 'Główne wnioski'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage(lang === 'en' ? 'Extract code snippets and technical commands.' : 'Wyciągnij fragmenty kodu i komendy techniczne.')}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-emerald-400 text-emerald-300 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap rounded-none flex items-center gap-1"
                  >
                    <span>💻</span>
                    <span>{lang === 'en' ? 'Code Snippets' : 'Fragmenty kodu'}</span>
                  </button>
                </div>

                {/* Chat Stream Window */}
                <div 
                  ref={chatContainerRef}
                  className="bg-neutral-950 border border-editorial-border p-3 sm:p-4 h-[min(14rem,35svh)] sm:h-[min(24rem,45svh)] overflow-y-auto space-y-3 min-w-0 overscroll-contain"
                >
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} min-w-0`}
                    >
                      <div className="flex items-center gap-1.5 text-[8.5px] text-editorial-muted mb-0.5">
                        <span>{msg.sender === 'user' ? (lang === 'en' ? 'DEVELOPER' : 'DEWELOPER') : 'JOURNAL AI'}</span>
                        <span>•</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div
                        className={`p-3 max-w-full sm:max-w-2xl text-[11px] sm:text-xs font-mono leading-relaxed border break-words overflow-x-auto min-w-0 ${
                          msg.sender === 'user'
                            ? 'bg-[#181510] border-editorial-accent text-editorial-accent'
                            : 'bg-editorial-sidebar-bg border-editorial-border text-zinc-200'
                        }`}
                      >
                        <Markdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2 leading-relaxed break-words" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                            li: ({ node, ...props }) => <li className="leading-relaxed break-words" {...props} />,
                            a: ({ node, href, children, ...props }) => {
                              const safeHref = (href && !href.startsWith('file:') && !href.startsWith('file:///')) ? href : '#';
                              return <a href={safeHref} className="text-cyan-400 underline hover:text-white font-mono break-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                            },
                            img: ({ node, src, alt, ...props }) => {
                              const safeSrc = (src && !src.startsWith('file:') && !src.startsWith('file:///')) ? src : '';
                              if (!safeSrc) return null;
                              return <img src={safeSrc} alt={alt || ''} className="max-w-full my-2 border border-editorial-border" {...props} />;
                            },
                            pre: ({ node, ...props }) => <pre className="p-2 my-2 bg-neutral-900 border border-editorial-border overflow-x-auto text-[10.5px] font-mono text-cyan-300 rounded-none max-w-full" {...props} />,
                            code: ({ node, ...props }) => <code className="px-1 py-0.5 bg-neutral-900 text-fuchsia-300 border border-editorial-border/60 text-[10.5px] font-mono rounded-none" {...props} />,
                          }}
                        >
                          {msg.text.replace(/file:\/\/\/[^\s\)"']*/gi, '#').replace(/file:\/\/[^\s\)"']*/gi, '#')}
                        </Markdown>
                      </div>
                    </div>
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

                {/* Input Bar */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    if (isAiThinking) {
                      handleStopAi();
                    } else {
                      handleSendMessage();
                    }
                  }}
                  className="flex gap-2 min-w-0"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={e => setInputQuery(e.target.value)}
                    placeholder={
                      isAiThinking
                        ? (lang === 'en' ? 'AI is analyzing article... Click Stop to cancel.' : 'AI analizuje treść wpisu... Kliknij Zatrzymaj, aby anulować.')
                        : (lang === 'en' ? 'Ask AI about this article...' : 'Zapytaj AI o ten artykuł...')
                    }
                    disabled={isAiThinking}
                    className="flex-1 bg-neutral-950 border border-editorial-border p-2 text-white text-xs font-mono focus:border-cyan-400 outline-none min-w-0 disabled:opacity-60"
                  />
                  {isAiThinking ? (
                    <button
                      type="button"
                      onClick={handleStopAi}
                      className="px-3 sm:px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-500 text-red-300 hover:text-white font-bold uppercase tracking-wider text-[10.5px] sm:text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 font-mono shadow-sm animate-pulse"
                      title={lang === 'en' ? 'Stop AI analysis' : 'Zatrzymaj analizę AI'}
                    >
                      <Square size={12} className="fill-red-300" />
                      <span>{lang === 'en' ? 'Stop' : 'Zatrzymaj'}</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!inputQuery.trim()}
                      className="px-3 sm:px-4 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 text-cyan-300 font-bold uppercase tracking-wider text-[10.5px] sm:text-[11px] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shrink-0 font-mono"
                    >
                      <Send size={12} />
                      <span>{lang === 'en' ? 'Ask AI' : 'Zapytaj'}</span>
                    </button>
                  )}
                </form>
              </div>
            )}

            {/* TAB 3: JOURNAL INDEX & TAG ANALYTICS */}
            {activeTab === 'analytics' && (
              <div className="space-y-4 font-mono min-w-0">
                {/* Tags Filter Strip matching Repo style */}
                <div className="flex items-center gap-1.5 flex-wrap pb-2.5 border-b border-editorial-border min-w-0">
                  <span className="text-editorial-muted text-[10px] sm:text-xs uppercase font-bold tracking-wider mr-1 shrink-0 font-mono">
                    {lang === 'en' ? 'Open Galaxy Graph for tag:' : 'Otwórz Galaxy Graph dla tagu:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenGalaxyGraph) onOpenGalaxyGraph('all');
                    }}
                    className="shrink-0 text-[10px] sm:text-xs font-mono uppercase px-2 py-1 border transition-all cursor-pointer font-semibold bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white"
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
                        className="shrink-0 text-[10px] sm:text-xs font-mono uppercase px-2 py-1 border transition-all cursor-pointer font-semibold bg-neutral-900 text-editorial-muted border-editorial-border hover:text-white"
                      >
                        #{tag.toUpperCase()} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Article List Table matching repo card layout */}
                <div className="space-y-2 min-w-0">
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
                        className="p-3 bg-editorial-sidebar-bg border border-editorial-border hover:border-editorial-accent/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer group hover:bg-neutral-900/60 min-w-0"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold font-mono text-white group-hover:text-editorial-accent transition-colors truncate">
                              #{post.id} - {title}
                            </span>
                            <span className="text-[8.5px] px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-bold">
                              {post.date}
                            </span>
                          </div>
                          <p className="text-[10.5px] text-editorial-muted font-sans line-clamp-1">
                            {excerpt}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-[9.5px] text-editorial-muted">
                          <div className="flex gap-1 flex-wrap">
                            {post.tags.map(t => (
                              <span
                                key={t}
                                className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-accent font-semibold"
                              >
                                #{t.toUpperCase()}
                              </span>
                            ))}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-semibold whitespace-nowrap shrink-0">
                            <Clock size={9} className="text-editorial-accent shrink-0" />
                            {readTime}
                          </span>
                          <span className="text-editorial-accent group-hover:translate-x-0.5 transition-transform font-bold">
                            →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* stopka z przyciskami */}
          <div className="shrink-0 border-t border-editorial-border px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 bg-editorial-sidebar-bg min-w-0 font-mono text-xs short:hidden">
            <div className="hidden sm:flex text-[10px] sm:text-xs text-editorial-muted uppercase tracking-wider items-center gap-1.5 min-w-0 flex-1 truncate">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse shrink-0" />
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
                  className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-none border border-fuchsia-500/70 text-fuchsia-300 hover:bg-fuchsia-500/10 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
                >
                  <Sparkles size={12} className="text-fuchsia-400 shrink-0" />
                  <span>{lang === 'en' ? 'GALAXY GRAPH' : 'GRAF GALAKTYKI'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-none border border-editorial-accent text-editorial-accent hover:bg-editorial-accent/10 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0"
              >
                <span className="sm:hidden">{lang === 'en' ? 'CLOSE' : 'ZAMKNIJ'}</span>
                <span className="hidden sm:inline">{lang === 'en' ? 'CLOSE INSPECTOR' : 'ZAMKNIJ INSPEKTOR'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
