// Storage helper for Google Gemini and Local PC AI Engines (Ollama, LM Studio, Custom Localhost)
export type AIProviderId = 
  | 'gemini' 
  | 'ollama'
  | 'lmstudio'
  | 'custom'
  | 'unknown';

export interface AIModelOption {
  id: string;
  labelPl: string;
  labelEn: string;
  badge?: string;
}

export interface AIProviderInfo {
  id: AIProviderId;
  namePl: string;
  nameEn: string;
  name: string; // legacy fallback
  shortNamePl: string;
  shortNameEn: string;
  shortName: string;
  vendor: string;
  prefix?: string;
  defaultBaseUrl?: string;
  defaultModel: string;
  availableModels: AIModelOption[];
  badgeClass: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  placeholderPl: string;
  placeholderEn: string;
  placeholder: string;
  docUrl: string;
  docLabelPl: string;
  docLabelEn: string;
  docLabel: string;
  descriptionPl: string;
  descriptionEn: string;
  isLocal?: boolean;
  requiresKey?: boolean;
}

export const PROVIDERS_CONFIG: Record<AIProviderId, AIProviderInfo> = {
  gemini: {
    id: 'gemini',
    namePl: 'Google Gemini (Chmura / Cloud API)',
    nameEn: 'Google Gemini (Cloud API)',
    name: 'Google Gemini (Cloud API)',
    shortNamePl: 'Google Gemini',
    shortNameEn: 'Google Gemini',
    shortName: 'Gemini',
    vendor: 'Google',
    prefix: 'AIzaSy',
    defaultModel: 'gemini-flash-latest',
    availableModels: [
      { id: 'gemini-flash-latest', labelPl: 'Gemini Flash (Domyślny / Auto Latest)', labelEn: 'Gemini Flash (Default / Auto Latest)', badge: 'Default' },
      { id: 'gemini-pro-latest', labelPl: 'Gemini Pro (Auto Latest)', labelEn: 'Gemini Pro (Auto Latest)' },
    ],
    badgeClass: 'bg-sky-950/70 border-sky-500/70 text-sky-300',
    borderClass: 'border-sky-500/60',
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-950/30',
    placeholderPl: 'AIzaSy... (z Google AI Studio)',
    placeholderEn: 'AIzaSy... (from Google AI Studio)',
    placeholder: 'AIzaSy... (z Google AI Studio)',
    docUrl: 'https://aistudio.google.com/app/apikey',
    docLabelPl: 'Google AI Studio (Pobierz darmowy klucz)',
    docLabelEn: 'Google AI Studio (Get free API key)',
    docLabel: 'Google AI Studio (aistudio.google.com)',
    descriptionPl: 'Oficjalne API Google Gemini z automatyczną obsługą najnowszego modelu Flash (Auto Latest). Darmowy klucz API dostępny w Google AI Studio.',
    descriptionEn: 'Official Google Gemini API automatically routing to the latest active Flash model (Auto Latest). Free instant API keys at Google AI Studio.',
    requiresKey: true,
  },
  ollama: {
    id: 'ollama',
    namePl: 'Ollama (Lokalny PC / Serwer)',
    nameEn: 'Ollama (Local PC / Server)',
    name: 'Ollama (Local PC / Server)',
    shortNamePl: 'Ollama (Lokalny)',
    shortNameEn: 'Ollama (Local)',
    shortName: 'Ollama (Local)',
    vendor: 'Local',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    availableModels: [
      { id: 'llama3.2', labelPl: 'Llama 3.2 (Domyślny / Local)', labelEn: 'Llama 3.2 (Default / Local)', badge: 'Default' },
      { id: 'llama3.3', labelPl: 'Llama 3.3 (70B)', labelEn: 'Llama 3.3 (70B)' },
      { id: 'deepseek-r1:8b', labelPl: 'DeepSeek R1 (8B Wnioskowanie)', labelEn: 'DeepSeek R1 (8B Reasoning)' },
      { id: 'deepseek-r1:14b', labelPl: 'DeepSeek R1 (14B)', labelEn: 'DeepSeek R1 (14B)' },
      { id: 'qwen2.5-coder:7b', labelPl: 'Qwen 2.5 Coder (7B)', labelEn: 'Qwen 2.5 Coder (7B)' },
      { id: 'mistral:latest', labelPl: 'Mistral Latest', labelEn: 'Mistral Latest' },
      { id: 'gemma2:9b', labelPl: 'Gemma 2 (9B)', labelEn: 'Gemma 2 (9B)' },
    ],
    badgeClass: 'bg-teal-950/80 border-teal-400/80 text-teal-300',
    borderClass: 'border-teal-400/60',
    textClass: 'text-teal-400',
    bgClass: 'bg-teal-950/30',
    placeholderPl: 'Brak wymaganego klucza (100% lokalnie)',
    placeholderEn: 'No API key needed (100% local)',
    placeholder: 'Brak wymaganego klucza (100% lokalnie)',
    docUrl: 'https://ollama.com/',
    docLabelPl: 'Pobierz Ollama (ollama.com)',
    docLabelEn: 'Download Ollama (ollama.com)',
    docLabel: 'Ollama Setup (ollama.com)',
    descriptionPl: 'Uruchamiaj dowolne modele AI w 100% lokalnie na swoim komputerze przez Ollama (domyślnie: http://localhost:11434/v1). 100% prywatności, brak konieczności podawania klucza i 0 zł za tokeny.',
    descriptionEn: 'Run AI models completely locally on your computer via Ollama (http://localhost:11434/v1). 100% private, no API key needed, zero costs.',
    isLocal: true,
    requiresKey: false,
  },
  lmstudio: {
    id: 'lmstudio',
    namePl: 'LM Studio (Lokalny PC)',
    nameEn: 'LM Studio (Local PC)',
    name: 'LM Studio (Local PC)',
    shortNamePl: 'LM Studio (Lokalny)',
    shortNameEn: 'LM Studio (Local)',
    shortName: 'LM Studio',
    vendor: 'Local',
    defaultBaseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    availableModels: [
      { id: 'local-model', labelPl: 'Załadowany model w LM Studio', labelEn: 'Currently loaded LM Studio model', badge: 'Active' },
      { id: 'deepseek-r1', labelPl: 'DeepSeek R1 (Local)', labelEn: 'DeepSeek R1 (Local)' },
      { id: 'qwen2.5-coder', labelPl: 'Qwen 2.5 Coder (Local)', labelEn: 'Qwen 2.5 Coder (Local)' },
      { id: 'hermes-3-llama-3.1-8b', labelPl: 'Hermes 3 (Local)', labelEn: 'Hermes 3 (Local)' },
    ],
    badgeClass: 'bg-cyan-950/80 border-cyan-400/80 text-cyan-300',
    borderClass: 'border-cyan-400/60',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-950/30',
    placeholderPl: 'Brak wymaganego klucza (Serwer lokalny LM Studio)',
    placeholderEn: 'No API key needed (LM Studio local server)',
    placeholder: 'Brak wymaganego klucza (Lokalny serwer LM Studio)',
    docUrl: 'https://lmstudio.ai/',
    docLabelPl: 'Pobierz LM Studio (lmstudio.ai)',
    docLabelEn: 'Download LM Studio (lmstudio.ai)',
    docLabel: 'LM Studio (lmstudio.ai)',
    descriptionPl: 'Połączenie z lokalnym serwerem LM Studio (domyślnie: http://localhost:1234/v1). Wystarczy kliknąć "Start Server" w programie LM Studio na swoim PC.',
    descriptionEn: 'Connect to your local LM Studio server (http://localhost:1234/v1). Simply click "Start Server" in LM Studio on your PC.',
    isLocal: true,
    requiresKey: false,
  },
  custom: {
    id: 'custom',
    namePl: 'Własny Lokalny Host / Custom Endpoint',
    nameEn: 'Custom Local Host / Endpoint',
    name: 'Własny Lokalny Host / Custom Endpoint',
    shortNamePl: 'Własny Host',
    shortNameEn: 'Custom Host',
    shortName: 'Custom Localhost',
    vendor: 'Custom',
    defaultBaseUrl: 'http://localhost:8080/v1',
    defaultModel: 'local-model',
    availableModels: [
      { id: 'local-model', labelPl: 'local-model (Domyślny)', labelEn: 'local-model (Default)' },
      { id: 'llama3.2', labelPl: 'llama3.2', labelEn: 'llama3.2' },
      { id: 'deepseek-r1', labelPl: 'deepseek-r1', labelEn: 'deepseek-r1' },
      { id: 'qwen2.5-coder', labelPl: 'qwen2.5-coder', labelEn: 'qwen2.5-coder' },
    ],
    badgeClass: 'bg-pink-950/70 border-pink-500/70 text-pink-300',
    borderClass: 'border-pink-500/60',
    textClass: 'text-pink-400',
    bgClass: 'bg-pink-950/30',
    placeholderPl: 'Opcjonalny klucz API (jeśli serwer wymaga)...',
    placeholderEn: 'Optional API key (if server requires authentication)...',
    placeholder: 'Opcjonalny klucz API (jeśli wymagany)...',
    docUrl: 'https://github.com/tomekdot',
    docLabelPl: 'Własny Serwer / Proxy',
    docLabelEn: 'Custom Server / Proxy',
    docLabel: 'Własny Endpoint / Serwer Lokalny',
    descriptionPl: 'Dowolny własny lokalny serwer vLLM, Text Generation WebUI, proxy lub platforma OpenAI-compatible uruchomiona na Twoim komputerze.',
    descriptionEn: 'Any custom local server, vLLM, or OpenAI-compatible endpoint running on your machine.',
    isLocal: true,
    requiresKey: false,
  },
  unknown: {
    id: 'unknown',
    namePl: 'Google Gemini / Lokalny Silnik',
    nameEn: 'Google Gemini / Local Engine',
    name: 'Google Gemini / Local Engine',
    shortNamePl: 'Auto AI',
    shortNameEn: 'Auto AI',
    shortName: 'Auto AI',
    vendor: 'Universal',
    defaultModel: 'gemini-flash-latest',
    availableModels: [
      { id: 'gemini-flash-latest', labelPl: 'Gemini Flash (Domyślny / Auto Latest)', labelEn: 'Gemini Flash (Default / Auto Latest)' },
      { id: 'gemini-pro-latest', labelPl: 'Gemini Pro (Auto Latest)', labelEn: 'Gemini Pro (Auto Latest)' },
    ],
    badgeClass: 'bg-neutral-900 border-neutral-700 text-neutral-300',
    borderClass: 'border-neutral-700',
    textClass: 'text-neutral-300',
    bgClass: 'bg-neutral-900',
    placeholderPl: 'Wklej klucz Gemini lub wybierz silnik lokalny...',
    placeholderEn: 'Paste Gemini key or select a local engine...',
    placeholder: 'Wklej klucz Gemini lub wybierz silnik lokalny...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    docLabelPl: 'Google AI Studio',
    docLabelEn: 'Google AI Studio',
    docLabel: 'Google AI Studio',
    descriptionPl: 'Wybierz Google Gemini z najnowszym modelem Flash lub podłącz silnik lokalny (Ollama / LM Studio) działający na Twoim komputerze.',
    descriptionEn: 'Select Google Gemini with latest Flash model or connect local engines (Ollama / LM Studio) running on your machine.',
    requiresKey: true,
  },
};

