/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Repository } from '../types';
import { BLOG_POSTS, SHOW_PRIVATE_REPOS_TO_PUBLIC } from '../data';
import { 
  detectAIProvider, 
  getLocalAIKey, 
  setLocalAIKey, 
  clearLocalAIKey, 
  getLocalAIModel,
  getLocalAIBaseUrl,
  getLocalAIProvider,
  PROVIDERS_CONFIG
} from './apiKeyStorage';
import { handleClientSideAiFallback, HAS_BACKEND } from './clientAi';

export type CommandType = 'input' | 'output' | 'error' | 'success' | 'comment';

export interface CommandOutput {
  text: string;
  type: CommandType;
}

export interface PomodoroState {
  isRunning: boolean;
  timeLeft: number; // in seconds
  label: string;
  isFinished?: boolean;
}

export interface TerminalContext {
  repos: Repository[];
  lang: 'en' | 'pl';
  onSelectCategory: (cat: string) => void;
  onOpenRepo?: (repo: Repository) => void;
  setHistory: React.Dispatch<React.SetStateAction<CommandOutput[]>>;
  addOutput: (text: string, type?: CommandType) => void;
  pomodoroState: PomodoroState | null;
  setPomodoroState: React.Dispatch<React.SetStateAction<PomodoroState | null>>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  setIsAiLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isAiLoading: boolean;
}

export const VALID_CATEGORIES = [
  'all',
  'pyplanet',
  'openplanet',
  'trackmania',
  'ai',
  'kul',
  'other',
  'plugins',
  'forked'
] as const;

