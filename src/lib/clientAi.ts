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
  PROVIDERS_CONFIG 
} from './apiKeyStorage';

/**
 * Flag indicating whether a backend proxy server is available.
 * On static hosting like GitHub Pages (tomekdot.github.io), there is no Node/Express backend.
 */
export const HAS_BACKEND: boolean = typeof window !== 'undefined' 
  && window.location.hostname !== 'tomekdot.github.io' 
  && !window.location.hostname.endsWith('github.io');

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

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

export function normalizeGeminiModel(model?: string | null): string {
  const m = (model || '').trim().replace(/^models\//, '');
  if (!m || m === 'latest' || m === 'gemini-flash-latest' || m.includes('flash')) return 'gemini-flash-latest';
  if (m === 'gemini-pro-latest' || m.includes('pro')) return 'gemini-pro-latest';
  return m;
}

function normalizeOpenAIEndpoint(baseUrl: string): string {
  let url = (baseUrl || '').trim().replace(/\/+$/, '');
  if (!url) return 'http://localhost:11434/v1/chat/completions';
  if (url.endsWith('/chat/completions')) return url;
  if (url.endsWith('/v1')) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

/**
 * Executes a client-side AI query for repositories.
 * 1. If Google Gemini key (AIza...) is present, queries Google Gemini REST API directly using x-goog-api-key header.
 * 2. If a Local PC engine (Ollama / LM Studio / Custom) is selected:
 *    - On HTTPS (e.g. GitHub Pages), browser Mixed Content blocks http://localhost. Informs the user how to clone & run locally (npm run dev) or use Gemini.
 *    - On HTTP / localhost / HTTPS proxy, queries the local endpoint directly.
 * 3. Otherwise falls back cleanly to the static knowledge index.
 */
export async function handleClientSideAiFallback(options: ClientAiQueryOptions): Promise<ClientAiResponse> {
  const { query, repoName = '', repoDesc = '', repoLang = '', readme = '', category = '', repos = REPOS, lang = 'en', signal } = options;
  const customApiKey = getLocalAIKey();
  const customProvider = getLocalAIProvider();
  const customBaseUrl = getLocalAIBaseUrl();
  const rawModel = getLocalAIModel();

  // 1. Direct client-side Google Gemini REST API call (using x-goog-api-key header)
  if (customApiKey && /^AIza/i.test(customApiKey)) {
    try {
      const apiModel = normalizeGeminiModel(rawModel);
      
      const systemInstruction = `You are tomekdot AI Assistant on tomekdot GitHub Portfolio (tomekdot.github.io).
You assist visitors with questions regarding repository "${repoName || 'tomekdot'}" (${repoLang || 'Code'}, category: ${category || 'Software'}).
Repository Description: ${repoDesc || ''}
${readme ? `\nREADME Excerpt:\n${readme.slice(0, 3500)}` : ''}

Respond accurately, concisely, and technically. Use markdown formatting.
Response Language: ${lang === 'en' ? 'English' : 'Polish'}.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`,
        {
          method: 'POST',
          signal,
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': customApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\nUser Question:\n${query}` }]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const json = await response.json();
        const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            reply: replyText.trim(),
            provider: `GEMINI (${apiModel.toUpperCase()} DIRECT)`,
            sourcesUsed: [repoName || 'Repository', readme ? 'README.md' : 'Metadata', 'Google AI Studio Client']
          };
        }
      } else {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        return {
          reply: lang === 'en'
            ? `⚠️ **Google Gemini Client Error:** ${errMsg}\n\nPlease verify your API key in the configuration bar (🔑).`
            : `⚠️ **Błąd klienta Google Gemini:** ${errMsg}\n\nSprawdź swój klucz API w pasku konfiguracji (🔑).`,
          provider: 'GEMINI (CLIENT ERROR)'
        };
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw e;
      }
      console.warn('Direct client-side Gemini API query failed:', e);
    }
  }

  // 2. Direct client-side Local PC AI Engine call (Ollama / LM Studio / Custom)
  const isLocalEngine = customProvider === 'ollama' || customProvider === 'lmstudio' || customProvider === 'custom' || (Boolean(customBaseUrl) && !/^AIza/i.test(customApiKey));
  if (isLocalEngine) {
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const targetBaseUrl = customBaseUrl || (customProvider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1');
    const isHttpTarget = /^http:\/\//i.test(targetBaseUrl);

    // Browser Mixed Content check
    if (isHttpsPage && isHttpTarget) {
      const provName = PROVIDERS_CONFIG[customProvider]?.nameEn || 'Local PC Engine';
      const provNamePl = PROVIDERS_CONFIG[customProvider]?.namePl || 'Lokalny Silnik PC';
      const reply = lang === 'en'
        ? `⚠️ **Browser Security Restriction (Mixed Content)**\n\nThis portfolio is running over HTTPS (\`${window.location.host}\`), so your web browser blocks direct insecure requests to \`${targetBaseUrl}\`.\n\n**To run with your local ${provName} (Ollama / LM Studio):**\n1. **Clone the repository:**\n   \`\`\`bash\n   git clone https://github.com/tomekdot/tomekdot.github.io\n   cd tomekdot.github.io\n   npm install\n   npm run dev\n   \`\`\`\n2. Open \`http://localhost:3000\` in your browser — all local models connect directly without security blocks!\n\n💡 *Tip on GitHub Pages:* You can get a free Google Gemini key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and enter it in the setup bar (🔑) to query Gemini directly from your browser.`
        : `⚠️ **Blokada bezpieczeństwa przeglądarki (Mixed Content)**\n\nStrona działa w protokole HTTPS (\`${window.location.host}\`), dlatego Twoja przeglądarka blokuje bezpośrednie połączenia do lokalnego adresu HTTP (\`${targetBaseUrl}\`).\n\n**Jak korzystać z ${provNamePl} (Ollama / LM Studio):**\n1. **Sklonuj i uruchom lokalnie na swoim PC:**\n   \`\`\`bash\n   git clone https://github.com/tomekdot/tomekdot.github.io\n   cd tomekdot.github.io\n   npm install\n   npm run dev\n   \`\`\`\n2. Otwórz \`http://localhost:3000\` — połączenia z lokalnym silnikiem działają bezpośrednio!\n\n💡 *Wskazówka na GitHub Pages:* Możesz pobrać darmowy klucz Google Gemini z [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) i wkleić go w konfiguracji (🔑), by rozmawiać z modelem online.`;

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
You assist visitors with questions regarding repository "${repoName || 'tomekdot'}" (${repoLang || 'Code'}, category: ${category || 'Software'}).
Repository Description: ${repoDesc || ''}
${readme ? `\nREADME Excerpt:\n${readme.slice(0, 3000)}` : ''}

Respond accurately, concisely, and technically. Use markdown formatting.
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
          temperature: 0.7,
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          return {
            reply: reply.trim(),
            provider: `${(PROVIDERS_CONFIG[customProvider]?.shortNameEn || 'LOCAL AI').toUpperCase()} (${modelToUse.toUpperCase()})`,
            sourcesUsed: [repoName || 'Repository', readme ? 'README.md' : 'Metadata', 'Local PC Engine']
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

  // 3. Client-side static knowledge engine fallback (instant, offline, $0, no API key needed)
  const targetRepo = repos.find(r => r.name.toLowerCase() === repoName.toLowerCase())
    || repos.find(r => r.name.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(r.name.toLowerCase()));

  if (targetRepo) {
    const desc = lang === 'en' ? targetRepo.desc : (targetRepo.descPl || targetRepo.desc);
    const cat = targetRepo.cat.join(', ');
    const langLabel = targetRepo.lang || 'TypeScript/Python';
    const stars = targetRepo.isPrivate ? (lang === 'en' ? 'Private' : 'Prywatne') : `${targetRepo.stars} ★`;
    const longDesc = lang === 'en' ? (targetRepo.longDescEn || desc) : (targetRepo.longDescPl || desc);

    const reply = lang === 'en'
      ? `📦 **${targetRepo.name}** (${langLabel})\n• **Category:** ${cat}\n• **Status:** ${stars}\n\n${longDesc}\n\n🔗 GitHub: ${targetRepo.url}\n\n💡 *Tip: Running directly on GitHub Pages. To unlock unrestricted live generative answers, enter your free Google Gemini API key in the configuration panel above (🔑).*`
      : `📦 **${targetRepo.name}** (${langLabel})\n• **Kategoria:** ${cat}\n• **Status:** ${stars}\n\n${longDesc}\n\n🔗 GitHub: ${targetRepo.url}\n\n💡 *Wskazówka: Działa bezpośrednio na GitHub Pages. Aby włączyć pełne odpowiedzi modelu generatywnego, wprowadź darmowy klucz Google Gemini w panelu konfiguracji (🔑).*`;

    return {
      reply,
      provider: 'STATIC KNOWLEDGE (GITHUB.IO)',
      sourcesUsed: [targetRepo.name, 'data.ts']
    };
  }

  const matchedRepos = repos.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    (r.desc && r.desc.toLowerCase().includes(query.toLowerCase())) ||
    (r.descPl && r.descPl.toLowerCase().includes(query.toLowerCase()))
  );

  if (matchedRepos.length > 0) {
    const listStr = matchedRepos.slice(0, 5).map(r => `• **${r.name}** (${r.lang || 'Other'}): ${lang === 'en' ? r.desc : (r.descPl || r.desc)}`).join('\n');
    const reply = lang === 'en'
      ? `Found ${matchedRepos.length} matching repositories:\n\n${listStr}\n\n*Running on GitHub Pages. Add a Gemini API key for full AI conversation.*`
      : `Znaleziono ${matchedRepos.length} pasujących repozytoriów:\n\n${listStr}\n\n*Działa na GitHub Pages. Wprowadź klucz Gemini dla pełnej konwersacji AI.*`;
    return {
      reply,
      provider: 'STATIC KNOWLEDGE (GITHUB.IO)',
      sourcesUsed: ['Workspace Index']
    };
  }

  const defaultReply = lang === 'en'
    ? `I am the tomekdot AI Assistant running on GitHub Pages (github.io).\n\nTo query live Gemini AI on GitHub Pages, configure your API key in the AI setup bar:\n• Free instant key from: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)\n\nIndexed portfolio: ${repos.length} repositories across Trackmania plugins (PyPlanet/OpenPlanet), AI Agents, and KUL coursework.`
    : `Jestem asystentem AI portfela tomekdot działającym na GitHub Pages (github.io).\n\nAby korzystać z Gemini AI na żywo na GitHub Pages, wprowadź swój klucz API w pasku konfiguracji AI:\n• Darmowy klucz z: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)\n\nIndeks portfela: ${repos.length} repozytoriów z wtyczek Trackmanii (PyPlanet/OpenPlanet), agentów AI i projektów akademickich KUL.`;

  return {
    reply: defaultReply,
    provider: 'STATIC KNOWLEDGE (GITHUB.IO)',
    sourcesUsed: ['Workspace Index']
  };
}

/**
 * Generates an archival technical summary for a repository directly in the browser.
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
}> {
  const { repo, lang, readme = '', signal } = params;
  const customApiKey = getLocalAIKey();

  if (customApiKey && /^AIza/i.test(customApiKey)) {
    try {
      const rawModel = getLocalAIModel() || DEFAULT_GEMINI_MODEL;
      const apiModel = normalizeGeminiModel(rawModel);

      const prompt = `Analyze this software repository:
Name: ${repo.name}
Language: ${repo.lang || 'N/A'}
Category: ${repo.cat?.join(', ') || 'N/A'}
Description: ${repo.desc || repo.descPl || ''}
${readme ? `\nREADME:\n${readme.slice(0, 4000)}` : ''}

Generate a JSON object with:
{
  "summary": "2-3 comprehensive descriptive sentences in ${lang === 'en' ? 'English' : 'Polish'}",
  "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"],
  "technicalHighlights": "Brief explanation of architecture, runtime dependencies, or algorithms in ${lang === 'en' ? 'English' : 'Polish'}"
}
Only output valid JSON.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`,
        {
          method: 'POST',
          signal,
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': customApiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            summary: parsed.summary || repo.desc || '',
            keyFeatures: Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures : [],
            technicalHighlights: parsed.technicalHighlights || '',
            provider: `GEMINI (${apiModel.toUpperCase()} DIRECT)`
          };
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.warn('Direct Gemini summary generation failed, falling back to local metadata:', e);
    }
  }

  // Fallback to local structured data
  const summary = lang === 'en' ? (repo.longDescEn || repo.desc) : (repo.longDescPl || repo.descPl || repo.desc);
  const keyFeatures = (lang === 'en' ? repo.featuresEn : repo.featuresPl) || repo.featuresPl || repo.featuresEn || [];
  const technicalHighlights = repo.capabilities && repo.capabilities.length > 0
    ? `${lang === 'en' ? 'Core Capabilities & Stack:' : 'Kluczowe technologie i biblioteki:'} ${repo.capabilities.join(' • ')}`
    : '';

  return {
    summary: summary || '',
    keyFeatures,
    technicalHighlights,
    provider: 'STATIC KNOWLEDGE (METADATA)'
  };
}

/**
 * Executes a client-side AI query for blog articles.
 */
export async function handleClientSideBlogAiFallback(options: ClientBlogAiQueryOptions): Promise<ClientAiResponse> {
  const { query, postTitle, postExcerpt = '', postContent = '', draftContent = '', aiRevisionNote = '', lang = 'en', signal } = options;
  const customApiKey = getLocalAIKey();
  const customProvider = getLocalAIProvider();
  const customBaseUrl = getLocalAIBaseUrl();
  const rawModel = getLocalAIModel();

  if (customApiKey && /^AIza/i.test(customApiKey)) {
    try {
      const apiModel = normalizeGeminiModel(rawModel);
      const systemInstruction = `You are tomekdot Blog AI Assistant on tomekdot developer portfolio (tomekdot.github.io).
You are analyzing article: "${postTitle}".
Excerpt: ${postExcerpt}
${draftContent ? `\nv1.0 Raw Draft Excerpt:\n${draftContent.slice(0, 1500)}` : ''}
${aiRevisionNote ? `\nRevision Notes:\n${aiRevisionNote}` : ''}
${postContent ? `\nContent Excerpt:\n${postContent.slice(0, 3000)}` : ''}

Respond accurately and insightfully. Use markdown formatting.
Response Language: ${lang === 'en' ? 'English' : 'Polish'}.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent`,
        {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': customApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemInstruction}\n\nUser Question:\n${query}` }]
              }
            ]
          })
        }
      );

      if (response.ok) {
        const json = await response.json();
        const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            reply: replyText.trim(),
            provider: `GEMINI (${apiModel.toUpperCase()} DIRECT)`,
            sourcesUsed: [postTitle, 'Blog Post Article', 'Google AI Studio Client']
          };
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw e;
      console.warn('Direct Gemini blog query failed:', e);
    }
  }

  // Local engine handling for blog
  const isLocalEngine = customProvider === 'ollama' || customProvider === 'lmstudio' || customProvider === 'custom' || (Boolean(customBaseUrl) && !/^AIza/i.test(customApiKey));
  if (isLocalEngine) {
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const targetBaseUrl = customBaseUrl || (customProvider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434/v1');
    const isHttpTarget = /^http:\/\//i.test(targetBaseUrl);

    if (isHttpsPage && isHttpTarget) {
      return {
        reply: lang === 'en'
          ? `⚠️ **Browser Security Restriction (Mixed Content)**\n\nThis site is loaded over HTTPS (\`${window.location.host}\`), preventing direct connections to insecure \`${targetBaseUrl}\`.\n\nTo use local models, clone the repository and run locally via \`npm run dev\` at \`http://localhost:3000\` or configure a free Google Gemini key.`
          : `⚠️ **Blokada bezpieczeństwa przeglądarki (Mixed Content)**\n\nStrona działa w HTTPS (\`${window.location.host}\`), co uniemożliwia bezpośrednie połączenia do lokalnego adresu HTTP (\`${targetBaseUrl}\`).\n\nAby używać silników lokalnych, sklonuj projekt i uruchom \`npm run dev\` pod \`http://localhost:3000\` lub wprowadź klucz Google Gemini.`,
        provider: `${(PROVIDERS_CONFIG[customProvider]?.shortNameEn || 'LOCAL AI').toUpperCase()} (HTTPS NOTICE)`
      };
    }
  }

  // Static knowledge response for article
  const post = BLOG_POSTS.find(p => p.titleEn.toLowerCase() === postTitle.toLowerCase() || p.titlePl.toLowerCase() === postTitle.toLowerCase()) || BLOG_POSTS[0];
  const summary = lang === 'en'
    ? `📝 **${post.titleEn}**\n\n${post.excerptEn}\n\n• **Tags:** ${post.tags.map(t => `#${t}`).join(', ')}\n• **Synthesis notes:** ${post.aiVersionNoteEn || 'Archival dev journal synthesis.'}\n\n*Running on GitHub Pages. Enter a Google Gemini API key to query live AI.*`
    : `📝 **${post.titlePl}**\n\n${post.excerptPl}\n\n• **Tagi:** ${post.tags.map(t => `#${t}`).join(', ')}\n• **Notatki syntezy:** ${post.aiVersionNotePl || 'Syntetyczny dziennik deweloperski.'}\n\n*Działa na GitHub Pages. Wprowadź klucz Google Gemini, by rozmawiać z AI.*`;

  return {
    reply: summary,
    provider: 'STATIC KNOWLEDGE (BLOG ARCHIVE)',
    sourcesUsed: [post.titleEn, 'data.ts']
  };
}