/**
 * Returns localized name for provider.
 */
export function getProviderName(provider: AIProviderInfo, lang: 'en' | 'pl'): string {
  return lang === 'en' ? provider.nameEn : provider.namePl;
}

/**
 * Returns localized short name for provider.
 */
export function getProviderShortName(provider: AIProviderInfo, lang: 'en' | 'pl'): string {
  return lang === 'en' ? provider.shortNameEn : provider.shortNamePl;
}

/**
 * Returns localized placeholder for provider.
 */
export function getProviderPlaceholder(provider: AIProviderInfo, lang: 'en' | 'pl'): string {
  return lang === 'en' ? provider.placeholderEn : provider.placeholderPl;
}

/**
 * Returns localized doc label for provider.
 */
export function getProviderDocLabel(provider: AIProviderInfo, lang: 'en' | 'pl'): string {
  return lang === 'en' ? provider.docLabelEn : provider.docLabelPl;
}

/**
 * Returns localized model label.
 */
export function getModelLabel(model: AIModelOption, lang: 'en' | 'pl'): string {
  return lang === 'en' ? model.labelEn : model.labelPl;
}

const STORAGE_KEY_UNIFIED = 'tomekdot_custom_ai_api_key';
const STORAGE_KEY_LEGACY = 'tomekdot_custom_gemini_api_key';
const STORAGE_MODEL_KEY = 'tomekdot_custom_ai_model';
const STORAGE_PROVIDER_KEY = 'tomekdot_custom_ai_provider';
const STORAGE_BASE_URL_KEY = 'tomekdot_custom_ai_base_url';

