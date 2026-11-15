/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'motion/react';
import { X, Calendar, Clock, Tag, BookOpen, Minus, ChevronUp, Minimize2, Bot, GitCompare } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost } from '../types';
import { calculateReadingTime } from '../data';
import MarqueeText from './MarqueeText';

interface BlogModalProps {
  post: BlogPost | null;
  onClose: () => void;
  lang: 'en' | 'pl';
  isMinimized?: boolean;
  onMinimize?: () => void;
  onRestore?: () => void;
  onOpenAiTools?: (post: BlogPost, mode: 'chat' | 'critique' | 'diff') => void;
}

export default function BlogModal({ 
  post: inputPost, 
  onClose, 
  lang,
  isMinimized = false,
  onMinimize,
  onRestore,
  onOpenAiTools
}: BlogModalProps) {
  const lastPostRef = useRef<BlogPost | null>(null);
  if (inputPost) lastPostRef.current = inputPost;
  const post = inputPost ?? lastPostRef.current;
  const isOpen = Boolean(inputPost);

  const [isShortTitleExpanded, setIsShortTitleExpanded] = useState(false);
  const dragControls = useDragControls();
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    dragControls.start(e);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 45 || info.velocity.y > 500) {
      onMinimize?.();
    }
  };

  // Bind Escape key only when full modal is open and not minimized
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized, onClose]);

  // Scroll to top and reset short title expansion when opening an article
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    setIsShortTitleExpanded(false);
  }, [post?.id, isOpen]);

  if (!post) return null;

  const title = lang === 'en' ? post.titleEn : post.titlePl;
  const rawContent = lang === 'en' ? post.contentEn : post.contentPl;
  // Sanitize any accidental local file:/// protocol schemes to prevent browser Security Error on https://
  const content = rawContent.replace(/file:\/\/\/[^\s\)"']*/gi, '#').replace(/file:\/\/[^\s\)"']*/gi, '#');
  const explicitReadingTime = lang === 'en' ? post.readingTimeEn : post.readingTimePl;
  const readingTime = explicitReadingTime || calculateReadingTime(content, lang);

  const minimizedDock = (
    <AnimatePresence>
      {isOpen && isMinimized && (
        <motion.div
          key="blog_minimized_dock"
          id="blog_minimized_dock"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.13, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full min-w-0 max-w-full px-2 py-1 sm:p-2 [@media(max-height:520px)]:py-0.5 [@media(max-height:520px)]:px-1.5 flex items-center gap-1.5 sm:gap-2 bg-[#0D0D0D] border border-cyan-500/70 sm:border-2 rounded-none font-mono text-white cursor-pointer shadow-xl select-none touch-manipulation landscape:max-w-[210px] sm:landscape:max-w-[240px]"
          onClick={onRestore}
          title={lang === 'en' ? 'Click to restore journal article' : 'Kliknij, aby przywrócić artykuł'}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="p-0.5 sm:p-1 [@media(max-height:520px)]:p-0.5 bg-neutral-900 border border-editorial-border text-cyan-400 shrink-0 flex items-center justify-center">
              <BookOpen size={11} className="sm:w-[13px] sm:h-[13px]" />
            </span>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <MarqueeText 
                  text={title} 
                  className="text-[10px] sm:text-xs font-bold text-white flex-1 min-w-0 tracking-tight" 
                />
                <span className="inline-block text-[7.5px] sm:text-[8.5px] uppercase px-1 py-0.2 sm:px-1.5 sm:py-0.5 bg-[#0E1B24] border border-cyan-500/40 text-cyan-400 font-bold shrink-0 font-mono tracking-wider max-w-[55px] sm:max-w-[75px] truncate">
                  {readingTime}
                </span>
              </div>
              <p className="hidden sm:block text-[8.5px] sm:text-[9.5px] text-editorial-muted truncate font-sans">
                {lang === 'en' ? 'Click to restore ↗' : 'Kliknij, by otworzyć ↗'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            <button
              type="button"
              id="restore_blog_modal_btn"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.();
              }}
              className="w-5.5 h-5.5 sm:w-7 sm:h-7 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-cyan-400 hover:text-white transition-colors cursor-pointer shrink-0 touch-manipulation"
              title={lang === 'en' ? 'Expand article' : 'Przywróć artykuł'}
            >
              <ChevronUp size={11} className="sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              id="dismiss_blog_modal_btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-5.5 h-5.5 sm:w-7 sm:h-7 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-rose-500 text-editorial-muted hover:text-rose-400 transition-colors cursor-pointer shrink-0 touch-manipulation"
              title={lang === 'en' ? 'Close' : 'Zamknij'}
            >
              <X size={11} className="sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const fullModalPortal = (
    <AnimatePresence>
      {isOpen && !isMinimized && (
        <motion.div
          key="blog_modal_portal"
          id="blog_modal_portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 short:p-1 overflow-hidden pointer-events-auto"
        >
          {/* Backdrop overlay */}
          <div
            id="blog_modal_backdrop"
            onClick={onClose}
            className="fixed inset-0 bg-black/80"
          />

          {/* Modal Window Container with native Framer Motion drag to minimize */}
          <motion.div
            id="blog_modal_window"
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-editorial-bg border-2 border-editorial-border w-[95vw] sm:w-[90vw] md:w-[85vw] max-w-3xl lg:max-w-4xl h-[86vh] max-h-[760px] land:h-[calc(100vh-1rem)] short:h-[calc(100vh-1rem)] rounded-none shadow-2xl flex flex-col overflow-hidden min-w-0 my-auto"
          >
            {/* iOS/iPhone-style pull-down handle (shown on portrait mobile & desk+, hidden on rotated landscape/short screens to maximize reading space) */}
            <div 
              className="flex land:hidden short:hidden desk:flex w-full items-center justify-center pt-2.5 pb-1.5 bg-editorial-sidebar-bg cursor-grab active:cursor-grabbing select-none shrink-0 group border-b border-editorial-border/30 touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
              title={lang === 'en' ? 'Drag down to minimize' : 'Przeciągnij w dół, aby zminimalizować'}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-600 group-hover:bg-cyan-400 transition-colors" />
            </div>

            {/* Header Block - draggable from blank areas */}
            <div 
              className="shrink-0 border-b border-editorial-border bg-editorial-sidebar-bg px-3.5 sm:px-5 desk:px-6 py-2.5 sm:py-3.5 land:py-1.5 short:py-1.5 flex items-center sm:items-start justify-between gap-2 select-none cursor-grab active:cursor-grabbing touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
            >
              <div className="min-w-0 flex-1 pr-1 flex flex-col items-start gap-1 sm:gap-1.5">
                {/* Metadata badge row: Date & Reading Time shown on portrait (< sm) & desk+, hidden in horizontal/short mobile */}
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-editorial-muted uppercase tracking-wider mb-0.5 sm:mb-1 land:hidden short:hidden desk:flex">
                  <span className="hidden desk:inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                    <Calendar size={10} className="text-editorial-accent shrink-0" />
                    {post.date}
                  </span>
                  <span className="shrink-0 whitespace-nowrap inline-flex land:hidden short:hidden desk:inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-semibold">
                    <Clock size={10} className="text-editorial-accent shrink-0" />
                    {readingTime}
                  </span>
                </div>

                {/* Title element */}
                <div 
                  className="w-full min-w-0"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div
                    onClick={(e) => {
                      if (window.matchMedia('(max-height: 520px)').matches) {
                        e.stopPropagation();
                        setIsShortTitleExpanded(prev => !prev);
                      }
                    }}
                    className="text-left w-full short:cursor-pointer cursor-text select-text"
                    title={lang === 'en' ? 'Article title' : 'Tytuł artykułu'}
                  >
                    <h2 className={`font-bold font-mono text-white uppercase tracking-wider text-sm sm:text-xl land:text-xs desk:text-2xl break-words leading-snug ${
                      !isShortTitleExpanded ? 'land:line-clamp-2 short:line-clamp-2 desk:line-clamp-none' : ''
                    }`}>
                      {title}
                    </h2>
                  </div>
                </div>
              </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="minimize_blog_modal_btn"
                onClick={onMinimize}
                className="w-8 h-8 sm:w-9 sm:h-9 land:w-7 land:h-7 short:w-7 short:h-7 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded-none transition-all border border-cyan-500/50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title={lang === 'en' ? 'Minimize' : 'Zminimalizuj'}
              >
                <Minimize2 size={15} />
              </button>
              <button
                type="button"
                id="close_blog_modal_btn"
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 land:w-7 land:h-7 short:w-7 short:h-7 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title={lang === 'en' ? 'Close description' : 'Zamknij opis'}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Scrollable Blog Content Block */}
          <div 
            ref={modalBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3.5 sm:p-5 land:px-4 land:py-2.5 short:px-3.5 short:py-2 bg-editorial-bg select-text scrollbar-thin scrollbar-thumb-neutral-800 min-w-0 w-full"
          >
            {/* Tags line */}
            <div className="flex flex-wrap gap-1.5 mb-3 sm:mb-4 short:hidden land:hidden desk:flex">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-editorial-border bg-neutral-900 font-mono text-[9px] uppercase font-semibold text-editorial-accent"
                >
                  <Tag size={8} className="text-editorial-accent" />
                  #{tag.toUpperCase()}
                </span>
              ))}
            </div>

            {/* Main Article Body */}
            <div className="markdown-body text-zinc-200 font-sans text-[13.5px] sm:text-[15px] land:text-[13.5px] leading-relaxed sm:leading-7 land:leading-relaxed prose prose-invert max-w-none space-y-3 sm:space-y-4 land:space-y-2.5 min-w-0 max-w-full overflow-hidden [&_ol]:pl-5 sm:[&_ol]:pl-8 [&_ul]:pl-5 sm:[&_ul]:pl-8 [&_ol]:list-outside [&_ul]:list-outside [&>*:first-child]:!mt-0">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h3: ({ node, ...props }) => (
                    <h3 className="text-sm sm:text-lg land:text-sm desk:text-xl font-bold font-mono text-cyan-200 uppercase tracking-wide border-b border-editorial-border/80 pb-1 mt-4 sm:mt-5 land:mt-3 mb-2 break-words flex items-center gap-2" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-xs sm:text-sm font-bold font-mono text-amber-300 uppercase mt-3.5 land:mt-2.5 mb-1.5 break-words" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="font-sans text-zinc-200/90 leading-relaxed sm:leading-7 land:leading-relaxed text-[13.5px] sm:text-[15px] land:text-[13.5px] mb-3 land:mb-2.5 break-words" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="my-2.5 space-y-1.5 list-disc list-outside pl-5 sm:pl-8 marker:text-cyan-400 text-[13.5px] sm:text-[14.5px] land:text-[13px] text-zinc-200 font-sans leading-relaxed" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="my-2.5 space-y-1.5 list-decimal list-outside pl-5 sm:pl-8 marker:font-mono marker:text-cyan-400 text-[13.5px] sm:text-[14.5px] land:text-[13px] text-zinc-200 font-sans leading-relaxed" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="pl-1 font-sans text-[13.5px] sm:text-[14.5px] land:text-[13px] leading-relaxed break-words text-zinc-200" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="text-white font-semibold" {...props} />
                  ),
                  em: ({ node, ...props }) => (
                    <em className="text-zinc-300 italic" {...props} />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote className="border-l-4 border-cyan-500/70 bg-neutral-900/60 pl-3.5 pr-3 py-2 my-3 italic text-zinc-200 text-xs sm:text-sm font-sans rounded-none" {...props} />
                  ),
                  a: ({ node, href, children, ...props }) => {
                    const safeHref = (href && !href.startsWith('file:') && !href.startsWith('file:///')) ? href : '#';
                    return (
                      <a 
                        href={safeHref} 
                        className="text-cyan-400 underline hover:text-white font-mono text-xs sm:text-sm font-semibold break-words" 
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
                  pre: ({ node, ...props }) => (
                    <pre className="p-3 sm:p-4 bg-[#0d1117] border border-editorial-border font-mono text-xs sm:text-sm overflow-x-auto text-zinc-200 my-2.5 rounded-none max-w-full min-w-0 scrollbar-thin scrollbar-thumb-neutral-800 leading-relaxed" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="px-1.5 py-0.5 bg-neutral-800 font-mono text-xs text-amber-200 border border-neutral-700/50 break-words notranslate" translate="no" {...props} />
                  ),
                  table: ({ node, ...props }) => <div className="overflow-x-auto my-3 max-w-full min-w-0 border border-editorial-border"><table className="w-full text-left border-collapse text-xs sm:text-sm font-sans" {...props} /></div>,
                  thead: ({ node, ...props }) => <thead className="bg-neutral-900/90 border-b border-editorial-border text-cyan-200 font-mono" {...props} />,
                  tbody: ({ node, ...props }) => <tbody className="divide-y divide-editorial-border/50" {...props} />,
                  tr: ({ node, ...props }) => <tr className="hover:bg-neutral-900/30 transition-colors" {...props} />,
                  th: ({ node, ...props }) => <th className="px-2.5 sm:px-3 py-1.5 sm:py-2 font-semibold border-r border-editorial-border/50 last:border-0" {...props} />,
                  td: ({ node, ...props }) => <td className="px-2.5 sm:px-3 py-1.5 sm:py-2 border-r border-editorial-border/50 last:border-0 text-editorial-text" {...props} />,
                }}
              >
                {content}
              </Markdown>
            </div>
          </div>

          {/* Slim Footer: Hidden on rotated landscape & short screens to maximize reading area; 1 crisp single-line action on portrait mobile; tidy 2-button bar on desk+ */}
          <div className="shrink-0 bg-editorial-sidebar-bg border-t border-editorial-border px-3 sm:px-5 desk:px-6 py-1.5 sm:py-2 desk:py-2.5 flex land:hidden short:hidden desk:flex items-center justify-between gap-2 text-[10px] sm:text-[11px] font-mono text-editorial-muted">
            <span className="flex items-center gap-1.5 text-editorial-accent font-bold shrink-0 truncate">
              <BookOpen size={12} className="shrink-0" />
              <span className="desk:hidden">{post.date}</span>
              <span className="hidden desk:inline">{lang === 'en' ? 'TOMEKDOT JOURNAL' : 'DZIENNIK TOMEKDOT'}</span>
            </span>

            {onOpenAiTools ? (
              <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
                <button
                  type="button"
                  id="blog_modal_open_ai_diff_btn"
                  onClick={() => onOpenAiTools(post, 'diff')}
                  className="hidden desk:flex px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-amber-400/70 text-zinc-200 hover:text-amber-200 items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title={lang === 'en' ? 'Compare original v1.0 Raw notes vs expanded v2.0 article' : 'Porównaj oryginalne notatki v1.0 Raw z rozwiniętym artykułem v2.0'}
                >
                  <GitCompare size={11} className="text-amber-400 shrink-0" />
                  <span>v1.0 vs v2.0</span>
                </button>
                <button
                  type="button"
                  id="blog_modal_open_ai_chat_btn"
                  onClick={() => onOpenAiTools(post, 'chat')}
                  className="px-2.5 py-1 bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/70 hover:border-cyan-300 text-cyan-200 hover:text-white flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title={lang === 'en' ? 'Open AI Assistant for this article' : 'Otwórz Asystenta AI dla tego artykułu'}
                >
                  <Bot size={11} className="text-cyan-400 shrink-0" />
                  <span>{lang === 'en' ? 'AI Assistant' : 'Asystent AI'}</span>
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 text-editorial-muted ml-auto">
                <Clock size={12} className="text-editorial-accent" />
                <span>{readingTime}</span>
              </span>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {minimizedDock}
      {typeof document !== 'undefined' ? createPortal(fullModalPortal, document.body) : fullModalPortal}
    </>
  );
}
