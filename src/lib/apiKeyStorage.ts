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
    prefix: 'AIzaSy / AQ.',
    defaultModel: 'gemini-3.1-flash-lite',
    availableModels: [
      { id: 'gemini-3.1-flash-lite', labelPl: '3.1 Flash Lite (Domyślny • $0.25/$1.50)', labelEn: '3.1 Flash Lite (Default • $0.25/$1.50)', badge: 'Default' },
      { id: 'gemini-3.5-flash-lite', labelPl: '3.5 Flash Lite ($0.30/$2.50)', labelEn: '3.5 Flash Lite ($0.30/$2.50)', badge: '3.5 Lite' },
      { id: 'gemini-3.8-flash', labelPl: '3.8 Flash (Agentowy • $0.75/$3.75)', labelEn: '3.8 Flash (Agentic • $0.75/$3.75)', badge: '3.8' },
      { id: 'gemini-4-hydrogen', labelPl: '4 Hydrogen (Nowy • $1.50/$7.50)', labelEn: '4 Hydrogen (New • $1.50/$7.50)', badge: 'New' },
      { id: 'gemini-4-argon', labelPl: '4 Argon (Paid • $2.00/$10.00)', labelEn: '4 Argon (Paid • $2.00/$10.00)', badge: 'Paid' },
      { id: 'gemini-4-carbon', labelPl: '4 Carbon (Paid • New • $2.00/$10.00)', labelEn: '4 Carbon (Frontier • Paid • $2.00/$10.00)', badge: 'New • Paid' },
    ],
    badgeClass: 'bg-sky-950/70 border-sky-500/70 text-sky-300',
    borderClass: 'border-sky-500/60',
    textClass: 'text-sky-400',
    bgClass: 'bg-sky-950/30',
    placeholderPl: 'AIzaSy... lub AQ.... (Google AI Studio / Vertex Express)',
    placeholderEn: 'AIzaSy... or AQ.... (Google AI Studio / Vertex Express)',
    placeholder: 'AIzaSy... lub AQ.... (Google AI Studio / Vertex Express)',
    docUrl: 'https://aistudio.google.com/app/apikey',
    docLabelPl: 'Google AI Studio (Pobierz darmowy klucz)',
    docLabelEn: 'Google AI Studio (Get free API key)',
    docLabel: 'Google AI Studio (aistudio.google.com)',
    descriptionPl: 'Oficjalne API Google Gemini (klucze AIza... oraz Vertex AI Express AQ....) z obsługą licznika tokenów i automatycznym trybem offline po wyczerpaniu quota.',
    descriptionEn: 'Official Google Gemini API (AIza... and Vertex AI Express AQ.... keys) with token tracking and automatic offline fallback only when quota is exhausted.',
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
      { id: 'llama3.2', labelPl: 'Llama 3.2', labelEn: 'Llama 3.2' },
      { id: 'llama3.3', labelPl: 'Llama 3.3 (70B)', labelEn: 'Llama 3.3 (70B)' },
      { id: 'deepseek-r1:8b', labelPl: 'DeepSeek R1 (8B)', labelEn: 'DeepSeek R1 (8B)' },
      { id: 'deepseek-r1:14b', labelPl: 'DeepSeek R1 (14B)', labelEn: 'DeepSeek R1 (14B)' },
      { id: 'qwen2.5-coder:7b', labelPl: 'Qwen 2.5 Coder 7B (kod)', labelEn: 'Qwen 2.5 Coder 7B (code)' },
      { id: 'mistral', labelPl: 'Mistral 7B', labelEn: 'Mistral 7B' },
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
      { id: 'deepseek-r1', labelPl: 'DeepSeek R1', labelEn: 'DeepSeek R1' },
      { id: 'qwen2.5-coder', labelPl: 'Qwen 2.5 Coder', labelEn: 'Qwen 2.5 Coder' },
      { id: 'hermes-3-llama-3.1-8b', labelPl: 'Hermes 3 (Llama 3.1 8B)', labelEn: 'Hermes 3 (Llama 3.1 8B)' },
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
      { id: 'local-model', labelPl: 'Domyślny model serwera (local-model)', labelEn: 'Default server model (local-model)', badge: 'Default' },
      { id: 'llama3.2', labelPl: 'Llama 3.2 (Meta)', labelEn: 'Llama 3.2 (Meta)' },
      { id: 'deepseek-r1', labelPl: 'DeepSeek R1 (Reasoning)', labelEn: 'DeepSeek R1 (Reasoning)' },
      { id: 'qwen2.5-coder', labelPl: 'Qwen 2.5 Coder (Alibaba)', labelEn: 'Qwen 2.5 Coder (Alibaba)' },
      { id: 'mistral', labelPl: 'Mistral (Mistral AI)', labelEn: 'Mistral (Mistral AI)' },
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
    defaultModel: 'gemini-3.1-flash-lite',
    availableModels: [
      { id: 'gemini-3.1-flash-lite', labelPl: '3.1 Flash Lite (Domyślny • $0.25/$1.50)', labelEn: '3.1 Flash Lite (Default • $0.25/$1.50)', badge: 'Default' },
      { id: 'gemini-3.5-flash-lite', labelPl: '3.5 Flash Lite ($0.30/$2.50)', labelEn: '3.5 Flash Lite ($0.30/$2.50)', badge: '3.5 Lite' },
      { id: 'gemini-3.8-flash', labelPl: '3.8 Flash (Agentowy • $0.75/$3.75)', labelEn: '3.8 Flash (Agentic • $0.75/$3.75)', badge: '3.8' },
      { id: 'gemini-4-hydrogen', labelPl: '4 Hydrogen (Nowy • $1.50/$7.50)', labelEn: '4 Hydrogen (New • $1.50/$7.50)', badge: 'New' },
      { id: 'gemini-4-argon', labelPl: '4 Argon (Paid • $2.00/$10.00)', labelEn: '4 Argon (Paid • $2.00/$10.00)', badge: 'Paid' },
      { id: 'gemini-4-carbon', labelPl: '4 Carbon (Paid • New • $2.00/$10.00)', labelEn: '4 Carbon (Frontier • Paid • $2.00/$10.00)', badge: 'New • Paid' },
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
 * Helper to dynamically fetch active model IDs from a local OpenAI-compatible endpoint (e.g. GET /v1/models or GET /models).
 */
export async function fetchLocalModels(baseUrl: string): Promise<string[]> {
  try {
    const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl) return [];
    const endpoint = cleanUrl.endsWith('/models') 
      ? cleanUrl 
      : cleanUrl.endsWith('/v1') 
        ? `${cleanUrl}/models` 
        : `${cleanUrl}/v1/models`;

    const res = await fetch(endpoint, { method: 'GET' });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json.data)) {
      return json.data.map((m: { id: string }) => m.id).filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
}

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
const STORAGE_TOKEN_LIMIT_KEY = 'tomekdot_ai_session_token_limit';
const STORAGE_MAX_OUTPUT_TOKENS_KEY = 'tomekdot_ai_max_output_tokens';
const STORAGE_TOKENS_USED_KEY = 'tomekdot_ai_session_tokens_used';
const STORAGE_QUOTA_STATUS_KEY = 'tomekdot_ai_quota_status';