export const TERMINAL_I18N = {
  en: {
    welcome: "tomekdot System v1.0.0 initialized. Type 'help' to review commands.",
    helpTitle: "Available terminal commands:",
    helpHelp: "  help                  - Shows this command menu",
    helpAbout: "  about / cat bio       - Learn more about developer tomekdot",
    helpLs: "  ls / list [cat]       - List repos. Optional category filters: pyplanet, openplanet, AI, KUL",
    helpOpen: "  open <repo>           - Opens repository detail modal & architecture view",
    helpFilter: "  filter <cat>          - Filter UI view: all, pyplanet, openplanet, trackmania, ai, kul, other",
    helpPomodoro: "  pomodoro <start|stop> - Starts (25m) or stops the focus work session",
    helpPyplanet: "  pyplanet-simulate     - Compiles and runs a simulated PyPlanet plugin log",
    helpGit: "  git <cmd> [args]      - Git tools: status, remote, log, clone <repo>, search <query>, open <repo>",
    helpAi: "  ai <prompt|explain>   - Ask AI about repositories, architecture or plugins (Esc / Ctrl+C to cancel)",
    helpAiKey: "  ai key <set|clear|status> - Configure private Gemini API key or local LLM engine",
    helpClear: "  clear                 - Clears terminal output logs",
    
    unknownCmd: (cmd: string) => `Command not recognized: '${cmd}'. Type 'help' for available instructions.`,
    
    aboutHeader: "tomekdot profile & archive details:",
    about1: "• Trackmania Modder, AI enthusiast, and Computer Science Student at KUL.",
    about2: "• Specializes in Python (PyPlanet), AngelScript (Openplanet), Java/Kotlin, and TypeScript.",
    about3: "• Passionate about Trackmania game music automation, audio synchronization, and intelligent AI agents.",
    aboutRepos: (count: number) => `• Indexed Workspace: ${count} repositories across categories (PyPlanet, Openplanet, AI, KUL, Tools).`,
    aboutArticles: (count: number) => `• Journal Articles: ${count} developer blog posts & research synthesis notes.`,
    
    catBioHeader: "Reading local bio file from data registry...",
    catBioSummary: (repos: number, blogs: number) => `[Profile] tomekdot — ${repos} repos, ${blogs} journal articles.`,
    catBioFocus: "Focus: Trackmania game engine modding, music & audio automation in-game, PyPlanet server controllers, Openplanet AngelScript plugins, and autonomous AI agents.",
    catBioAcademic: "Academic: KUL Computer Science studies, IoT networking, algorithms, data structures.",
    catNotFound: (arg: string) => `cat: '${arg || 'file'}' not found. Try: 'cat bio'`,
    
    lsHeader: (count: number) => `Listing repositories (${count} matched):`,
    
    openUsage: "Usage: open <repository-name>. Example: 'open pyplanet-clan-spirits'",
    openNotFound: (query: string) => `Repository '${query}' not found. Use 'ls' or 'git search ${query}' to find valid names.`,
    openSuccess: (name: string) => `Opening modal for repository '${name}'...`,
    
    filterUsage: "Error: specify category name. Options: all, pyplanet, openplanet, trackmania, ai, kul, other, plugins, forked.",
    filterAmbiguous: (prefix: string, matches: string[]) => `Ambiguous category prefix '${prefix}'. Matches: ${matches.join(', ')}. Please specify complete name.`,
    filterSuccess: (cat: string) => `Success: UI category set to '${cat}'`,
    filterUnknown: (cat: string) => `Error: unknown category '${cat}'. Valid options: ${VALID_CATEGORIES.join(', ')}.`,
    
    pomodoroActive: "🍅 Pomodoro active! 25-minute focus session started. Maintain deep focus.",
    pomodoroAlready: (left: string) => `Pomodoro is already running (${left} remaining). Use 'pomodoro stop' to cancel.`,
    pomodoroStopped: "Pomodoro timer stopped.",
    pomodoroNoActive: "No active Pomodoro is running.",
    pomodoroUsage: "Usage: 'pomodoro start' or 'pomodoro stop'",
    pomodoroCompleteLog: "🍅 [POMODORO] Focus session completed! Great job taking care of your craft.",
    pomodoroWorkLabel: "Work Session",
    
    pyplanetBoot: "[pyplanet:loader] Booting local dynamic environment...",
    pyplanetSocket: "[pyplanet:socket] Connection established with ManiaPlanet server client @ 127.0.0.1:5000",
    pyplanetDb: "[pyplanet:clanspirits] Successfully integrated local database records.",
    pyplanetHook: "[pyplanet:github-installer] Custom /ghinstall commands successfully registered.",
    pyplanetDone: "[pyplanet:app] Active game server loaded. Running happily inside container with zero anomalies.",
    
    gitUsage: "Git commands: git status // git remote // git log // git clone <repo> // git search <query> // git open <repo>",
    gitStatusBranch: "On branch main\nYour branch is up to date with 'origin/main'.",
    gitStatusPrivate: (enabled: boolean) => `SHOW_PRIVATE_REPOS_TO_PUBLIC: ${enabled ? 'ENABLED (VISIBLE)' : 'DISABLED (HIDDEN)'}`,
    gitStatusCount: (count: number) => `Cached Repositories Count: ${count}`,
    gitStatusClean: "nothing to commit, working tree clean",
    gitRemoteOutput: "origin  https://github.com/tomekdot (fetch)\norigin  https://github.com/tomekdot (push)",
    gitLogNotice: "git log: unavailable in browser (no local git repository clone initialized). View commit history online: https://github.com/tomekdot",
    gitCloneUsage: "Error: git clone requires a repository name or URL. Example: 'git clone pyplanet-clan-spirits'",
    gitCloneCmd: (cmd: string) => `Run locally in your terminal:\n  ${cmd}`,
    gitSearchUsage: "Usage: git search <query-text>",
    gitSearchNotFound: (query: string) => `No repository matches found for query: '${query}'`,
    gitSearchFound: (query: string) => `Repository suggestions matching "${query}":`,
    gitSearchOnline: (query: string) => `Direct GitHub Search: https://github.com/tomekdot?tab=repositories&q=${encodeURIComponent(query)}`,
    gitOpenMain: "Opening tomekdot GitHub developer index...",
    gitOpenRepo: (name: string) => `Opening repository source for '${name}' in new browser tab...`,
    gitUnknown: (cmd: string) => `Unknown git command: '${cmd}'. Try: status, remote, log, clone, search, open.`,
    
    aiUsage: "Usage: ai <question | explain <repo-name> | key <set <key> | clear | status>>",
    aiUsageExample: "Example: ai explain pyplanet-clan-spirits  OR  ai What technologies does tomekdot use?",
    aiUsageKey: "API Key: ai key set AIzaSy... (Google Gemini) or local PC endpoint",
    aiKeySaved: (provider: string) => `✅ ${provider} API key detected and saved strictly to your browser's local storage. Never stored on server.`,
    aiKeyCleared: "🗑️ Custom AI API key cleared from browser storage.",
    aiKeyStatusActive: (provider: string, model: string) => `[AI KEY STATUS]: 🟢 Custom key active: ${provider} (${model})`,
    aiKeyStatusDefault: "[AI KEY STATUS]: 🔵 Using Google Gemini / local engine mode",
    aiKeyCommands: "Commands: 'ai key set <API_KEY>' or 'ai key clear' (Google Gemini AI Studio & Local PC Engines)",
    aiInit: (provider: string, contextName: string) => `[AI-AGENT] >> Initializing AI query (${provider}) with context: ${contextName}... (Press Esc or Ctrl+C to cancel)`,
    aiThinking: "⏳ [AI-AGENT] Analyzing architecture and generating reply...",
    aiCancelled: "⚡ [AI-AGENT] Query cancelled by user.",
    aiError: (msg: string) => `❌ [AI-AGENT Error]: ${msg}`,
    aiNoResponse: "No response generated.",
    aiKnowledgeSources: "Knowledge Sources Used",
  },
  pl: {
    welcome: "System tomekdot v1.0.0 zainicjalizowany. Wpisz 'help', aby zobaczyć listę komend.",
    helpTitle: "Dostępne komendy terminala:",
    helpHelp: "  help                  - Wyświetla to menu",
    helpAbout: "  about / cat bio       - Informacje o programiście tomekdot",
    helpLs: "  ls / list [cat]       - Lista repozytoriów. Opcje: pyplanet, openplanet, AI, KUL",
    helpOpen: "  open <repo>           - Otwiera okno szczegółów repozytorium i architekturę",
    helpFilter: "  filter <cat>          - Filtruje widok: all, pyplanet, openplanet, trackmania, ai, kul, other",
    helpPomodoro: "  pomodoro <start|stop> - Uruchamia (25m) lub zatrzymuje licznik skupienia",
    helpPyplanet: "  pyplanet-simulate     - Symuluje kompilację i start modułu PyPlanet",
    helpGit: "  git <cmd> [args]      - Narzędzia Git: status, remote, log, clone <repo>, search <fraza>, open <repo>",
    helpAi: "  ai <pytanie|explain>  - Zapytaj AI o repozytorium, architekturę lub wtyczki (Esc / Ctrl+C aby anulować)",
    helpAiKey: "  ai key <set|clear|status> - Konfiguracja prywatnego klucza Gemini lub silnika lokalnego",
    helpClear: "  clear                 - Czyści logi konsoli",
    
    unknownCmd: (cmd: string) => `Nieznana komenda: '${cmd}'. Wpisz 'help', aby wyświetlić instrukcję.`,
    
    aboutHeader: "Szczegóły profilu i archiwum tomekdot:",
    about1: "• Twórca modyfikacji Trackmanii, pasjonat AI oraz student Informatyki na KUL.",
    about2: "• Specjalizuje się w Pythonie (PyPlanet), AngelScript (Openplanet), Javie/Kotlinie oraz TypeScript.",
    about3: "• Pasjonat automatyzacji muzyki w grze Trackmania, synchronizacji audio oraz inteligentnych agentów AI.",
    aboutRepos: (count: number) => `• Zindeksowane repozytoria: ${count} projektów (PyPlanet, Openplanet, AI, KUL, Narzędzia).`,
    aboutArticles: (count: number) => `• Wpisy dziennika: ${count} artykułów deweloperskich i notatek badawczych AI.`,
    
    catBioHeader: "Wczytywanie lokalnego pliku bio z rejestru danych...",
    catBioSummary: (repos: number, blogs: number) => `[Profil] tomekdot — ${repos} repozytoriów, ${blogs} wpisów w dzienniku.`,
    catBioFocus: "Główne obszary: Modyfikacje silnika Trackmania, automatyzacja muzyki i audio w grze, kontrolery PyPlanet, wtyczki AngelScript Openplanet oraz agenci AI.",
    catBioAcademic: "Akademicko: Informatyka na KUL, sieci IoT, algorytmy, struktury danych.",
    catNotFound: (arg: string) => `cat: '${arg || 'plik'}' nie znaleziono. Spróbuj: 'cat bio'`,
    
    lsHeader: (count: number) => `Wypisywanie repozytoriów (znaleziono ${count}):`,
    
    openUsage: "Użycie: open <nazwa-repozytorium>. Przykład: 'open pyplanet-clan-spirits'",
    openNotFound: (query: string) => `Repozytorium '${query}' nie zostało znalezione. Użyj 'ls' lub 'git search ${query}'.`,
    openSuccess: (name: string) => `Otwieranie okna repozytorium '${name}'...`,
    
    filterUsage: "Błąd: podaj nazwę kategorii. Dostępne: all, pyplanet, openplanet, trackmania, ai, kul, other, plugins, forked.",
    filterAmbiguous: (prefix: string, matches: string[]) => `Niejednoznaczny prefiks kategorii '${prefix}'. Pasujące: ${matches.join(', ')}. Doprecyzuj nazwę.`,
    filterSuccess: (cat: string) => `Sukces: Kategoria widoku zmieniona na '${cat}'`,
    filterUnknown: (cat: string) => `Błąd: nieznana kategoria '${cat}'. Poprawne opcje: ${VALID_CATEGORIES.join(', ')}.`,
    
    pomodoroActive: "🍅 Pomodoro aktywne! Rozpoczęto 25-minutową sesję głębokiego skupienia.",
    pomodoroAlready: (left: string) => `Pomodoro już działa (pozostało: ${left}). Wpisz 'pomodoro stop', aby zatrzymać.`,
    pomodoroStopped: "Licznik Pomodoro zatrzymany.",
    pomodoroNoActive: "Brak aktywnego licznika Pomodoro.",
    pomodoroUsage: "Użycie: 'pomodoro start' lub 'pomodoro stop'",
    pomodoroCompleteLog: "🍅 [POMODORO] Sesja skupienia zakończona! Gratulacje, dobra robota.",
    pomodoroWorkLabel: "Skupienie",
    
    pyplanetBoot: "[pyplanet:loader] Uruchamianie lokalnego środowiska wtyczek...",
    pyplanetSocket: "[pyplanet:socket] Ustanowiono połączenie z serwerem ManiaPlanet @ 127.0.0.1:5000",
    pyplanetDb: "[pyplanet:clanspirits] Pomyślnie zsynchronizowano lokalne rekordy bazy danych.",
    pyplanetHook: "[pyplanet:github-installer] Zarejestrowano niestandardowe polecenia /ghinstall.",
    pyplanetDone: "[pyplanet:app] Serwer gry aktywny. Aplikacja działa stabilnie w kontenerze bez błędów.",
    
    gitUsage: "Sposób użycia: git status // git remote // git log // git clone <repo> // git search <fraza> // git open <repo>",
    gitStatusBranch: "Na gałęzi main\nTwój oddział jest aktualny z 'origin/main'.",
    gitStatusPrivate: (enabled: boolean) => `SHOW_PRIVATE_REPOS_TO_PUBLIC: ${enabled ? 'WŁĄCZONA (WIDOCZNE)' : 'WYŁĄCZONA (UKRYTE)'}`,
    gitStatusCount: (count: number) => `Liczba zapisanych repozytoriów: ${count}`,
    gitStatusClean: "nie ma nic do zatwierdzenia, drzewo robocze czyste",
    gitRemoteOutput: "origin  https://github.com/tomekdot (fetch)\norigin  https://github.com/tomekdot (push)",
    gitLogNotice: "git log: niedostępne w przeglądarce (brak lokalnego repozytorium git). Zobacz historię commitów online: https://github.com/tomekdot",
    gitCloneUsage: "Błąd: git clone wymaga podania nazwy repozytorium lub adresu URL. Przykład: 'git clone pyplanet-clan-spirits'",
    gitCloneCmd: (cmd: string) => `Uruchom lokalnie w swoim terminalu:\n  ${cmd}`,
    gitSearchUsage: "Użycie: git search <szukana fraza>",
    gitSearchNotFound: (query: string) => `Brak repozytoriów pasujących do: '${query}'`,
    gitSearchFound: (query: string) => `Sugerowane repozytoria pasujące do "${query}":`,
    gitSearchOnline: (query: string) => `Wyszukiwanie na GitHubie: https://github.com/tomekdot?tab=repositories&q=${encodeURIComponent(query)}`,
    gitOpenMain: "Otwieranie głównego profilu tomekdot na GitHub...",
    gitOpenRepo: (name: string) => `Otwieranie repozytorium '${name}' w nowej karcie przeglądarki...`,
    gitUnknown: (cmd: string) => `Nieznana podkomenda git: '${cmd}'. Spróbuj: status, remote, log, clone, search, open.`,
    
    aiUsage: "Sposób użycia: ai <pytanie | explain <nazwa-repo> | key <set <klucz> | clear | status>>",
    aiUsageExample: "Przykład: ai explain pyplanet-clan-spirits  LUB  ai Jakie technologie stosuje tomekdot?",
    aiUsageKey: "Klucz API: ai key set AIzaSy... (Google Gemini) lub silnik lokalny PC",
    aiKeySaved: (provider: string) => `✅ Wykryto dostawcę: ${provider}. Klucz API zapisany wyłącznie w pamięci Twojej przeglądarki.`,
    aiKeyCleared: "🗑️ Twój klucz API został usunięty z pamięci przeglądarki.",
    aiKeyStatusActive: (provider: string, model: string) => `[STATUS KLUCZA AI]: 🟢 Własny klucz aktywny: ${provider} (${model})`,
    aiKeyStatusDefault: "[STATUS KLUCZA AI]: 🔵 Używasz Google Gemini / trybu lokalnego",
    aiKeyCommands: "Komendy: 'ai key set <TWÓJ_KLUCZ>' lub 'ai key clear' (Google Gemini AI Studio i Silniki Lokalne PC)",
    aiInit: (provider: string, contextName: string) => `[AI-AGENT] >> Inicjowanie zapytania AI (${provider}) z kontekstem: ${contextName}... (Wciśnij Esc lub Ctrl+C, aby przerwać)`,
    aiThinking: "⏳ [AI-AGENT] Analiza architektury i generowanie odpowiedzi...",
    aiCancelled: "⚡ [AI-AGENT] Zapytanie zostało anulowane przez użytkownika.",
    aiError: (msg: string) => `❌ [Błąd AI-AGENT]: ${msg}`,
    aiNoResponse: "Brak wygenerowanej odpowiedzi.",
    aiKnowledgeSources: "Użyte źródła wiedzy",
  }
};

