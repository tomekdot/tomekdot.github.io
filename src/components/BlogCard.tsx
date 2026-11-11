/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Newspaper, Calendar, Clock, Tag } from 'lucide-react';
import { BlogPost } from '../types';
import { calculateReadingTime } from '../data';

interface BlogCardProps {
  post: BlogPost;
  onSelect: (post: BlogPost) => void;
  lang: 'en' | 'pl';
  compact?: boolean;
  onSelectTag?: (tag: string) => void;
}

const BlogCard = React.memo(function BlogCard({
  post,
  onSelect,
  lang,
  compact,
  onSelectTag
}: BlogCardProps) {
  const title = lang === 'en' ? post.titleEn : post.titlePl;
  const excerpt = lang === 'en' ? post.excerptEn : post.excerptPl;
  const content = lang === 'en' ? post.contentEn : post.contentPl;
  const explicitReadingTime = lang === 'en' ? post.readingTimeEn : post.readingTimePl;
  const readingTime = explicitReadingTime || calculateReadingTime(content, lang);
  const primaryTag = post.tags[0] || 'JOURNAL';

  if (compact) {
    return (
      <motion.div
        id={`blog_card_${post.id}`}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        whileTap={{ scale: 0.99 }}
        transition={{ duration: 0.15 }}
        onClick={() => onSelect(post)}
        className="group relative border border-editorial-border p-2.5 sm:p-3.5 cursor-pointer flex flex-col gap-2 bg-editorial-sidebar-bg hover:border-editorial-accent/60 transition-colors duration-150 rounded-none"
      >
        {/* Title row */}
        <div className="flex items-start gap-2.5 min-w-0 w-full">
          <Newspaper size={16} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 min-w-0">
              <span className="text-xs sm:text-sm font-bold font-mono text-white group-hover:text-editorial-accent transition-colors min-w-0 flex-1 truncate">
                {title}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[9px] text-editorial-muted border border-editorial-border/60 px-1.5 py-0.2 bg-neutral-950 font-semibold shrink-0 whitespace-nowrap">
                <Calendar size={9} className="text-sky-400 shrink-0" />
                {post.date}
              </span>
            </div>
            {excerpt && (
              <p className="text-editorial-muted text-xs font-sans line-clamp-1 mt-0.5">
                {excerpt}
              </p>
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0 w-full font-mono text-xs text-editorial-muted pt-2 border-t border-editorial-border/30">
          <span className="max-w-full truncate shrink min-w-0 text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-accent font-semibold">
            #{primaryTag.toUpperCase()}
          </span>

          <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[10px] text-zinc-300 border border-editorial-border/60 px-1.5 py-0.5">
            <Clock size={10} className="text-editorial-accent shrink-0" />
            <span>{readingTime}</span>
          </span>

          {post.tags.slice(1, 3).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTag?.(tag);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono uppercase px-1.5 py-0.5 border border-editorial-border bg-neutral-950 text-zinc-400 hover:text-editorial-accent hover:border-editorial-accent transition-colors cursor-pointer shrink-0"
            >
              #{tag.toUpperCase()}
            </button>
          ))}

          <button
            type="button"
            className="shrink-0 ml-auto text-editorial-accent group-hover:brightness-110 flex items-center gap-1 text-[10.5px] uppercase font-bold tracking-wider"
          >
            {lang === 'en' ? 'Read →' : 'Czytaj →'}
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      id={`blog_card_${post.id}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(post)}
      className="group relative border border-editorial-border bg-editorial-sidebar-bg hover:border-editorial-accent/60 p-3.5 sm:p-4.5 md:p-5 cursor-pointer flex flex-col justify-between h-full transition-colors duration-150 rounded-none overflow-hidden"
    >
      <div>
        {/* Top header stats */}
        <div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-2.5 text-editorial-muted font-mono text-[9px] sm:text-[9.5px] uppercase tracking-wider min-w-0">
          <span className="font-semibold text-editorial-accent bg-neutral-900 border border-editorial-border/70 px-1.5 py-0.5 shrink-0 whitespace-nowrap">
            #{primaryTag.toUpperCase()}
          </span>
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto whitespace-nowrap">
            <span className="hidden md:inline-flex items-center gap-1 text-zinc-400">
              <Calendar size={10} className="text-neutral-500 shrink-0" />
              <span>{post.date}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-zinc-400">
              <Clock size={10} className="text-editorial-accent shrink-0" />
              <span>{readingTime}</span>
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base md:text-lg font-bold font-mono text-white mb-1.5 sm:mb-2 group-hover:text-editorial-accent group-hover:translate-x-0.5 transition-all flex flex-wrap items-center gap-2 break-words">
          <Newspaper size={15} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0" />
          <span>{title}</span>
        </h3>

        {/* Description */}
        <p className="text-editorial-muted text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4 max-w-2xl font-sans line-clamp-2 sm:line-clamp-3">
          {excerpt}
        </p>
      </div>

      {/* Metadata & Tag Badges Footer */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-2 sm:pt-2.5 border-t border-editorial-border/30 font-mono text-xs text-editorial-muted w-full min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.tags.slice(0, 3).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTag?.(tag);
              }}
              className="inline-flex items-center gap-1 border border-editorial-border px-1.5 py-0.5 text-[9px] sm:text-[9.5px] font-medium tracking-wide text-zinc-300 hover:border-editorial-accent hover:text-white transition-colors cursor-pointer uppercase shrink-0"
            >
              <Tag size={8} className="text-editorial-accent shrink-0" />
              <span>#{tag.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          id={`view_blog_${post.id}`}
          className="shrink-0 ml-auto text-editorial-accent group-hover:brightness-110 hover:text-white transition-all flex items-center gap-1 text-[10.5px] sm:text-[11px] font-mono uppercase tracking-widest cursor-pointer"
        >
          {lang === 'en' ? 'READ JOURNAL →' : 'CZYTAJ WPIS →'}
        </button>
      </div>
    </motion.div>
  );
});

export default BlogCard;