export interface QuotaCheckStatus {
  valid: boolean;
  status: 'ok' | 'quota_exhausted' | 'invalid_key' | 'missing_key' | 'error';
  lang?: 'en' | 'pl';
  keyType?: string;
  endpointMode?: 'vertex' | 'studio';
  providerLabel?: string;
  resolvedModel?: string;
  testTokensUsed?: number;
  quotaInfo?: {
    tier: string;
    rpm: string;
    tpm: string;
    rpd: string;
  };
  message?: string;
  hint?: string;
  checkedAt?: string;
}

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

  // 1. Custom OpenAI / Groq keys
  if (trimmed.startsWith('sk-') || trimmed.startsWith('gsk_')) {
    return PROVIDERS_CONFIG.custom;
  }

  // 2. Google Gemini keys (starts with AIza... or AQ.... or any non-empty Google Cloud key format)
  if (/^AIza/i.test(trimmed) || /^AQ\./i.test(trimmed) || trimmed.length >= 15) {
    return PROVIDERS_CONFIG.gemini;
  }

  return PROVIDERS_CONFIG.gemini;
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
    const raw = (localStorage.getItem(STORAGE_MODEL_KEY) || sessionStorage.getItem(STORAGE_MODEL_KEY) || '').trim();
    const clean = raw.replace(/^models\//, '');
    if (
      clean === 'latest' ||
      clean === 'gemini-flash-latest' ||
      clean === 'gemini-1.5-flash' ||
      clean === 'gemini-2.5-flash' ||
      clean === 'gemini-2.5-flash-lite'
    ) {
      return 'gemini-3.1-flash-lite';
    }
    return raw;
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
  const providerConfig = PROVIDERS_CONFIG[provider] || PROVIDERS_CONFIG.unknown;
  const model = (customModel || '').trim() || providerConfig.defaultModel || 'gemini-3.1-flash-lite';
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
    localStorage.removeItem(STORAGE_QUOTA_STATUS_KEY);
  } catch (e) {
    console.warn('Could not clear API key', e);
  }
}

