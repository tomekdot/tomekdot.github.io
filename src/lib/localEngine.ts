/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProbeLocalEngineResult {
  ok: boolean;
  models?: string[];
  error?: string;
}

export interface LocalChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Probes a local AI server (Ollama, LM Studio, vLLM, Custom Localhost) to check availability and list active models.
 */
export async function probeLocalEngine(baseUrl: string): Promise<ProbeLocalEngineResult> {
  const root = baseUrl.trim().replace(/\/+$/, '');
  if (!root) {
    return { ok: false, error: 'Empty base URL' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);

  // Try standard OpenAI /v1/models or /models endpoints
  const endpoint = root.endsWith('/models')
    ? root
    : root.endsWith('/v1')
      ? `${root}/models`
      : `${root}/v1/models`;

  try {
    const res = await fetch(endpoint, { signal: ctrl.signal });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    const models = Array.isArray(json.data)
      ? json.data.map((m: { id: string }) => m.id).filter(Boolean)
      : Array.isArray(json.models)
        ? json.models.map((m: { name?: string; id?: string }) => m.name || m.id).filter(Boolean)
        : [];

    return { ok: true, models };
  } catch (err: any) {
    return { 
      ok: false, 
      error: err?.name === 'AbortError' ? 'timeout (2.5s)' : 'unreachable' 
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sends a chat completion query directly to a local AI server (Ollama / LM Studio / Custom Localhost)
 * WITHOUT ever calling or falling back to Google Gemini or external cloud servers.
 */
export async function sendLocalChat(
  baseUrl: string,
  model: string,
  messages: LocalChatMessage[],
  apiKey: string = '',
  signal?: AbortSignal
): Promise<string> {
  const root = baseUrl.trim().replace(/\/+$/, '');
  const endpoint = root.endsWith('/chat/completions')
    ? root
    : root.endsWith('/v1')
      ? `${root}/chat/completions`
      : `${root}/v1/chat/completions`;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model || 'llama3.2',
        messages,
        stream: false,
        temperature: 0.7,
      }),
      signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw err;
    }
    throw new Error(
      `Nie mogę połączyć się z lokalnym serwerem (${root}). Sprawdź, czy Ollama/LM Studio działa oraz czy wyznaczono pozwolenia CORS dla tej domeny (OLLAMA_ORIGINS="*").`
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Serwer lokalny zwrócił błąd ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const reply = json.choices?.[0]?.message?.content || json.message?.content || '';
  return reply.trim();
}
