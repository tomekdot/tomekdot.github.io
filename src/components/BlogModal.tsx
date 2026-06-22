/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Clock, Tag, BookOpen } from 'lucide-react';
import Markdown from 'react-markdown';
import { BlogPost } from '../types';

interface BlogModalProps {
  post: BlogPost | null;
  onClose: () => void;
  lang: 'en' | 'pl';
}

export default function BlogModal({ post, onClose, lang }: BlogModalProps) {
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
  const readingTime = lang === 'en' ? post.readingTimeEn : post.readingTimePl;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          id="blog_modal_backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window Container */}
        <motion.div
          id="blog_modal_window"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-editorial-bg border-2 border-editorial-border w-full max-w-2xl rounded-none shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        >
          {/* Header Block */}
          <div className="bg-editorial-sidebar-bg border-b border-editorial-border px-6 py-5 flex items-start justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2 font-mono text-[10px] text-editorial-muted uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Calendar size={11} className="text-editorial-accent" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} className="text-editorial-accent" />
                  {readingTime}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold font-mono text-white break-words pr-4 uppercase tracking-wider">
                {title}
              </h2>
            </div>

            <button
              type="button"
              id="close_blog_modal_btn"
              onClick={onClose}
              className="text-editorial-muted hover:text-white hover:bg-neutral-900 p-2 rounded-none transition-all border border-editorial-border cursor-pointer flex-shrink-0"
              title={lang === 'en' ? 'Close description' : 'Zamknij opis'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Blog Content Block */}
          <div className="flex-grow overflow-y-auto p-6 md:p-8 bg-editorial-bg select-text">
            {/* Tags line */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-editorial-border bg-neutral-900/60 font-mono text-[10px] uppercase text-editorial-muted"
                >
                  <Tag size={9} className="text-editorial-accent" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Main Article Body */}
            <div className="markdown-body text-editorial-text font-serif text-sm leading-relaxed prose prose-invert max-w-none space-y-4">
              <Markdown
                components={{
                  h3: ({ node, ...props }) => (
                    <h3 className="text-lg font-bold font-mono text-white uppercase tracking-wider border-b border-editorial-border pb-1.5 mt-6 mb-3" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-sm font-bold font-mono text-editorial-accent uppercase tracking-wide mt-4 mb-2" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="font-sans text-editorial-text/90 leading-relaxed text-sm mb-4" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc pl-5 space-y-1.5 font-sans text-sm mb-4" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal pl-5 space-y-1.5 font-sans text-sm mb-4" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="font-sans text-sm leading-relaxed" {...props} />
                  ),
                  a: ({ node, ...props }) => (
                    <a className="text-editorial-accent underline hover:text-white font-mono break-all" target="_blank" rel="noopener noreferrer" {...props} />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre className="p-4 bg-neutral-900 border border-editorial-border font-mono text-xs overflow-x-auto text-[#e6edf3] my-4 rounded-none" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="px-1.5 py-0.5 bg-neutral-950 font-mono text-xs text-rose-400 border border-editorial-border/40" {...props} />
                  ),
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
            <span>© 2026</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
