/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'motion/react';
import { X, Calendar, Clock, Tag, BookOpen, Minus, ChevronUp, Minimize2 } from 'lucide-react';
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
}

export default function BlogModal({ 
  post: inputPost, 
  onClose, 
  lang,
  isMinimized = false,
  onMinimize,
  onRestore
}: BlogModalProps) {
  const lastPostRef = useRef<BlogPost | null>(null);
  if (inputPost) lastPostRef.current = inputPost;
  const post = inputPost ?? lastPostRef.current;
  const isOpen = Boolean(inputPost);

  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
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

  // Bind Escape key to close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Scroll to top and reset title expansion when opening an article
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
    setIsTitleExpanded(false);
  }, [post?.id, isOpen]);

  if (!post) return null;

  const title = lang === 'en' ? post.titleEn : post.titlePl;
  const content = lang === 'en' ? post.contentEn : post.contentPl;
  const explicitReadingTime = lang === 'en' ? post.readingTimeEn : post.readingTimePl;
  const readingTime = explicitReadingTime || calculateReadingTime(content, lang);

  return (
    <AnimatePresence>
      {isOpen && (
        isMinimized ? (
        <motion.div
          key="blog_minimized_dock"
          id="blog_minimized_dock"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full min-w-0 max-w-full p-1.5 sm:p-2 [@media(max-height:520px)]:p-1 flex items-center gap-1.5 sm:gap-2 bg-[#0D0D0D]/95 border-2 border-cyan-500/80 rounded-none font-mono text-white cursor-pointer shadow-xl"
          onClick={onRestore}
          title={lang === 'en' ? 'Click to restore journal article' : 'Kliknij, aby przywrócić artykuł'}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="p-1 sm:p-1.5 [@media(max-height:520px)]:p-1 bg-neutral-900 border border-editorial-border text-cyan-400 shrink-0">
              <BookOpen size={12} className="sm:w-[13px] sm:h-[13px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                <MarqueeText 
                  text={title} 
                  className="text-[11px] sm:text-xs [@media(max-height:520px)]:text-[10px] font-bold text-white flex-1 min-w-0" 
                />
                <span className="hidden md:inline-block text-[8.5px] uppercase px-1 py-0.2 bg-[#0E1B24] border border-cyan-500/40 text-cyan-400 font-bold shrink-0">
                  {readingTime}
                </span>
              </div>
              <p className="text-[8.5px] sm:text-[9.5px] [@media(max-height:520px)]:text-[8px] text-editorial-muted truncate font-sans">
                {lang === 'en' ? 'Click to restore ↗' : 'Kliknij, by otworzyć ↗'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              id="restore_blog_modal_btn"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.();
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 [@media(max-height:520px)]:w-6.5 [@media(max-height:520px)]:h-6.5 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-cyan-400 hover:text-white transition-colors cursor-pointer shrink-0"
              title={lang === 'en' ? 'Expand article' : 'Przywróć artykuł'}
            >
              <ChevronUp size={13} className="sm:w-3.5 sm:h-3.5" />
            </button>
            <button
              type="button"
              id="dismiss_blog_modal_btn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-6 h-6 sm:w-8 sm:h-8 [@media(max-height:520px)]:w-6.5 [@media(max-height:520px)]:h-6.5 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-rose-500 text-editorial-muted hover:text-rose-400 transition-colors cursor-pointer shrink-0"
              title={lang === 'en' ? 'Close' : 'Zamknij'}
            >
              <X size={13} className="sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="blog_modal_portal"
          id="blog_modal_portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 short:p-1 overflow-hidden"
        >
          {/* Backdrop overlay */}
          <motion.div
            id="blog_modal_backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80"
          />

          {/* Modal Window Container with native Framer Motion drag to minimize */}
          {!isMinimized && (
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
              className="relative bg-editorial-bg border-2 border-editorial-border w-[calc(100vw-1rem)] sm:w-[min(42rem,calc(100vw-4rem))] lg:w-[min(48rem,calc(100vw-6rem))] short:w-[min(56rem,calc(100vw-1rem))] h-[min(84dvh,720px)] max-h-[calc(100dvh-2rem)] short:h-[calc(100dvh-0.5rem)] short:max-h-[calc(100dvh-0.5rem)] rounded-none shadow-2xl flex flex-col overflow-hidden min-w-0 my-auto"
            >
            {/* iOS/iPhone-style pull-down handle (clean pill bar, no text) */}
            <div 
              className="w-full flex items-center justify-center pt-2.5 pb-2 short:pt-1 short:pb-1 bg-editorial-sidebar-bg cursor-grab active:cursor-grabbing select-none shrink-0 group border-b border-editorial-border/30 touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
              title={lang === 'en' ? 'Drag down to minimize' : 'Przeciągnij w dół, aby zminimalizować'}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-600 group-hover:bg-cyan-400 transition-colors" />
            </div>

            {/* Header Block - draggable from blank areas */}
            <div 
              className={`shrink-0 border-b border-editorial-border bg-editorial-sidebar-bg px-3.5 sm:px-6 transition-all duration-200 flex items-start justify-between select-none cursor-grab active:cursor-grabbing touch-none ${
                isTitleExpanded ? 'py-2.5 sm:py-4 short:py-2.5' : 'py-2.5 sm:py-4 short:py-2'
              }`}
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
            >
            <div className={`min-w-0 flex-1 pr-2 ${
              isTitleExpanded 
                ? 'flex flex-col items-start gap-1 sm:gap-1.5' 
                : 'short:flex short:items-center short:gap-2.5 short:overflow-hidden'
            }`}>
              <div className={`flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-editorial-muted uppercase tracking-wider ${
                isTitleExpanded 
                  ? 'order-2 mt-1' 
                  : 'mb-1.5 sm:mb-2 short:order-2 short:mb-0 short:flex-nowrap short:overflow-hidden short:shrink'
              }`}>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                  <Calendar size={10} className="text-editorial-accent shrink-0" />
                  {post.date}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-semibold whitespace-nowrap shrink-0">
                  <Clock size={10} className="text-editorial-accent shrink-0" />
                  {readingTime}
                </span>
                {isTitleExpanded && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTitleExpanded(false);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 text-[9px] font-mono uppercase hover:bg-cyan-900/80 transition-colors cursor-pointer shrink-0"
                    title={lang === 'en' ? 'Collapse title' : 'Zwiń tytuł'}
                  >
                    <span>▲ {lang === 'en' ? 'COLLAPSE' : 'ZWIŃ'}</span>
                  </button>
                )}
              </div>

              {/* Title element with click-to-expand */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTitleExpanded(prev => !prev);
                }}
                className={`text-left group/title focus:outline-none cursor-pointer w-full transition-all ${
                  isTitleExpanded 
                    ? 'order-1' 
                    : 'short:order-1 short:flex short:items-center short:flex-nowrap short:shrink short:max-w-[70%]'
                }`}
                title={isTitleExpanded 
                  ? (lang === 'en' ? 'Click to collapse title' : 'Kliknij, aby zwinąć tytuł')
                  : (lang === 'en' ? 'Click to show full title' : 'Kliknij, aby rozwinąć cały tytuł')
                }
              >
                <h2 className={`font-bold font-mono text-white uppercase tracking-wider transition-colors group-hover/title:text-cyan-300 flex items-center ${
                  isTitleExpanded
                    ? 'text-base sm:text-2xl break-words leading-snug whitespace-normal'
                    : 'text-base sm:text-2xl break-words pr-2 sm:pr-4 leading-snug short:text-sm sm:short:text-base short:truncate'
                }`}>
                  <span className={!isTitleExpanded ? 'short:truncate' : ''}>{title}</span>
                  {!isTitleExpanded && (
                    <span 
                      className="hidden short:inline-flex items-center gap-0.5 ml-1.5 text-[9px] text-cyan-400 font-mono font-normal border border-cyan-500/30 px-1 py-0.2 bg-cyan-950/40 group-hover/title:border-cyan-400 group-hover/title:bg-cyan-900/60 align-middle shrink-0"
                      title={lang === 'en' ? 'Expand full title' : 'Rozwiń pełny tytuł'}
                    >
                      ▼ {lang === 'en' ? 'FULL' : 'CAŁOŚĆ'}
                    </span>
                  )}
                </h2>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="minimize_blog_modal_btn"
                onClick={onMinimize}
                className="w-8 h-8 sm:w-9 sm:h-9 short:w-7 short:h-7 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded-none transition-all border border-cyan-500/50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title={lang === 'en' ? 'Minimize' : 'Zminimalizuj'}
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                id="close_blog_modal_btn"
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 short:w-7 short:h-7 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title={lang === 'en' ? 'Close description' : 'Zamknij opis'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Blog Content Block */}
          <div 
            ref={modalBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-5 short:p-2 space-y-3 sm:space-y-4 short:space-y-2 bg-editorial-bg select-text scrollbar-thin scrollbar-thumb-neutral-800 min-w-0 w-full"
          >
            {/* Tags line */}
            <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-4 short:hidden">
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
            <div className="markdown-body text-editorial-text font-serif text-xs sm:text-sm leading-relaxed prose prose-invert max-w-none space-y-3 sm:space-y-4 min-w-0 max-w-full overflow-hidden [&_ol]:pl-6 sm:[&_ol]:pl-8 [&_ul]:pl-6 sm:[&_ul]:pl-8 [&_ol]:list-outside [&_ul]:list-outside">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h3: ({ node, ...props }) => (
                    <h3 className="text-base sm:text-lg font-bold font-mono text-white uppercase tracking-wider border-b border-editorial-border pb-1 mt-4 mb-2 break-words" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-xs sm:text-sm font-bold font-mono text-editorial-accent uppercase tracking-wide mt-3 mb-1.5 break-words" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <div className="font-sans text-editorial-text/90 leading-relaxed text-xs sm:text-sm mb-3 break-words" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="my-2 sm:my-3 space-y-1.5 sm:space-y-2 list-disc list-outside pl-6 sm:pl-8 marker:text-editorial-accent text-xs sm:text-sm text-editorial-text font-mono leading-relaxed" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="my-2 sm:my-3 space-y-1.5 sm:space-y-2 list-decimal list-outside pl-6 sm:pl-8 marker:font-mono marker:text-editorial-accent text-xs sm:text-sm text-editorial-text font-mono leading-relaxed" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="pl-0.5 font-mono text-xs sm:text-sm leading-relaxed break-words" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a className="text-editorial-accent underline hover:text-white font-mono break-all" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre className="pl-3.5 pr-4 sm:pl-4 sm:pr-8 py-2.5 sm:py-3.5 bg-neutral-900 border border-editorial-border font-mono text-[11px] sm:text-xs overflow-x-auto text-[#e6edf3] my-3 rounded-none max-w-full min-w-0 scrollbar-thin scrollbar-thumb-neutral-800" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="px-1.5 py-0.5 bg-neutral-950 font-mono text-[11px] sm:text-xs text-rose-400 border border-editorial-border/40 break-all" {...props} />
                  ),
                  table: ({ node, ...props }) => <div className="overflow-x-auto my-3 max-w-full min-w-0"><table className="w-full text-left border-collapse border border-editorial-border text-xs sm:text-sm font-sans" {...props} /></div>,
                  thead: ({ node, ...props }) => <thead className="bg-neutral-900/80 border-b border-editorial-border text-editorial-accent font-mono" {...props} />,
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

          {/* Footer Block */}
          <div className="shrink-0 bg-editorial-sidebar-bg border-t border-editorial-border px-3.5 sm:px-6 py-2.5 sm:py-3.5 short:py-1.5 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-editorial-muted">
            <span className="flex items-center gap-1.5 text-editorial-accent font-bold">
              <BookOpen size={13} />
              {lang === 'en' ? 'TOMEKDOT JOURNAL' : 'DZIENNIK TOMEKDOT'}
            </span>
            <span className="flex items-center gap-1.5 text-editorial-muted">
              <Clock size={13} className="text-editorial-accent" />
              <span>{readingTime}</span>
            </span>
          </div>
        </motion.div>
        )}
      </motion.div>
      )
      )}
    </AnimatePresence>
  );
}