export function getSessionTokenLimit(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_TOKEN_LIMIT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export function setSessionTokenLimit(limit: number | null): void {
  try {
    if (limit !== null && Number.isFinite(limit) && limit > 0) {
      localStorage.setItem(STORAGE_TOKEN_LIMIT_KEY, String(Math.floor(limit)));
    } else {
      localStorage.removeItem(STORAGE_TOKEN_LIMIT_KEY);
    }
  } catch {}
}

export function getMaxOutputTokens(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_MAX_OUTPUT_TOKENS_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  } catch {
    return null;
  }
}

export function setMaxOutputTokens(maxTokens: number | null): void {
  try {
    if (maxTokens !== null && Number.isFinite(maxTokens) && maxTokens > 0) {
      localStorage.setItem(STORAGE_MAX_OUTPUT_TOKENS_KEY, String(Math.floor(maxTokens)));
    } else {
      localStorage.removeItem(STORAGE_MAX_OUTPUT_TOKENS_KEY);
    }
  } catch {}
}

export function getSessionTokensUsed(): number {
  try {
    const raw = localStorage.getItem(STORAGE_TOKENS_USED_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function addSessionTokensUsed(tokens: number): number {
  const current = getSessionTokensUsed();
  const next = current + Math.max(0, Math.floor(tokens || 0));
  try {
    localStorage.setItem(STORAGE_TOKENS_USED_KEY, String(next));
  } catch {}
  return next;
}

export function resetSessionTokensUsed(): void {
  try {
    localStorage.setItem(STORAGE_TOKENS_USED_KEY, '0');
  } catch {}
}

export function isSessionQuotaExhausted(): boolean {
  const limit = getSessionTokenLimit();
  if (limit === null) return false;
  return getSessionTokensUsed() >= limit;
}

export function getSavedQuotaStatus(): QuotaCheckStatus | null {
  try {
    const raw = localStorage.getItem(STORAGE_QUOTA_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSavedQuotaStatus(status: QuotaCheckStatus | null): void {
  try {
    if (status) {
      localStorage.setItem(STORAGE_QUOTA_STATUS_KEY, JSON.stringify(status));
    } else {
      localStorage.removeItem(STORAGE_QUOTA_STATUS_KEY);
    }
  } catch {}
}

// Backward compatibility exports
export const getLocalGeminiApiKey = getLocalAIKey;
export const setLocalGeminiApiKey = (key: string, sessionOnly = false) => setLocalAIKey(key, sessionOnly);
export const clearLocalGeminiApiKey = clearLocalAIKey;