/**
 * Automatically inspects key string and determines which provider it belongs to.
 */
export function detectAIProvider(rawKey: string, explicitProvider?: AIProviderId): AIProviderInfo {
  if (explicitProvider && explicitProvider !== 'unknown' && PROVIDERS_CONFIG[explicitProvider]) {
    return PROVIDERS_CONFIG[explicitProvider];
  }

  const trimmed = (rawKey || '').trim();
  if (!trimmed) {
    return PROVIDERS_CONFIG.unknown;
  }

  // 1. Google Gemini (AIzaSy... or standard Google Cloud key)
  if (trimmed.startsWith('AIza') || trimmed.startsWith('aiza') || trimmed.length > 15) {
    return PROVIDERS_CONFIG.gemini;
  }

  return PROVIDERS_CONFIG.unknown;
}

/**
 * Retrieves the currently saved universal AI API key.
 */
export function getLocalAIKey(): string {
  try {
    const key = localStorage.getItem(STORAGE_KEY_UNIFIED) ||
      sessionStorage.getItem(STORAGE_KEY_UNIFIED) ||
      localStorage.getItem(STORAGE_KEY_LEGACY) ||
      sessionStorage.getItem(STORAGE_KEY_LEGACY) ||
      '';
    return key.trim();
  } catch {
    return '';
  }
}

