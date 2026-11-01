/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, CornerDownRight, Square } from 'lucide-react';
import { REPOS, BLOG_POSTS, SHOW_PRIVATE_REPOS_TO_PUBLIC } from '../data';
import { Repository } from '../types';
import { 
  detectAIProvider, 
  getLocalAIKey, 
  setLocalAIKey, 
  clearLocalAIKey, 
  getLocalAIModel,
  getLocalAIBaseUrl,
  getLocalAIProvider,
  PROVIDERS_CONFIG
} from '../lib/apiKeyStorage';
import { handleClientSideAiFallback, HAS_BACKEND } from '../lib/clientAi';

interface CommandOutput {
  text: string;
  type: 'input' | 'output' | 'error' | 'success' | 'comment';
}

interface TerminalConsoleProps {
  onSelectCategory: (cat: string) => void;
  lang: 'en' | 'pl';
  repos?: Repository[];
  isModalOpen?: boolean;
}

export default function TerminalConsole({ onSelectCategory, lang, repos = REPOS, isModalOpen }: TerminalConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<CommandOutput[]>([
    { text: lang === 'en' 
        ? "tomekdot System v1.0.0 initialized. Type 'help' to review commands." 
        : "System tomekdot v1.0.0 zainicjalizowany. Wpisz 'help', aby zobaczyć listę komend.", 
      type: 'comment' 
    }
  ]);
  const [inputVal, setInputVal] = useState('');

  // Container scroll reference
  const logsRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Track if user is near bottom
  const handleLogsScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  // Auto-scroll logs container on new history entry after frame render
  useEffect(() => {
    const el = logsRef.current;
    if (!el || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [history]);

  // Pomodoro dynamic tracking
  const [pomodoroState, setPomodoroState] = useState<{
    isRunning: boolean;
    timeLeft: number; // in seconds
    label: string;
  } | null>(null);

  // Single Pomodoro interval hook
  useEffect(() => {
    if (!pomodoroState?.isRunning) return;
    const intervalId = setInterval(() => {
      setPomodoroState(prev => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.timeLeft <= 1) {
          return { ...prev, timeLeft: 0, isRunning: false };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [pomodoroState?.isRunning]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    stickToBottomRef.current = true;
    const rawCmd = inputVal.trim();
    if (!rawCmd) return;

    const rawParts = rawCmd.split(/\s+/);
    const parts = rawCmd.toLowerCase().split(/\s+/);
    const primary = parts[0];
    const argument = rawParts.slice(1).join(' ');

    // Mask sensitive API keys in terminal history output
    const shownText = /^ai\s+key\s+set\b/i.test(rawCmd) ? '> ai key set ••••••' : `> ${rawCmd}`;
    const newHistory: CommandOutput[] = [...history, { text: shownText, type: 'input' as const }];

    const addOutput = (text: string, type: 'output' | 'error' | 'success' | 'comment' = 'output') => {
      newHistory.push({ text, type });
    };

    switch (primary) {
      case 'help':
        if (lang === 'en') {
          addOutput("Available terminal commands:", "comment");
          addOutput("  help               - Shows this menu");
          addOutput("  about / cat bio    - Learn more about developer tomekdot");
          addOutput("  ls / list [cat]    - List repos. Optional category filters: pyplanet, openplanet, AI, KUL");
          addOutput("  filter <cat>       - Interact with UI; changes selected category view");
          addOutput("  pomodoro start/stop- Starts or stops an active 25-min focus tracker");
          addOutput("  pyplanet-simulate  - Compiles and runs a simulated PyPlanet plugin log");
          addOutput("  git <cmd> [args]   - Git commands: status, remote, log, clone <repo>, search <query>, open [repo-name]");
          addOutput("  ai <prompt|repo>   - Ask Gemini AI about any repository, plugin, or architecture");
          addOutput("  clear              - Clears terminal output logs");
        } else {
          addOutput("Dostępne komendy terminala:", "comment");
          addOutput("  help               - Wyświetla to menu");
          addOutput("  about / cat bio    - Informacje o programiście tomekdot");
          addOutput("  ls / list [cat]    - Lista repozytoriów. Opcje: pyplanet, openplanet, AI, KUL");
          addOutput("  filter <cat>       - Filtruje główny interfejs aplikacji");
          addOutput("  pomodoro start/stop- Uruchamia/zatrzymuje licznik skupienia Pomodoro 25 min");
          addOutput("  pyplanet-simulate  - Symuluje kompilację i start modułu PyPlanet");
          addOutput("  git <cmd> [args]   - Komendy Git: status, remote, log, clone <repo>, search <fraza>, open [nazwa-repo]");
          addOutput("  ai <pytanie|repo>  - Zapytaj Gemini AI o dowolne repozytorium, plugin lub architekturę");
          addOutput("  clear              - Czyści logi konsoli");
        }
        break;

      case 'git': {
        const subAction = parts[1];
        if (!subAction) {
          if (lang === 'en') {
            addOutput("Git commands: git status // git remote // git log // git clone <repo> // git search <query> // git open [repo]", "comment");
          } else {
            addOutput("Sposób użycia: git status // git remote // git log // git clone <repo> // git search [szukaj] // git open [repo]", "comment");
          }
          break;
        }

        if (subAction === 'status') {
          if (lang === 'en') {
            addOutput(`On branch main
Your branch is up to date with 'origin/main'.

[data.ts status]
  • SHOW_PRIVATE_REPOS_TO_PUBLIC: ${SHOW_PRIVATE_REPOS_TO_PUBLIC ? 'ENABLED (VISIBLE)' : 'DISABLED (HIDDEN)'}
  • Cached Repositories Count: ${repos.length}

nothing to commit, working tree clean`, "success");
          } else {
            addOutput(`Na gałęzi main
Twój oddział jest aktualny z 'origin/main'.

[Status pliku data.ts]
  • SHOW_PRIVATE_REPOS_TO_PUBLIC: ${SHOW_PRIVATE_REPOS_TO_PUBLIC ? 'WŁĄCZONA (WIDOCZNE)' : 'WYŁĄCZONA (UKRYTE)'}
  • Liczba zapisanych repozytoriów: ${repos.length}

nie ma nic do zatwierdzenia, drzewo robocze czyste`, "success");
          }
        } else if (subAction === 'remote') {
          addOutput("origin  https://github.com/tomekdot (fetch)\norigin  https://github.com/tomekdot (push)", "success");
        } else if (subAction === 'log') {
          const logMsg = lang === 'en'
            ? "commit f82d9a3 (HEAD -> main, origin/main)\nAuthor: tomekdot <tomekdot@users.noreply.github.com>\nDate:   2026-06-20\n\n    feat: add SHOW_PRIVATE_REPOS_TO_PUBLIC toggle & owner toolbox panel\n\ncommit a47c92b\nAuthor: tomekdot <tomekdot@users.noreply.github.com>\nDate:   2026-06-16\n\n    Initial archival index sync of Trackmania plugins"
            : "commit f82d9a3 (HEAD -> main, origin/main)\nAuthor: tomekdot <tomekdot@users.noreply.github.com>\nDate:   2026-06-20\n\n    feat: dodano opcję SHOW_PRIVATE_REPOS_TO_PUBLIC i panel narzędzi właściciela\n\ncommit a47c92b\nAuthor: tomekdot <tomekdot@users.noreply.github.com>\nDate:   2026-06-16\n\n    Initial archival index sync of Trackmania plugins";
          addOutput(logMsg, "comment");
        } else if (subAction === 'clone') {
          const repoArg = rawParts[2];
          if (!repoArg) {
            addOutput("Error: git clone requires a repository name/url.", "error");
          } else {
            const cleanName = repoArg.replace('https://github.com/tomekdot/', '').replace('.git', '');
            addOutput(`Cloning into '${cleanName}'...\nremote: Enumerating objects: 104, done.\nremote: Counting objects: 100% (104/104)\nReceiving objects: 100% (104/104), completed.`, "success");
            addOutput(`Visit cloned workspace online: https://github.com/tomekdot/${cleanName}`, "success");
          }
        } else if (subAction === 'search' || subAction === 'find') {
          const query = parts.slice(2).join(' ').trim().toLowerCase();
          if (!query) {
            if (lang === 'en') {
              addOutput("Usage: git search <query-text>", "error");
            } else {
              addOutput("Użycie: git search <fraza>", "error");
            }
            break;
          }
          const matched = repos.filter(r => r.name.toLowerCase().includes(query) || (r.lang && r.lang.toLowerCase().includes(query)));
          if (matched.length === 0) {
            addOutput(lang === 'en' ? `No repository matches found for query: '${query}'` : `Brak pasujących repozytoriów dla: '${query}'`, "error");
          } else {
            addOutput(lang === 'en' ? `Sub-repository suggestions matching "${query}":` : `Sugerowane repozytoria pasujące do "${query}":`, "comment");
            matched.forEach(m => {
              const starsPart = m.isPrivate ? '' : ` ★ ${m.stars}`;
              addOutput(`  -> ${m.name.padEnd(28)} [${m.lang || 'Other'}]${starsPart}`, "success");
            });
            addOutput(`Direct GitHub Search: https://github.com/tomekdot?tab=repositories&q=${encodeURIComponent(query)}`, "success");
          }
        } else if (subAction === 'open' || subAction === 'browse' || subAction === 'web') {
          const repoArg = parts[2];
          if (!repoArg) {
            addOutput(lang === 'en' ? "Opening tomekdot GitHub developer index..." : "Otwieranie głównego indeksu deweloperskiego tomekdot...", "comment");
            addOutput("URL: https://github.com/tomekdot", "success");
          } else {
            const matchedRepo = repos.find(r => r.name.toLowerCase() === repoArg.toLowerCase());
            const targetUrl = matchedRepo?.url || `https://github.com/tomekdot/${repoArg}`;
            addOutput(lang === 'en' ? `Opening repository source: ${repoArg}...` : `Otwieranie repozytorium: ${repoArg}...`, "comment");
            addOutput(`URL: ${targetUrl}`, "success");
          }
        } else {
          addOutput(`Unknown git command: '${subAction}'. Try: status, remote, log, clone, search, open.`, "error");
        }
        break;
      }

      case 'clear':
        setHistory([]);
        setInputVal('');
        return;

      case 'about':
      case 'bio':
        if (lang === 'en') {
          addOutput("tomekdot profile & archive details:", "comment");
          addOutput("• Trackmania Modder, AI enthusiast, and Computer Science Student at KUL.");
          addOutput("• Specializes in Python (PyPlanet), AngelScript (Openplanet), and Java/Kotlin.");
          addOutput("• Passionate about Trackmania game music automation, audio synchronization, and intelligent AI agents.");
          addOutput(`• Indexed Workspace: ${repos.length} repositories across categories (PyPlanet, Openplanet, AI, KUL, Tools).`);
          addOutput(`• Journal Articles: ${BLOG_POSTS.length} developer blog posts & research synthesis notes.`);
        } else {
          addOutput("Szczegóły profilu i archiwum tomekdot:", "comment");
          addOutput("• Twórca modyfikacji Trackmanii, pasjonat AI oraz student Informatyki na KUL.");
          addOutput("• Specjalizuje się w Pythonie (PyPlanet), AngelScript (Openplanet) oraz Javie/Kotlinie.");
          addOutput("• Pasjonat automatyzacji muzyki w grze Trackmania, synchronizacji audio oraz inteligentnych agentów AI.");
          addOutput(`• Zindeksowane repozytoria: ${repos.length} projektów (PyPlanet, Openplanet, AI, KUL, Narzędzia).`);
          addOutput(`• Wpisy dziennika: ${BLOG_POSTS.length} artykułów deweloperskich i notatek badawczych AI.`);
        }
        break;

      case 'cat':
        if (parts[1] === 'bio' || parts[1] === 'about') {
          if (lang === 'en') {
            addOutput("Reading local bio file from data registry...", "comment");
            addOutput(`[Profile] tomekdot — ${repos.length} repos, ${BLOG_POSTS.length} journal articles.`);
            addOutput("Focus: Trackmania game engine modding, music & audio automation in-game, PyPlanet server controllers, Openplanet AngelScript plugins, and autonomous AI agents.");
            addOutput("Academic: KUL Computer Science studies, IoT networking, data structures.");
          } else {
            addOutput("Wczytywanie lokalnego pliku bio z rejestru danych...", "comment");
            addOutput(`[Profil] tomekdot — ${repos.length} repozytoriów, ${BLOG_POSTS.length} wpisów w dzienniku.`);
            addOutput("Główne obszary: Modyfikacje silnika Trackmania, automatyzacja muzyki i audio w grze, kontrolery PyPlanet, wtyczki AngelScript Openplanet oraz agenci AI.");
            addOutput("Akademicko: Informatyka na KUL, sieci IoT, struktury danych.");
          }
        } else {
          addOutput(`cat: '${argument || 'file'}' not found. Try: 'cat bio'`, "error");
        }
        break;

      case 'ls':
      case 'list': {
        const catArg = parts[1];
        let items = repos;
        if (catArg) {
          items = repos.filter(r => r.cat.some(c => c.includes(catArg)));
        }
        
        if (lang === 'en') {
          addOutput(`Listing repositories (${items.length} matched):`, "comment");
        } else {
          addOutput(`Wypisywanie repozytoriów (znaleziono ${items.length}):`, "comment");
        }

        items.forEach(r => {
          const langLabel = r.lang ? `[${r.lang}]` : '[Shell]';
          const starsPart = r.isPrivate ? '' : ` ★ ${r.stars}`;
          addOutput(`  • ${r.name.padEnd(28)} ${langLabel.padEnd(14)}${starsPart}`, "success");
        });
        break;
      }

      case 'filter': {
        const targetCat = parts[1];
        if (!targetCat) {
          addOutput("Error: specify category name (e.g., 'filter pyplanet', 'filter KUL')", 'error');
          break;
        }

        const validCats = ['pyplanet', 'openplanet', 'trackmania', 'ai', 'kul', 'other', 'all'];
        const matched = validCats.find(c => c.startsWith(targetCat));
        
        if (matched) {
          onSelectCategory(matched);
          addOutput(`Success: UI category set to '${matched}'`, 'success');
        } else {
          addOutput(`Error: unknown category '${targetCat}'. Choices: pyplanet, openplanet, trackmania, ai, kul, other, all.`, 'error');
        }
        break;
      }

      case 'pomodoro': {
        const action = parts[1];
        if (action === 'start') {
          setPomodoroState({
            isRunning: true,
            timeLeft: 25 * 60,
            label: lang === 'en' ? 'Work Session' : 'Skupienie'
          });
          addOutput("Pomodoro active! 25 minutes ticks inside overlay. Maintain extreme focus.", "success");
        } else if (action === 'stop') {
          if (pomodoroState) {
            setPomodoroState(null);
            addOutput("Pomodoro timer killed.", "comment");
          } else {
            addOutput("No active Pomodoro is running.", "error");
          }
        } else {
          addOutput("Error: choose action. Usage: 'pomodoro start' or 'pomodoro stop'", "error");
        }
        break;
      }

      case 'pyplanet-simulate': {
        addOutput("[pyplanet:loader] Booting local dynamic environment...", "comment");
        addOutput("[pyplanet:socket] Connection established with ManiaPlanet server client @ 127.0.0.1:5000", "success");
        addOutput("[pyplanet:clanspirits] Successfully integrated local database records.", "success");
        addOutput("[pyplanet:github-installer] Custom /ghinstall commands successfully registered.", "success");
        addOutput("[pyplanet:app] Active game server loaded. Running happily inside container with zero anomalies.", "success");
        break;
      }

      case 'ai': {
        const query = rawParts.slice(1).join(' ').trim();
        if (!query) {
          if (lang === 'en') {
            addOutput("Usage: ai <question | explain <repo-name> | key <set <key> | clear | status>>", "comment");
            addOutput("Example: ai explain pyplanet-clan-spirits", "comment");
            addOutput("API Key: ai key set AIzaSy... (Google Gemini) or select Local PC engine (Ollama / LM Studio)", "comment");
          } else {
            addOutput("Sposób użycia: ai <pytanie | explain <nazwa-repo> | key <set <klucz> | clear | status>>", "comment");
            addOutput("Przykład: ai explain pyplanet-clan-spirits", "comment");
            addOutput("Klucz API: ai key set AIzaSy... (Google Gemini) lub wybierz silnik lokalny PC (Ollama / LM Studio)", "comment");
          }
          break;
        }

        if (parts[1] === 'key') {
          const sub = parts[2];
          if (sub === 'set' && rawParts[3]) {
            // Case-sensitive API key extraction
            const newKey = rawParts.slice(3).join(' ').trim();
            const detected = detectAIProvider(newKey);
            setLocalAIKey(newKey, false, detected.defaultModel, detected.id);
            addOutput(lang === 'en' 
              ? `✅ ${detected.nameEn} API key detected and saved strictly to your browser's local storage. Never stored on server.`
              : `✅ Wykryto dostawcę: ${detected.namePl}. Klucz API zapisany wyłącznie w pamięci Twojej przeglądarki.`, "success");
          } else if (sub === 'clear' || sub === 'remove' || sub === 'delete') {
            clearLocalAIKey();
            addOutput(lang === 'en'
              ? "🗑️ Custom AI API key cleared from browser storage."
              : "🗑️ Twój klucz API został usunięty z pamięci przeglądarki.", "comment");
          } else {
            const localKey = getLocalAIKey();
            if (localKey) {
              const provider = detectAIProvider(localKey);
              const model = getLocalAIModel() || provider.defaultModel;
              addOutput(lang === 'en'
                ? `[AI KEY STATUS]: 🟢 Custom key active: ${provider.nameEn} (${model})`
                : `[STATUS KLUCZA AI]: 🟢 Własny klucz aktywny: ${provider.namePl} (${model})`, "success");
            } else {
              addOutput(lang === 'en'
                ? "[AI KEY STATUS]: 🔵 Using Google Gemini / local engine mode"
                : "[STATUS KLUCZA AI]: 🔵 Używasz Google Gemini / trybu lokalnego", "comment");
            }
            addOutput(lang === 'en'
              ? "Commands: 'ai key set <API_KEY>' or 'ai key clear' (Google Gemini AI Studio & Local PC Engines)"
              : "Komendy: 'ai key set <TWÓJ_KLUCZ>' lub 'ai key clear' (Google Gemini AI Studio i Silniki Lokalne PC)", "comment");
          }
          break;
        }

        const targetRepo = repos.find(r => query.toLowerCase().includes(r.name.toLowerCase()));
        const repoName = targetRepo ? targetRepo.name : (repos[0]?.name || 'tomekdot-suite');
        const repoDesc = targetRepo ? (targetRepo.desc || targetRepo.descPl) : 'Portfolio tomekdot';
        const repoLang = targetRepo ? targetRepo.lang : 'Python/TypeScript';
        const customApiKey = getLocalAIKey();
        const customModel = getLocalAIModel();
        const customBaseUrl = getLocalAIBaseUrl();
        const customProvider = getLocalAIProvider();
        const detectedProvider = detectAIProvider(customApiKey);
        const activeProviderName = (customProvider && PROVIDERS_CONFIG[customProvider])
          ? PROVIDERS_CONFIG[customProvider].name
          : detectedProvider.name;

        addOutput(
          lang === 'en'
            ? `[AI-AGENT] >> Initializing AI query (${activeProviderName}) for repository: ${repoName}...`
            : `[AI-AGENT] >> Inicjowanie zapytania AI (${activeProviderName}) dla repozytorium: ${repoName}...`, 
            "comment"
        );

        const runFallback = async () => {
          const fallbackResult = await handleClientSideAiFallback({
            query,
            repoName,
            repoDesc,
            repoLang,
            category: targetRepo?.cat?.join(', ') || 'Trackmania/AI',
            repos,
            lang
          });
          setHistory(prev => [
            ...prev,
            { text: `🤖 [AI // ${fallbackResult.provider}]:\n${fallbackResult.reply}`, type: 'success' },
          ]);
          if (fallbackResult.sourcesUsed && fallbackResult.sourcesUsed.length > 0) {
            setHistory(prev => [
              ...prev,
              { text: `🔍 [${lang === 'en' ? 'Knowledge Sources Used' : 'Użyte źródła wiedzy'}]: ${fallbackResult.sourcesUsed.join(' • ')}`, type: 'comment' },
            ]);
          }
        };

        if (!HAS_BACKEND) {
          runFallback();
          break;
        }

        // Try backend endpoint first, fallback to static/client-side engine if hosted on github.io (no Node server)
        fetch('/api/ai/chat-repo', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-ai-api-key': customApiKey,
            'x-gemini-api-key': customApiKey,
            'x-ai-base-url': customBaseUrl || '',
            'x-ai-provider': customProvider || '',
            'x-ai-model': customModel || '',
          },
          body: JSON.stringify({
            repoName,
            description: repoDesc,
            lang: repoLang,
            userMessage: query,
            category: targetRepo?.cat?.join(', ') || 'Trackmania/AI',
            customApiKey,
            customModel: customModel || detectedProvider.defaultModel,
            customBaseUrl,
            customProvider,
            siteLang: lang,
          }),
        })
          .then(async res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            const sourceLabel = data.provider || (data.source === 'gemini' 
              ? 'GEMINI 2.5 FLASH' 
              : (lang === 'en' ? 'KNOWLEDGE BASE / OFFLINE' : 'BAZA WIEDZY / OFFLINE'));
            setHistory(prev => [
              ...prev,
              { text: `🤖 [AI // ${sourceLabel}]:\n${data.reply || (lang === 'en' ? 'No response.' : 'Brak odpowiedzi.')}`, type: 'success' },
            ]);
            if (data.sourcesUsed && Array.isArray(data.sourcesUsed)) {
              setHistory(prev => [
                ...prev,
                { text: `🔍 [${lang === 'en' ? 'Knowledge Sources Used' : 'Użyte źródła wiedzy'}]: ${data.sourcesUsed.join(' • ')}`, type: 'comment' },
              ]);
            }
          })
          .catch(async () => {
            await runFallback();
          });
        break;
      }

      default:
        addOutput(`Command not recognized: '${primary}'. Type 'help' for instructions.`, 'error');
        break;
    }

    setHistory(newHistory);
    setInputVal('');
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={isModalOpen ? 'hidden' : ''}>
      {/* Floating Active Pomodoro Display */}
      {pomodoroState && (
        <div id="pomodoro_widget" className="fixed top-3 right-3 z-40 bg-editorial-sidebar-bg border border-editorial-accent/60 text-editorial-accent rounded-none px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-2xl flex items-center gap-3 font-mono text-xs sm:text-sm animate-pulse">
          <div className="w-2 h-2 rounded-none bg-editorial-accent animate-ping"></div>
          <div>
            <div className="text-[10px] sm:text-xs text-editorial-muted font-sans tracking-wide uppercase">{pomodoroState.label}</div>
            <div className="text-base sm:text-lg font-bold">{formatTime(pomodoroState.timeLeft)}</div>
          </div>
          <button 
            type="button"
            id="stop_pomodoro_btn"
            onClick={() => setPomodoroState(null)} 
            className="p-1 hover:bg-neutral-800 rounded-none text-[#8b949e] hover:text-white border border-[#30363d]"
          >
            <Square size={14} className="fill-current" />
          </button>
        </div>
      )}

      {/* Toggle button - Clean, stable floating button with responsive sizing */}
      <div 
        id="terminal_toggle_wrapper"
        className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-1.5 pointer-events-auto"
      >
        <button
          type="button"
          id="toggle_terminal_btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-none border transition-colors duration-200 font-mono text-[11px] sm:text-xs font-semibold uppercase tracking-wider cursor-pointer select-none shadow-2xl backdrop-blur-sm
            ${isOpen 
              ? 'bg-red-950/90 text-red-300 border-red-500/60 hover:bg-red-900' 
              : 'bg-[#0E0E0E]/95 text-editorial-accent border-editorial-border hover:border-editorial-accent font-bold hover:text-white'}`}
        >
          <Terminal size={14} className="shrink-0" />
          <span className="hidden sm:inline">
            {isOpen ? (lang === 'en' ? 'Close Console' : 'Zamknij Konsolę') : (lang === 'en' ? 'Developer Terminal' : 'Terminal Dewelopera')}
          </span>
          <span className="sm:hidden">
            {isOpen ? (lang === 'en' ? 'Close' : 'Zamknij') : 'Terminal'}
          </span>
        </button>
      </div>

      {/* Console frame - Bounded strictly to mobile screen width and height */}
      {isOpen && (
        <div 
          id="terminal_console" 
          translate="no" 
          className="fixed bottom-[4.5rem] left-2.5 right-2.5 sm:left-auto sm:right-3 z-50 sm:w-[480px] h-[min(20rem,calc(100svh-6rem))] bg-[#0A0A0A]/95 backdrop-blur-md border-2 border-editorial-border rounded-none shadow-2xl overflow-hidden flex flex-col font-mono text-xs select-text notranslate overscroll-contain box-border"
        >
          {/* Header */}
          <div className="bg-editorial-sidebar-bg px-3 sm:px-4 py-1.5 sm:py-2 border-b border-editorial-border flex items-center justify-between text-editorial-muted shrink-0">
            <div className="flex items-center gap-1.5 uppercase tracking-wider text-[9.5px] sm:text-[10px]">
              <span className="w-2 h-2 bg-neutral-700 inline-block pointer-events-none"></span>
              <span className="w-2 h-2 bg-neutral-600 inline-block pointer-events-none"></span>
              <span className="w-2 h-2 bg-neutral-500 inline-block pointer-events-none"></span>
              <span className="ml-1.5 font-bold text-white truncate">sh — tomekdot@archive</span>
            </div>
            <button 
              type="button"
              id="close_terminal_top_btn"
              onClick={() => setIsOpen(false)} 
              className="text-editorial-muted hover:text-white transition-colors cursor-pointer p-0.5 ml-2 shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Logs */}
          <div 
            ref={logsRef} 
            onScroll={handleLogsScroll}
            className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 pb-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent overscroll-contain"
          >
            {(() => {
              const renderLogText = (text: string) => {
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const partsText = text.split(urlRegex);
                return partsText.map((part, i) => {
                  if (part.match(urlRegex)) {
                    return (
                      <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-editorial-accent hover:brightness-110 underline decoration-dotted break-all font-bold font-mono"
                      >
                        {part}
                      </a>
                    );
                  }
                  return <span key={i}>{part}</span>;
                });
              };

              return history.map((log, index) => {
                let textClass = 'text-white/95';
                if (log.type === 'input') textClass = 'text-editorial-accent font-bold';
                if (log.type === 'error') textClass = 'text-rose-400';
                if (log.type === 'success') textClass = 'text-emerald-400';
                if (log.type === 'comment') textClass = 'text-editorial-muted';

                return (
                  <div key={index} className={`${textClass} whitespace-pre-wrap leading-relaxed break-all text-[11px] sm:text-xs`}>
                    {renderLogText(log.text)}
                  </div>
                );
              });
            })()}
          </div>

          {/* Input field */}
          <form onSubmit={handleCommandSubmit} className="bg-editorial-sidebar-bg p-1.5 sm:p-2 border-t border-editorial-border flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="text-editorial-muted pl-1.5 shrink-0">
              <CornerDownRight size={12} />
            </span>
            <input
              type="text"
              id="terminal_input"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={lang === 'en' ? "Type command (e.g. 'help')..." : "Wpisz komendę (np. 'help')..."}
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-editorial-accent text-[11px] sm:text-xs placeholder:text-zinc-700 font-mono py-1"
              autoFocus={typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches}
              maxLength={100}
            />
          </form>
        </div>
      )}
    </div>
  );
}
