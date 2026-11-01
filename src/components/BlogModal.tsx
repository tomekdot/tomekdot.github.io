/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'motion/react';
import { X, Calendar, Clock, Tag, BookOpen, Minus, ChevronUp, Minimize2 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BlogPost } from '../types';
import { calculateReadingTime } from '../data';

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

  const dragControls = useDragControls();

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
          className="fixed bottom-3 left-3 z-40 w-[calc(100vw-14rem)] max-w-sm min-w-0 bg-[#0D0D0D]/95 border-2 border-cyan-500/80 hover:border-cyan-400 shadow-[0_12px_36px_rgba(0,0,0,0.9)] backdrop-blur-md p-1.5 sm:p-2.5 flex items-center justify-between gap-1.5 sm:gap-2 text-white font-mono cursor-pointer rounded-none"
          onClick={onRestore}
          title={lang === 'en' ? 'Click to restore journal article' : 'Kliknij, aby przywrócić artykuł'}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="p-1 sm:p-1.5 bg-neutral-900 border border-editorial-border text-cyan-400 shrink-0">
              <BookOpen size={12} className="sm:w-[13px] sm:h-[13px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold truncate text-white">{title}</span>
                <span className="hidden md:inline-block text-[8.5px] uppercase px-1 py-0.2 bg-[#0E1B24] border border-cyan-500/40 text-cyan-400 font-bold shrink-0">
                  {readingTime}
                </span>
              </div>
              <p className="text-[8.5px] sm:text-[9.5px] text-editorial-muted truncate font-sans">
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
              className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-cyan-400 text-cyan-400 hover:text-white transition-colors cursor-pointer shrink-0"
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
              className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-rose-500 text-editorial-muted hover:text-rose-400 transition-colors cursor-pointer shrink-0"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
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
              className="relative bg-editorial-bg border-2 border-editorial-border w-[calc(100vw-1rem)] sm:w-full max-w-2xl min-w-0 max-w-full rounded-none shadow-2xl flex flex-col overflow-hidden h-[78svh] sm:h-auto max-h-[80svh] sm:max-h-[85vh] overscroll-contain my-auto"
            >
            {/* iOS/iPhone-style pull-down handle (clean pill bar, no text) */}
            <div 
              className="w-full flex items-center justify-center pt-2.5 pb-2 bg-editorial-sidebar-bg cursor-grab active:cursor-grabbing select-none shrink-0 group border-b border-editorial-border/30 touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
              title={lang === 'en' ? 'Drag down to minimize' : 'Przeciągnij w dół, aby zminimalizować'}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-600 group-hover:bg-cyan-400 transition-colors" />
            </div>

            {/* Header Block - draggable from blank areas */}
            <div 
              className="bg-editorial-sidebar-bg border-b border-editorial-border px-3.5 sm:px-6 py-2.5 sm:py-4 flex items-start justify-between shrink-0 select-none cursor-grab active:cursor-grabbing touch-none"
              style={{ touchAction: 'none' }}
              onPointerDown={startDrag}
            >
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-2 font-mono text-[9px] text-editorial-muted uppercase tracking-wider">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-zinc-300 font-semibold whitespace-nowrap shrink-0">
                  <Calendar size={10} className="text-editorial-accent shrink-0" />
                  {post.date}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-editorial-muted font-semibold whitespace-nowrap shrink-0">
                  <Clock size={10} className="text-editorial-accent shrink-0" />
                  {readingTime}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-mono text-white break-words pr-4 uppercase tracking-wider">
                {title}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="minimize_blog_modal_btn"
                onClick={onMinimize}
                className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-400 hover:text-white hover:bg-cyan-950/40 rounded-none transition-all border border-cyan-500/50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title={lang === 'en' ? 'Minimize' : 'Zminimalizuj'}
              >
                <Minimize2 size={16} />
              </button>
              <button
                type="button"
                id="close_blog_modal_btn"
                onClick={onClose}
                className="w-8 h-8 sm:w-9 sm:h-9 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title={lang === 'en' ? 'Close description' : 'Zamknij opis'}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable Blog Content Block */}
          <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 bg-editorial-bg select-text scrollbar-thin scrollbar-thumb-neutral-800 min-w-0 w-full">
            {/* Tags line */}
            <div className="flex flex-wrap gap-1.5 mb-6">
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
            <div className="markdown-body text-editorial-text font-serif text-sm leading-relaxed prose prose-invert max-w-none space-y-4 min-w-0 max-w-full overflow-hidden [&_ol]:pl-8 [&_ul]:pl-8 [&_ol]:list-outside [&_ul]:list-outside">
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wider border-b border-editorial-border pb-1.5 mt-6 mb-3 break-words" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-sm font-bold font-mono text-editorial-accent uppercase tracking-wide mt-4 mb-2 break-words" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <div className="font-sans text-editorial-text/90 leading-relaxed text-sm mb-4 break-words" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="my-3 space-y-2 list-disc list-outside pl-8 sm:pl-9 marker:text-editorial-accent text-sm text-editorial-text font-mono leading-relaxed" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="my-3 space-y-2 list-decimal list-outside pl-8 sm:pl-9 marker:font-mono marker:text-editorial-accent text-sm text-editorial-text font-mono leading-relaxed" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="pl-1 font-mono text-sm leading-relaxed break-words" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a className="text-editorial-accent underline hover:text-white font-mono break-all" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre className="pl-4 pr-6 sm:pr-8 py-3.5 sm:py-4 bg-neutral-900 border border-editorial-border font-mono text-xs overflow-x-auto text-[#e6edf3] my-4 rounded-none max-w-full min-w-0 scrollbar-thin scrollbar-thumb-neutral-800" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="px-1.5 py-0.5 bg-neutral-950 font-mono text-xs text-rose-400 border border-editorial-border/40 break-all" {...props} />
                  ),
                  table: ({ node, ...props }) => <div className="overflow-x-auto my-4 max-w-full min-w-0"><table className="w-full text-left border-collapse border border-editorial-border text-sm font-sans" {...props} /></div>,
                  thead: ({ node, ...props }) => <thead className="bg-neutral-900/80 border-b border-editorial-border text-editorial-accent font-mono" {...props} />,
                  tbody: ({ node, ...props }) => <tbody className="divide-y divide-editorial-border/50" {...props} />,
                  tr: ({ node, ...props }) => <tr className="hover:bg-neutral-900/30 transition-colors" {...props} />,
                  th: ({ node, ...props }) => <th className="px-3 py-2 font-semibold border-r border-editorial-border/50 last:border-0" {...props} />,
                  td: ({ node, ...props }) => <td className="px-3 py-2 border-r border-editorial-border/50 last:border-0 text-editorial-text" {...props} />,
                }}
              >
                {content}
              </Markdown>
            </div>
          </div>

          {/* Footer Block */}
          <div className="bg-editorial-sidebar-bg border-t border-editorial-border px-6 py-4 flex items-center justify-between text-[11px] font-mono text-editorial-muted">
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
