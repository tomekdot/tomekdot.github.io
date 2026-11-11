/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, X, CornerDownRight, Square, CheckCircle2 } from 'lucide-react';
import { REPOS } from '../data';
import { Repository } from '../types';
import { 
  CommandOutput, 
  PomodoroState, 
  TerminalContext, 
  TERMINAL_I18N, 
  executeTerminalCommand, 
  getTabCompletion 
} from '../lib/terminalCommands';

interface TerminalConsoleProps {
  onSelectCategory: (cat: string) => void;
  lang: 'en' | 'pl';
  repos?: Repository[];
  isModalOpen?: boolean;
  onOpenRepo?: (repo: Repository) => void;
}

export default function TerminalConsole({ 
  onSelectCategory, 
  lang, 
  repos = REPOS, 
  isModalOpen,
  onOpenRepo 
}: TerminalConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<CommandOutput[]>([
    { 
      text: TERMINAL_I18N[lang].welcome, 
      type: 'comment' 
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Command History Navigation (↑ / ↓, max 50 entries)
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [draftInput, setDraftInput] = useState<string>('');

  // Refs for auto-scroll & focus restoration
  const logsRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Virtual keyboard offset detection for mobile landscape
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleViewport = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(diff > 40 ? diff : 0);
    };
    vv.addEventListener('resize', handleViewport);
    vv.addEventListener('scroll', handleViewport);
    return () => {
      vv.removeEventListener('resize', handleViewport);
      vv.removeEventListener('scroll', handleViewport);
    };
  }, []);

  // Sync welcome greeting when language changes if history is untouched
  useEffect(() => {
    setHistory(prev => {
      if (prev.length === 1 && prev[0].type === 'comment') {
        const otherLang = lang === 'en' ? 'pl' : 'en';
        if (prev[0].text === TERMINAL_I18N[otherLang].welcome) {
          return [{ text: TERMINAL_I18N[lang].welcome, type: 'comment' }];
        }
      }
      return prev;
    });
  }, [lang]);

  // Restore focus to toggle button when terminal console closes
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      toggleBtnRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  // Focus input on console open if pointer is fine
  useEffect(() => {
    if (isOpen) {
      stickToBottomRef.current = true;
      requestAnimationFrame(() => {
        if (logsRef.current) {
          logsRef.current.scrollTop = logsRef.current.scrollHeight;
        }
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Track if user is near bottom to auto-scroll
  const handleLogsScroll = () => {
    const el = logsRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  // Auto-scroll logs container on new history entry
  useEffect(() => {
    const el = logsRef.current;
    if (!el || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [history]);

  // Pomodoro tracking
  const [pomodoroState, setPomodoroState] = useState<PomodoroState | null>(null);

  // Pomodoro countdown timer
  useEffect(() => {
    if (!pomodoroState?.isRunning) return;
    const intervalId = setInterval(() => {
      setPomodoroState(prev => {
        if (!prev || !prev.isRunning) return prev;
        if (prev.timeLeft <= 1) {
          // Completed! Append notice to terminal history
          const finishNotice: CommandOutput = {
            text: TERMINAL_I18N[lang].pomodoroCompleteLog,
            type: 'success'
          };
          setHistory(h => [...h, finishNotice].slice(-500));
          return { ...prev, timeLeft: 0, isRunning: false, isFinished: true };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(intervalId);
  }, [pomodoroState?.isRunning, lang]);

  const addOutput = useCallback((text: string, type: CommandOutput['type'] = 'output') => {
    setHistory(prev => [...prev, { text, type }].slice(-500));
  }, []);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    stickToBottomRef.current = true;
    const rawCmd = inputVal.trim();
    if (!rawCmd) return;

    // Add command to navigation history (max 50, distinct consecutive)
    setCommandHistory(prev => {
      const filtered = prev[prev.length - 1] === rawCmd ? prev : [...prev, rawCmd];
      return filtered.slice(-50);
    });
    setHistoryIdx(-1);
    setDraftInput('');

    // Mask sensitive API keys in visible terminal history
    const shownText = /^ai\s+key\s+set\b/i.test(rawCmd) ? '> ai key set ••••••' : `> ${rawCmd}`;
    const inputEntry: CommandOutput = { text: shownText, type: 'input' };
    setHistory(prev => [...prev, inputEntry].slice(-500));
    setInputVal('');

    const context: TerminalContext = {
      repos,
      lang,
      onSelectCategory,
      onOpenRepo,
      setHistory: (updater) => {
        setHistory(prev => {
          const next = typeof updater === 'function' ? updater(prev) : updater;
          return next.slice(-500);
        });
      },
      addOutput,
      pomodoroState,
      setPomodoroState,
      abortControllerRef,
      setIsAiLoading,
      isAiLoading
    };

    await executeTerminalCommand(rawCmd, context);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 1. History navigation: ArrowUp
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      if (historyIdx === -1) {
        setDraftInput(inputVal);
        const lastIdx = commandHistory.length - 1;
        setHistoryIdx(lastIdx);
        setInputVal(commandHistory[lastIdx]);
      } else if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      }
      return;
    }

    // 2. History navigation: ArrowDown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;

      if (historyIdx < commandHistory.length - 1) {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInputVal(commandHistory[nextIdx]);
      } else {
        setHistoryIdx(-1);
        setInputVal(draftInput);
      }
      return;
    }

    // 3. Tab Autocompletion
    if (e.key === 'Tab') {
      e.preventDefault();
      const completion = getTabCompletion(inputVal, repos);
      if (completion) {
        setInputVal(completion);
      }
      return;
    }

    // 4. Escape: cancel active AI query or close terminal
    if (e.key === 'Escape') {
      e.preventDefault();
      if (isAiLoading && abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsAiLoading(false);
      } else {
        setIsOpen(false);
      }
      return;
    }

    // 5. Ctrl+C: cancel active AI query
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      if (isAiLoading && abortControllerRef.current) {
        e.preventDefault();
        abortControllerRef.current.abort();
        setIsAiLoading(false);
      }
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* 1. Floating Pomodoro Display — ALWAYS rendered independently of modal state */}
      {pomodoroState && (
        <div 
          id="pomodoro_widget" 
          role="status"
          aria-live="polite"
          className={`fixed top-3 right-3 z-50 bg-[#0E0E0E]/95 border border-editorial-accent/60 text-editorial-accent rounded-none px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xl flex items-center gap-2.5 sm:gap-3 font-mono text-xs sm:text-sm backdrop-blur-md transition-all ${
            pomodoroState.isRunning ? 'animate-pulse' : ''
          }`}
        >
          {pomodoroState.isFinished ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <div>
                <div className="text-[9px] sm:text-[10px] text-emerald-400 font-sans tracking-wide uppercase font-bold">
                  {lang === 'en' ? 'COMPLETED' : 'UKOŃCZONO'}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white">
                  {lang === 'en' ? 'Session Finished' : 'Koniec Skupienia'}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-2 h-2 rounded-none bg-editorial-accent animate-ping shrink-0" />
              <div>
                <div className="text-[9px] sm:text-[10px] text-editorial-muted font-sans tracking-wide uppercase">
                  {pomodoroState.label}
                </div>
                <div className="text-sm sm:text-base font-bold text-white">
                  {formatTime(pomodoroState.timeLeft)}
                </div>
              </div>
            </>
          )}

          <button 
            type="button"
            id="stop_pomodoro_btn"
            onClick={() => setPomodoroState(null)} 
            aria-label={lang === 'en' ? 'Dismiss Pomodoro timer' : 'Zamknij licznik Pomodoro'}
            className="p-1 hover:bg-neutral-800 text-[#8b949e] hover:text-white border border-[#30363d] cursor-pointer ml-1"
            title={lang === 'en' ? 'Close / Reset Pomodoro' : 'Zamknij / Zresetuj Pomodoro'}
          >
            <Square size={13} className="fill-current" />
          </button>
        </div>
      )}

      {/* 2. Terminal Toggle & Console — Hidden when modal is actively open */}
      <div className={isModalOpen ? 'hidden' : ''}>
        {/* Toggle button */}
        <div 
          id="terminal_toggle_wrapper"
          className="flex flex-col items-end gap-1.5 pointer-events-auto shrink-0"
        >
          <button
            ref={toggleBtnRef}
            type="button"
            id="toggle_terminal_btn"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen 
              ? (lang === 'en' ? 'Close developer terminal' : 'Zamknij terminal dewelopera') 
              : (lang === 'en' ? 'Open developer terminal' : 'Otwórz terminal dewelopera')}
            aria-expanded={isOpen}
            aria-controls="terminal_console"
            className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2.5 short:py-1 short:px-2 rounded-none border transition-colors duration-200 font-mono text-[10.5px] sm:text-xs short:text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none shadow-2xl backdrop-blur-sm shrink-0 whitespace-nowrap touch-manipulation
              ${isOpen 
                ? 'bg-red-950/90 text-red-300 border-red-500/60 hover:bg-red-900' 
                : 'bg-[#0E0E0E]/95 text-editorial-accent border-editorial-border hover:border-editorial-accent font-bold hover:text-white'}`}
          >
            <Terminal size={14} className="shrink-0" />
            <span className="hidden sm:inline">
              {isOpen ? (lang === 'en' ? 'Close Console' : 'Zamknij Konsolę') : (lang === 'en' ? 'Developer Terminal' : 'Terminal Dewelopera')}
            </span>
            <span className="sm:hidden text-[10px] font-bold tracking-tight">
              {isOpen ? (lang === 'en' ? 'Close' : 'Zamknij') : 'Term'}
            </span>
          </button>
        </div>

        {/* Console Window */}
        {isOpen && (
          <div 
            id="terminal_console" 
            role="region"
            aria-label={lang === 'en' ? 'Developer Terminal Console' : 'Konsola Terminala Deweloperskiego'}
            translate="no" 
            style={{
              bottom: keyboardOffset > 0 ? `${keyboardOffset + 54}px` : undefined,
            }}
            className="fixed left-2 right-2 sm:left-auto sm:right-6 sm:w-[500px] bottom-16 sm:bottom-20 h-[min(22rem,calc(100dvh-7rem))] z-50 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-4.5rem)] sm:max-h-96 short:top-auto short:bottom-[3.75rem] sm:short:bottom-16 short:right-2 sm:short:right-4 short:h-[min(55dvh,calc(100dvh-4.5rem))] short:max-h-[calc(100dvh-4rem)] bg-[#0A0A0A]/95 backdrop-blur-md border-2 border-editorial-border rounded-none shadow-2xl overflow-hidden flex flex-col font-mono text-xs select-text notranslate overscroll-contain box-border"
          >
            {/* Header */}
            <div className="bg-editorial-sidebar-bg px-3 sm:px-4 py-1.5 sm:py-2 short:py-1 border-b border-editorial-border flex items-center justify-between text-editorial-muted shrink-0">
              <div className="flex items-center gap-1.5 uppercase tracking-wider text-[9.5px] sm:text-[10px] short:text-[9px]">
                <span className="w-2 h-2 bg-neutral-700 inline-block pointer-events-none" />
                <span className="w-2 h-2 bg-neutral-600 inline-block pointer-events-none" />
                <span className="w-2 h-2 bg-neutral-500 inline-block pointer-events-none" />
                <span className="ml-1.5 font-bold text-white truncate">sh — tomekdot@archive</span>
                {isAiLoading && (
                  <span className="ml-2 text-cyan-400 font-bold animate-pulse text-[9px] uppercase">
                    [AI BUSY]
                  </span>
                )}
              </div>
              <button 
                type="button"
                id="close_terminal_top_btn"
                onClick={() => setIsOpen(false)} 
                aria-label={lang === 'en' ? 'Close terminal window' : 'Zamknij okno terminala'}
                className="text-editorial-muted hover:text-white transition-colors cursor-pointer p-0.5 ml-2 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Logs Area */}
            <div 
              ref={logsRef} 
              role="log"
              aria-live="polite"
              aria-atomic="false"
              onScroll={handleLogsScroll}
              className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-4 short:p-2 pb-1.5 space-y-1.5 short:space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent overscroll-contain"
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
                    <div 
                      key={index} 
                      className={`${textClass} whitespace-pre-wrap leading-relaxed break-words text-[11px] sm:text-xs short:text-[10px] short:leading-tight`}
                    >
                      {renderLogText(log.text)}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Input Form */}
            <form 
              onSubmit={handleCommandSubmit} 
              className="bg-editorial-sidebar-bg p-1.5 sm:p-2 short:p-1 border-t border-editorial-border flex items-center gap-1.5 sm:gap-2 shrink-0"
            >
              <span className="text-editorial-muted pl-1.5 shrink-0">
                <CornerDownRight size={12} />
              </span>
              <input
                ref={inputRef}
                type="text"
                id="terminal_input"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === 'en' ? "Type command ('help', 'open <repo>', 'ai <query>')..." : "Wpisz komendę ('help', 'open <repo>', 'ai <pytanie>')..."}
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-editorial-accent text-[11px] sm:text-xs short:text-[10.5px] placeholder:text-zinc-700 font-mono py-1 short:py-0.5"
                maxLength={2000}
                autoComplete="off"
                spellCheck={false}
              />
            </form>
          </div>
        )}
      </div>
    </>
  );
}