/**
 * Retrieves the selected model ID for the active key.
 */
export function getLocalAIModel(): string {
  try {
    return localStorage.getItem(STORAGE_MODEL_KEY) || sessionStorage.getItem(STORAGE_MODEL_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Retrieves the custom provider ID if explicitly chosen.
 */
export function getLocalAIProvider(): AIProviderId {
  try {
    const val = (localStorage.getItem(STORAGE_PROVIDER_KEY) || sessionStorage.getItem(STORAGE_PROVIDER_KEY) || '') as AIProviderId;
    if (val && PROVIDERS_CONFIG[val]) return val;
  } catch {}
  return 'unknown';
}

/**
 * Retrieves custom base URL if configured (e.g. for Ollama, LM Studio, xAI, custom proxy).
 */
export function getLocalAIBaseUrl(): string {
  try {
    return localStorage.getItem(STORAGE_BASE_URL_KEY) || sessionStorage.getItem(STORAGE_BASE_URL_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Saves universal AI key, selected model, provider override, and custom Base URL.
 */
export function setLocalAIKey(
  key: string, 
  sessionOnly = false, 
  customModel?: string, 
  customProvider?: AIProviderId,
  customBaseUrl?: string
): void {
  const trimmedKey = (key || '').trim();
  const provider = customProvider || detectAIProvider(trimmedKey).id;
  const model = (customModel || '').trim() || detectAIProvider(trimmedKey, provider).defaultModel;
  const baseUrl = (customBaseUrl || '').trim();

  try {
    if (sessionOnly) {
      sessionStorage.setItem(STORAGE_KEY_UNIFIED, trimmedKey);
      sessionStorage.setItem(STORAGE_KEY_LEGACY, trimmedKey);
      sessionStorage.setItem(STORAGE_PROVIDER_KEY, provider);
      if (model) sessionStorage.setItem(STORAGE_MODEL_KEY, model);
      if (baseUrl) sessionStorage.setItem(STORAGE_BASE_URL_KEY, baseUrl);

      localStorage.removeItem(STORAGE_KEY_UNIFIED);
      localStorage.removeItem(STORAGE_KEY_LEGACY);
      localStorage.removeItem(STORAGE_PROVIDER_KEY);
      localStorage.removeItem(STORAGE_MODEL_KEY);
      localStorage.removeItem(STORAGE_BASE_URL_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_UNIFIED, trimmedKey);
      localStorage.setItem(STORAGE_KEY_LEGACY, trimmedKey);
      localStorage.setItem(STORAGE_PROVIDER_KEY, provider);
      if (model) localStorage.setItem(STORAGE_MODEL_KEY, model);
      if (baseUrl) {
        localStorage.setItem(STORAGE_BASE_URL_KEY, baseUrl);
      } else {
        localStorage.removeItem(STORAGE_BASE_URL_KEY);
      }
    }
  } catch (e) {
    console.warn('Could not save API config to storage', e);
  }
}

/**
 * Clears the stored AI API key & config from all storage.
 */
export function clearLocalAIKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_UNIFIED);
    localStorage.removeItem(STORAGE_KEY_LEGACY);
    localStorage.removeItem(STORAGE_PROVIDER_KEY);
    localStorage.removeItem(STORAGE_MODEL_KEY);
    localStorage.removeItem(STORAGE_BASE_URL_KEY);
    sessionStorage.removeItem(STORAGE_KEY_UNIFIED);
    sessionStorage.removeItem(STORAGE_KEY_LEGACY);
    sessionStorage.removeItem(STORAGE_PROVIDER_KEY);
    sessionStorage.removeItem(STORAGE_MODEL_KEY);
    sessionStorage.removeItem(STORAGE_BASE_URL_KEY);
  } catch (e) {
    console.warn('Could not clear API key', e);
  }
}

// Backward compatibility exports
export const getLocalGeminiApiKey = getLocalAIKey;
export const setLocalGeminiApiKey = (key: string, sessionOnly = false) => setLocalAIKey(key, sessionOnly);
export const clearLocalGeminiApiKey = clearLocalAIKey;