/**
 * Safely retrieve cached README markdown text from localStorage if present.
 */
export function getCachedReadme(repoName: string): string | null {
  if (typeof window === 'undefined' || !repoName) return null;
  try {
    const raw = localStorage.getItem(`github_readme_cache_${repoName}`);
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"content"')) {
      const parsed = JSON.parse(trimmed);
      return parsed.content || null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * Helper to resolve category with exact-matching priority and ambiguous prefix detection.
 */
export function resolveCategory(rawInput: string): { 
  matched?: string; 
  ambiguous?: boolean; 
  candidates?: string[]; 
  error?: boolean 
} {
  const clean = (rawInput || '').trim().toLowerCase();
  if (!clean) return { error: true };

  // 1. Exact match takes highest priority
  const exact = VALID_CATEGORIES.find(c => c.toLowerCase() === clean);
  if (exact) {
    return { matched: exact };
  }

  // 2. Prefix matching
  const matches = VALID_CATEGORIES.filter(c => c.toLowerCase().startsWith(clean));
  if (matches.length === 1) {
    return { matched: matches[0] };
  }
  if (matches.length > 1) {
    return { ambiguous: true, candidates: matches };
  }

  return { error: true };
}

/**
 * Find repository by name (exact match first, then startsWith, then includes).
 */
export function findRepoByName(query: string, repos: Repository[]): Repository | null {
  const clean = (query || '').trim().toLowerCase().replace(/^https?:\/\/github\.com\/tomekdot\//, '').replace(/\.git$/, '');
  if (!clean) return null;

  // Exact
  const exact = repos.find(r => r.name.toLowerCase() === clean);
  if (exact) return exact;

  // Starts with
  const startsWith = repos.find(r => r.name.toLowerCase().startsWith(clean));
  if (startsWith) return startsWith;

  // Includes
  const includes = repos.find(r => r.name.toLowerCase().includes(clean));
  return includes || null;
}

/**
 * Parses user input line into structured tokens.
 */
export function parseCommandLine(raw: string): {
  rawCmd: string;
  primary: string;
  subAction: string;
  argument: string;
  rawParts: string[];
  parts: string[];
} {
  const rawCmd = (raw || '').trim();
  const rawParts = rawCmd ? rawCmd.split(/\s+/) : [];
  const parts = rawParts.map(p => p.toLowerCase());
  const primary = parts[0] || '';
  const subAction = parts[1] || '';
  const argument = rawParts.slice(1).join(' ').trim();

  return { rawCmd, primary, subAction, argument, rawParts, parts };
}

/**
 * Tab autocompletion suggestions.
 */
export function getTabCompletion(currentVal: string, repos: Repository[]): string | null {
  const trimmed = currentVal.trimStart();
  if (!trimmed) return null;

  const rawParts = trimmed.split(/\s+/);
  const parts = trimmed.toLowerCase().split(/\s+/);
  const currentWord = rawParts[rawParts.length - 1] || '';
  const currentWordLower = currentWord.toLowerCase();

  // If first word: match commands
  if (rawParts.length === 1) {
    const commands = [
      'help', 'about', 'bio', 'cat', 'ls', 'list', 'filter', 
      'pomodoro', 'pyplanet-simulate', 'git', 'ai', 'open', 'clear'
    ];
    const match = commands.find(c => c.startsWith(currentWordLower) && c !== currentWordLower);
    if (match) return match + ' ';
    return null;
  }

  const primary = parts[0];

  // Git subcommands
  if (primary === 'git' && rawParts.length === 2) {
    const gitSubs = ['status', 'remote', 'log', 'clone', 'search', 'open'];
    const match = gitSubs.find(s => s.startsWith(currentWordLower) && s !== currentWordLower);
    if (match) return `git ${match} `;
  }

  // Git clone / open OR open command: match repo names
  if (
    (primary === 'open' && rawParts.length === 2) ||
    (primary === 'git' && (parts[1] === 'clone' || parts[1] === 'open') && rawParts.length === 3) ||
    (primary === 'ai' && parts[1] === 'explain' && rawParts.length === 3)
  ) {
    const repoMatch = repos.find(r => r.name.toLowerCase().startsWith(currentWordLower));
    if (repoMatch) {
      const prefix = rawParts.slice(0, -1).join(' ');
      return `${prefix} ${repoMatch.name} `;
    }
  }

  // Filter categories
  if (primary === 'filter' && rawParts.length === 2) {
    const catMatch = VALID_CATEGORIES.find(c => c.toLowerCase().startsWith(currentWordLower));
    if (catMatch) {
      return `filter ${catMatch} `;
    }
  }

  // Pomodoro
  if (primary === 'pomodoro' && rawParts.length === 2) {
    const pomSubs = ['start', 'stop', 'status'];
    const match = pomSubs.find(s => s.startsWith(currentWordLower));
    if (match) return `pomodoro ${match} `;
  }

  // AI subcommands
  if (primary === 'ai' && rawParts.length === 2) {
    const aiSubs = ['explain', 'key'];
    const match = aiSubs.find(s => s.startsWith(currentWordLower));
    if (match) return `ai ${match} `;
  }

  if (primary === 'ai' && parts[1] === 'key' && rawParts.length === 3) {
    const keySubs = ['set', 'clear', 'status'];
    const match = keySubs.find(s => s.startsWith(currentWordLower));
    if (match) return `ai key ${match} `;
  }

  return null;
}

/**
 * Executes a terminal command within the provided context.
 */
export async function executeTerminalCommand(rawInput: string, ctx: TerminalContext): Promise<void> {
  const { rawCmd, primary, subAction, argument, rawParts, parts } = parseCommandLine(rawInput);
  if (!rawCmd) return;

  const t = TERMINAL_I18N[ctx.lang];

  switch (primary) {
    case 'help': {
      ctx.addOutput(t.helpTitle, 'comment');
      ctx.addOutput(t.helpHelp);
      ctx.addOutput(t.helpAbout);
      ctx.addOutput(t.helpLs);
      ctx.addOutput(t.helpOpen);
      ctx.addOutput(t.helpFilter);
      ctx.addOutput(t.helpPomodoro);
      ctx.addOutput(t.helpPyplanet);
      ctx.addOutput(t.helpGit);
      ctx.addOutput(t.helpAi);
      ctx.addOutput(t.helpAiKey);
      ctx.addOutput(t.helpClear);
      break;
    }

    case 'about':
    case 'bio': {
      ctx.addOutput(t.aboutHeader, 'comment');
      ctx.addOutput(t.about1);
      ctx.addOutput(t.about2);
      ctx.addOutput(t.about3);
      ctx.addOutput(t.aboutRepos(ctx.repos.length));
      ctx.addOutput(t.aboutArticles(BLOG_POSTS.length));
      break;
    }

    case 'cat': {
      if (parts[1] === 'bio' || parts[1] === 'about') {
        ctx.addOutput(t.catBioHeader, 'comment');
        ctx.addOutput(t.catBioSummary(ctx.repos.length, BLOG_POSTS.length));
        ctx.addOutput(t.catBioFocus);
        ctx.addOutput(t.catBioAcademic);
      } else {
        ctx.addOutput(t.catNotFound(argument), 'error');
      }
      break;
    }

    case 'ls':
    case 'list': {
      const catArg = parts[1];
      let items = ctx.repos;
      if (catArg) {
        items = ctx.repos.filter(r => r.cat.some(c => c.toLowerCase().includes(catArg.toLowerCase())));
      }

      ctx.addOutput(t.lsHeader(items.length), 'comment');
      items.forEach(r => {
        const langLabel = r.lang ? `[${r.lang}]` : '[Shell]';
        const starsPart = r.isPrivate ? '' : ` ★ ${r.stars}`;
        ctx.addOutput(`  • ${r.name.padEnd(28)} ${langLabel.padEnd(14)}${starsPart}`, 'success');
      });
      break;
    }

    case 'open': {
      const targetQuery = rawParts.slice(1).join(' ').trim();
      if (!targetQuery) {
        ctx.addOutput(t.openUsage, 'error');
        break;
      }

      const matchedRepo = findRepoByName(targetQuery, ctx.repos);
      if (!matchedRepo) {
        ctx.addOutput(t.openNotFound(targetQuery), 'error');
        break;
      }

      if (ctx.onOpenRepo) {
        ctx.onOpenRepo(matchedRepo);
        ctx.addOutput(t.openSuccess(matchedRepo.name), 'success');
      } else {
        const targetUrl = (matchedRepo.url && !matchedRepo.url.startsWith('file:') && !matchedRepo.url.startsWith('file:///'))
          ? matchedRepo.url
          : `https://github.com/tomekdot/${matchedRepo.name}`;
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        ctx.addOutput(t.gitOpenRepo(matchedRepo.name), 'success');
      }
      break;
    }

    case 'filter': {
      const targetCat = parts[1];
      if (!targetCat) {
        ctx.addOutput(t.filterUsage, 'error');
        break;
      }

      const resolved = resolveCategory(targetCat);
      if (resolved.matched) {
        ctx.onSelectCategory(resolved.matched);
        ctx.addOutput(t.filterSuccess(resolved.matched), 'success');
      } else if (resolved.ambiguous && resolved.candidates) {
        ctx.addOutput(t.filterAmbiguous(targetCat, resolved.candidates), 'error');
      } else {
        ctx.addOutput(t.filterUnknown(targetCat), 'error');
      }
      break;
    }

    case 'pomodoro': {
      const action = parts[1];
      if (action === 'start') {
        if (ctx.pomodoroState?.isRunning && ctx.pomodoroState.timeLeft > 0) {
          const mins = Math.floor(ctx.pomodoroState.timeLeft / 60);
          const secs = ctx.pomodoroState.timeLeft % 60;
          ctx.addOutput(t.pomodoroAlready(`${mins}m ${secs}s`), 'comment');
        } else {
          ctx.setPomodoroState({
            isRunning: true,
            timeLeft: 25 * 60,
            label: t.pomodoroWorkLabel,
            isFinished: false
          });
          ctx.addOutput(t.pomodoroActive, 'success');
        }
      } else if (action === 'stop') {
        if (ctx.pomodoroState) {
          ctx.setPomodoroState(null);
          ctx.addOutput(t.pomodoroStopped, 'comment');
        } else {
          ctx.addOutput(t.pomodoroNoActive, 'error');
        }
      } else if (action === 'status') {
        if (ctx.pomodoroState?.isRunning) {
          const mins = Math.floor(ctx.pomodoroState.timeLeft / 60);
          const secs = ctx.pomodoroState.timeLeft % 60;
          ctx.addOutput(`🍅 Pomodoro: ${mins}m ${secs}s remaining`, 'comment');
        } else if (ctx.pomodoroState?.isFinished) {
          ctx.addOutput(t.pomodoroCompleteLog, 'success');
        } else {
          ctx.addOutput(t.pomodoroNoActive, 'comment');
        }
      } else {
        ctx.addOutput(t.pomodoroUsage, 'error');
      }
      break;
    }

    case 'pyplanet-simulate': {
      ctx.addOutput(t.pyplanetBoot, 'comment');
      ctx.addOutput(t.pyplanetSocket, 'success');
      ctx.addOutput(t.pyplanetDb, 'success');
      ctx.addOutput(t.pyplanetHook, 'success');
      ctx.addOutput(t.pyplanetDone, 'success');
      break;
    }

    case 'git': {
      if (!subAction) {
        ctx.addOutput(t.gitUsage, 'comment');
        break;
      }

      if (subAction === 'status') {
        ctx.addOutput(t.gitStatusBranch, 'comment');
        ctx.addOutput(`\n[data.ts status]\n  • ${t.gitStatusPrivate(SHOW_PRIVATE_REPOS_TO_PUBLIC)}\n  • ${t.gitStatusCount(ctx.repos.length)}\n`, 'comment');
        ctx.addOutput(t.gitStatusClean, 'success');
      } else if (subAction === 'remote') {
        ctx.addOutput(t.gitRemoteOutput, 'success');
      } else if (subAction === 'log') {
        ctx.addOutput(t.gitLogNotice, 'comment');
      } else if (subAction === 'clone') {
        const repoArg = rawParts[2];
        if (!repoArg) {
          ctx.addOutput(t.gitCloneUsage, 'error');
        } else {
          const cleanName = repoArg.replace('https://github.com/tomekdot/', '').replace('.git', '');
          const cloneCmd = `git clone https://github.com/tomekdot/${cleanName}.git`;
          ctx.addOutput(t.gitCloneCmd(cloneCmd), 'success');
          ctx.addOutput(`https://github.com/tomekdot/${cleanName}`, 'comment');
        }
      } else if (subAction === 'search' || subAction === 'find') {
        const query = parts.slice(2).join(' ').trim();
        if (!query) {
          ctx.addOutput(t.gitSearchUsage, 'error');
          break;
        }

        const matched = ctx.repos.filter(r => 
          r.name.toLowerCase().includes(query) || 
          (r.lang && r.lang.toLowerCase().includes(query)) ||
          r.cat.some(c => c.toLowerCase().includes(query))
        );

        if (matched.length === 0) {
          ctx.addOutput(t.gitSearchNotFound(query), 'error');
        } else {
          ctx.addOutput(t.gitSearchFound(query), 'comment');
          matched.forEach(m => {
            const starsPart = m.isPrivate ? '' : ` ★ ${m.stars}`;
            ctx.addOutput(`  -> ${m.name.padEnd(28)} [${m.lang || 'Other'}]${starsPart}`, 'success');
          });
          ctx.addOutput(t.gitSearchOnline(query), 'comment');
        }
      } else if (subAction === 'open' || subAction === 'browse' || subAction === 'web') {
        const repoArg = parts[2];
        if (!repoArg) {
          window.open('https://github.com/tomekdot', '_blank', 'noopener,noreferrer');
          ctx.addOutput(t.gitOpenMain, 'comment');
          ctx.addOutput('URL: https://github.com/tomekdot', 'success');
        } else {
          const matchedRepo = findRepoByName(repoArg, ctx.repos);
          let targetUrl = matchedRepo?.url || `https://github.com/tomekdot/${repoArg}`;
          if (targetUrl.startsWith('file:') || targetUrl.startsWith('file:///')) {
            targetUrl = `https://github.com/tomekdot/${repoArg}`;
          }
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
          ctx.addOutput(t.gitOpenRepo(repoArg), 'comment');
          ctx.addOutput(`URL: ${targetUrl}`, 'success');
        }
      } else {
        ctx.addOutput(t.gitUnknown(subAction), 'error');
      }
      break;
    }

    case 'clear': {
      ctx.setHistory([]);
      return;
    }

    case 'ai': {
      const query = rawParts.slice(1).join(' ').trim();
      if (!query) {
        ctx.addOutput(t.aiUsage, 'comment');
        ctx.addOutput(t.aiUsageExample, 'comment');
        ctx.addOutput(t.aiUsageKey, 'comment');
        break;
      }

      // 1. Subcommand: ai key ...
      if (parts[1] === 'key') {
        const keySub = parts[2];
        if (keySub === 'set' && rawParts[3]) {
          const newKey = rawParts.slice(3).join(' ').trim();
          const detected = detectAIProvider(newKey);
          
          // PRESERVE existing model and base URL without clobbering!
          const existingModel = getLocalAIModel();
          const existingBaseUrl = getLocalAIBaseUrl();
          const existingProvider = getLocalAIProvider();

          setLocalAIKey(
            newKey, 
            false, 
            existingModel || detected.defaultModel, 
            (existingProvider && existingProvider !== 'unknown') ? existingProvider : detected.id,
            existingBaseUrl
          );

          ctx.addOutput(t.aiKeySaved(ctx.lang === 'en' ? detected.nameEn : detected.namePl), 'success');
        } else if (keySub === 'clear' || keySub === 'remove' || keySub === 'delete') {
          clearLocalAIKey();
          ctx.addOutput(t.aiKeyCleared, 'comment');
        } else {
          const localKey = getLocalAIKey();
          if (localKey) {
            const provider = detectAIProvider(localKey);
            const model = getLocalAIModel() || provider.defaultModel;
            ctx.addOutput(t.aiKeyStatusActive(ctx.lang === 'en' ? provider.nameEn : provider.namePl, model), 'success');
          } else {
            ctx.addOutput(t.aiKeyStatusDefault, 'comment');
          }
          ctx.addOutput(t.aiKeyCommands, 'comment');
        }
        break;
      }

      // 2. Explicit 'ai explain <repo>' command
      let targetRepo: Repository | null = null;
      let effectiveUserMessage = query;

      if (parts[1] === 'explain' && rawParts[2]) {
        const specifiedName = rawParts.slice(2).join(' ').trim();
        targetRepo = findRepoByName(specifiedName, ctx.repos);
        effectiveUserMessage = ctx.lang === 'en'
          ? `Explain the repository '${targetRepo ? targetRepo.name : specifiedName}' in detail: architecture, purpose, and installation.`
          : `Wyjaśnij szczegółowo repozytorium '${targetRepo ? targetRepo.name : specifiedName}': przeznaczenie, architektura i instalacja.`;
      } else {
        // Check if query contains an exact or partial repo name
        for (const repo of ctx.repos) {
          if (query.toLowerCase().includes(repo.name.toLowerCase())) {
            targetRepo = repo;
            break;
          }
        }
      }

      // CRITICAL BUG FIX: If no repository matches, DO NOT fallback to repos[0]!
      // Send general workspace inquiry instead.
      const repoName = targetRepo ? targetRepo.name : '';
      const repoDesc = targetRepo ? (targetRepo.desc || targetRepo.descPl || '') : 'tomekdot Developer Archive Portfolio';
      const repoLang = targetRepo ? (targetRepo.lang || 'Python/AngelScript/TypeScript') : 'Polyglot';
      const repoCategory = targetRepo ? targetRepo.cat.join(', ') : 'All Repositories / General Development';

      const customApiKey = getLocalAIKey();
      const customModel = getLocalAIModel();
      const customBaseUrl = getLocalAIBaseUrl();
      const customProvider = getLocalAIProvider();
      const detectedProvider = detectAIProvider(customApiKey);
      const activeProviderName = (customProvider && PROVIDERS_CONFIG[customProvider])
        ? PROVIDERS_CONFIG[customProvider].name
        : detectedProvider.name;

      const contextLabel = repoName || (ctx.lang === 'en' ? 'General Developer Workspace' : 'Ogólny profil dewelopera');
      ctx.addOutput(t.aiInit(activeProviderName, contextLabel), 'comment');
      ctx.addOutput(t.aiThinking, 'comment');

      // Setup AbortController for cancelability
      if (ctx.abortControllerRef.current) {
        ctx.abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      ctx.abortControllerRef.current = controller;
      ctx.setIsAiLoading(true);

      // Check for cached README
      const cachedReadme = targetRepo ? getCachedReadme(targetRepo.name) : null;

      const runFallback = async () => {
        try {
          const fallbackResult = await handleClientSideAiFallback({
            query: effectiveUserMessage,
            repoName: repoName || undefined,
            repoDesc,
            repoLang,
            readme: cachedReadme,
            category: repoCategory,
            repos: ctx.repos,
            lang: ctx.lang,
            signal: controller.signal
          });

          if (controller.signal.aborted) {
            ctx.addOutput(t.aiCancelled, 'comment');
            return;
          }

          ctx.addOutput(`🤖 [AI // ${fallbackResult.provider}]:\n${fallbackResult.reply || t.aiNoResponse}`, 'success');
          if (fallbackResult.sourcesUsed && fallbackResult.sourcesUsed.length > 0) {
            ctx.addOutput(`🔍 [${t.aiKnowledgeSources}]: ${fallbackResult.sourcesUsed.join(' • ')}`, 'comment');
          }
        } catch (fbErr: any) {
          if (fbErr?.name === 'AbortError' || controller.signal.aborted) {
            ctx.addOutput(t.aiCancelled, 'comment');
          } else {
            ctx.addOutput(t.aiError(fbErr?.message || String(fbErr)), 'error');
          }
        } finally {
          ctx.setIsAiLoading(false);
        }
      };

      if (!HAS_BACKEND) {
        runFallback();
        break;
      }

      // Use backend proxy endpoint
      // NOTE: We only send API key in 'x-ai-api-key' header; customApiKey removed from body!
      fetch('/api/ai/chat-repo', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-ai-api-key': customApiKey || '',
          'x-gemini-api-key': customApiKey || '',
          'x-ai-base-url': customBaseUrl || '',
          'x-ai-provider': customProvider || '',
          'x-ai-model': customModel || '',
        },
        body: JSON.stringify({
          repoName: repoName || 'tomekdot-workspace',
          description: repoDesc,
          lang: repoLang,
          readme: cachedReadme || '',
          userMessage: effectiveUserMessage,
          category: repoCategory,
          customModel: customModel || detectedProvider.defaultModel,
          customBaseUrl,
          customProvider,
          siteLang: ctx.lang,
        }),
        signal: controller.signal
      })
        .then(async res => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          if (controller.signal.aborted) {
            ctx.addOutput(t.aiCancelled, 'comment');
            return;
          }

          const sourceLabel = data.provider || (data.source === 'gemini' 
            ? 'GEMINI 2.5 FLASH' 
            : (ctx.lang === 'en' ? 'KNOWLEDGE BASE / OFFLINE' : 'BAZA WIEDZY / OFFLINE'));
          
          ctx.addOutput(`🤖 [AI // ${sourceLabel}]:\n${data.reply || t.aiNoResponse}`, 'success');
          if (data.sourcesUsed && Array.isArray(data.sourcesUsed) && data.sourcesUsed.length > 0) {
            ctx.addOutput(`🔍 [${t.aiKnowledgeSources}]: ${data.sourcesUsed.join(' • ')}`, 'comment');
          }
          ctx.setIsAiLoading(false);
        })
        .catch(async err => {
          if (err.name === 'AbortError' || controller.signal.aborted) {
            ctx.addOutput(t.aiCancelled, 'comment');
            ctx.setIsAiLoading(false);
          } else {
            // Attempt client-side offline fallback with proper error handling
            try {
              await runFallback();
            } catch (fallbackError: any) {
              ctx.addOutput(t.aiError(fallbackError?.message || err?.message || 'AI request failed'), 'error');
              ctx.setIsAiLoading(false);
            }
          }
        });
      break;
    }

    default: {
      ctx.addOutput(t.unknownCmd(primary), 'error');
      break;
    }
  }
}
