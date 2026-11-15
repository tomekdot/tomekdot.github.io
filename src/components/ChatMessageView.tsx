/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Bot, User, Terminal, Sparkles, Layers } from 'lucide-react';

export interface ChatMessageItem {
  id?: string;
  role?: 'user' | 'assistant' | 'system';
  sender?: 'user' | 'assistant';
  text: string;
  time?: string;
  timestamp?: string;
  provider?: string;
  sourcesUsed?: string[];
  usage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens: number;
  };
}

interface ChatMessageViewProps {
  message: ChatMessageItem;
  lang: 'en' | 'pl';
}

function CodeBlockWithCopy({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const rawCode = String(children || '').replace(/\n$/, '');
  const langMatch = /language-(\w+)/.exec(className || '');
  const langTag = langMatch ? langMatch[1].toUpperCase() : 'CODE';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 border border-neutral-800 bg-[#0a0b0e] overflow-hidden rounded-none shadow-sm">
      <div className="flex items-center justify-between px-3 py-1 bg-neutral-900/90 border-b border-neutral-800 text-[10px] font-mono text-neutral-400 select-none">
        <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[9.5px]">
          {langTag}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[9.5px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-neutral-800"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-[11.5px] sm:text-xs font-mono leading-relaxed text-zinc-200 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-800">
        <code className="block notranslate">{children}</code>
      </pre>
    </div>
  );
}

export default function ChatMessageView({ message, lang }: ChatMessageViewProps) {
  const [copiedMsg, setCopiedMsg] = useState(false);

  const isUser = message.role === 'user' || message.sender === 'user';
  const isSystem = message.role === 'system';
  const timeStr = message.time || message.timestamp || '';

  const handleCopyMessage = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  return (
    <div
      className={`border transition-all min-w-0 ${
        isUser
          ? 'bg-[#181512] border-amber-600/35 p-3 sm:p-3.5 text-zinc-100 shadow-sm ml-auto max-w-[94%] sm:max-w-[88%]'
          : isSystem
          ? 'bg-[#0e1614] border-emerald-500/30 p-2.5 sm:p-3 text-emerald-200/90 text-xs'
          : 'bg-[#111215] border-neutral-800/80 p-3 sm:p-4 text-zinc-200 shadow-sm w-full'
      }`}
    >
      {/* Header bar: Sender, Badges, Time, Copy Button */}
      <div className="flex items-center justify-between text-[9.5px] text-neutral-400 border-b border-neutral-800/60 pb-1.5 mb-2 gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="inline-flex items-center gap-1 font-mono font-bold uppercase tracking-wider text-[10px]">
            {isUser ? (
              <>
                <User size={11} className="text-amber-400 shrink-0" />
                <span className="text-amber-300">{lang === 'en' ? 'YOU' : 'TY'}</span>
              </>
            ) : isSystem ? (
              <>
                <Terminal size={11} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-300">{lang === 'en' ? 'SYSTEM' : 'SYSTEM'}</span>
              </>
            ) : (
              <>
                <Bot size={12} className="text-cyan-400 shrink-0" />
                <span className="text-zinc-200">{lang === 'en' ? 'AI ASSISTANT' : 'ASYSTENT AI'}</span>
              </>
            )}
          </span>

          {message.provider && (
            <span className="px-1.5 py-0.2 bg-neutral-900 border border-neutral-700/70 text-neutral-400 text-[8.5px] font-mono tracking-tight shrink-0">
              {message.provider}
            </span>
          )}

          {message.usage && message.usage.totalTokens > 0 && (
            <span className="px-1.5 py-0.2 bg-neutral-900/90 border border-neutral-700/50 text-neutral-300 text-[8.5px] font-mono tracking-tight shrink-0">
              {message.usage.totalTokens.toLocaleString()} tok
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto font-mono text-[9px] text-neutral-500">
          {timeStr && <span>{timeStr}</span>}
          {!isUser && !isSystem && (
            <button
              type="button"
              onClick={handleCopyMessage}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700/60 hover:border-neutral-500 text-neutral-400 hover:text-white transition-colors cursor-pointer text-[9px]"
              title={lang === 'en' ? 'Copy response text' : 'Kopiuj treść odpowiedzi'}
            >
              {copiedMsg ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              <span>{copiedMsg ? (lang === 'en' ? 'Copied' : 'Skopiowano') : (lang === 'en' ? 'Copy' : 'Kopiuj')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Body with calm, non-glaring typography and clean structure */}
      <div className="prose prose-invert max-w-none text-[12.5px] sm:text-[13px] leading-relaxed font-sans text-zinc-200/95 space-y-2 select-text break-words min-w-0">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-sm sm:text-base font-bold font-mono text-zinc-100 uppercase tracking-wide border-b border-neutral-800 pb-1 mt-3 mb-2 break-words" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-[13px] sm:text-sm font-bold font-mono text-cyan-300/90 uppercase tracking-wide border-b border-neutral-800/70 pb-0.5 mt-3 mb-1.5 break-words" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xs sm:text-[13px] font-bold font-mono text-cyan-200/90 uppercase tracking-wide mt-2.5 mb-1 break-words" {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 className="text-xs font-semibold text-zinc-100 mt-2 mb-1 break-words" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="mb-2 leading-relaxed text-zinc-200/90 font-sans break-words last:mb-0" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="my-2 space-y-1 list-disc pl-5 text-zinc-300 text-xs sm:text-[12.5px] leading-relaxed marker:text-cyan-500/60 font-sans" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="my-2 space-y-1 list-decimal pl-5 text-zinc-300 text-xs sm:text-[12.5px] leading-relaxed marker:text-cyan-500/60 font-mono" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="pl-0.5 font-sans break-words leading-relaxed" {...props} />
            ),
            strong: ({ node, ...props }) => (
              <strong className="text-white font-semibold" {...props} />
            ),
            em: ({ node, ...props }) => (
              <em className="text-zinc-300 italic" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-2 border-cyan-500/50 bg-neutral-900/40 pl-3 pr-2 py-1.5 my-2 italic text-zinc-300 text-xs font-sans rounded-none" {...props} />
            ),
            code: ({ node, inline, className, children, ...props }: any) => {
              const isInline = inline || (!className && typeof children === 'string' && !children.includes('\n'));
              if (isInline) {
                return (
                  <code
                    translate="no"
                    className="px-1.5 py-0.5 bg-neutral-800/80 text-amber-200/90 border border-neutral-700/60 font-mono text-[11px] rounded-none break-words notranslate"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <CodeBlockWithCopy className={className}>
                  {children}
                </CodeBlockWithCopy>
              );
            },
            pre: ({ node, children, ...props }: any) => {
              // Direct pre wrapper from markdown: let code component handle inner structure
              return <div {...props}>{children}</div>;
            },
            table: ({ node, ...props }) => (
              <div className="overflow-x-auto my-3 border border-neutral-800 bg-[#0a0b0d] rounded-none max-w-full">
                <table className="w-full text-left border-collapse text-xs font-sans" {...props} />
              </div>
            ),
            thead: ({ node, ...props }) => (
              <thead className="bg-neutral-900/90 border-b border-neutral-800 text-cyan-200/90 font-mono text-[11px] uppercase" {...props} />
            ),
            tbody: ({ node, ...props }) => (
              <tbody className="divide-y divide-neutral-800/50" {...props} />
            ),
            tr: ({ node, ...props }) => (
              <tr className="hover:bg-neutral-900/30 transition-colors" {...props} />
            ),
            th: ({ node, ...props }) => (
              <th className="px-3 py-1.5 font-semibold border-r border-neutral-800/50 last:border-0" {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className="px-3 py-1.5 border-r border-neutral-800/50 last:border-0 text-zinc-300 leading-relaxed" {...props} />
            ),
            a: ({ node, href, children, ...props }) => {
              const safeHref = (href && !href.startsWith('file:') && !href.startsWith('file:///')) ? href : '#';
              return (
                <a
                  href={safeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400/90 hover:text-white underline decoration-dotted font-mono text-xs break-words"
                  {...props}
                >
                  {children}
                </a>
              );
            },
            hr: () => <hr className="my-3 border-neutral-800" />,
          }}
        >
          {message.text.replace(/file:\/\/\/[^\s\)"']*/gi, '#').replace(/file:\/\/[^\s\)"']*/gi, '#')}
        </Markdown>
      </div>

      {/* Sources Used Badges if provided */}
      {message.sourcesUsed && message.sourcesUsed.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-neutral-800/70 flex items-center gap-1.5 flex-wrap text-[9px] text-neutral-400 font-mono">
          <span className="text-neutral-300 font-bold uppercase">{lang === 'en' ? 'Sources:' : 'Źródła:'}</span>
          {message.sourcesUsed.map((src, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-400">
              {src}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
