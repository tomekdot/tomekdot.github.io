/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { FolderGit2, Star, GitFork, ChevronRight, Calendar, Lock } from 'lucide-react';
import { Repository } from '../types';
import { CATEGORIES, LANG_COLORS } from '../data';

interface RepoCardProps {
  repo: Repository;
  onSelect: (repo: Repository) => void;
  lang: 'en' | 'pl';
  key?: string;
}

export default function RepoCard({ repo, onSelect, lang }: RepoCardProps) {
  const primaryCatKey = repo.cat[0] || 'other';
  const catSpec = CATEGORIES[primaryCatKey] || CATEGORIES.other;
  const langColor = LANG_COLORS[repo.lang] || '#8b949e';

  return (
    <motion.div
      id={`repo_card_${repo.name}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(repo)}
      className="group relative border-b border-editorial-border p-6 cursor-pointer flex flex-col justify-between transition-all bg-transparent"
    >
      <div>
        {/* Card Header stats & Icon */}
        <div className="flex items-center justify-between mb-3 text-editorial-muted font-mono text-[10px] uppercase tracking-wider">
          <span className="font-semibold text-editorial-accent">
            {lang === 'en' ? catSpec.labelEn : catSpec.labelPl}
          </span>
          <div className="flex items-center gap-3">
            {!repo.isPrivate && (
              <span className="flex items-center gap-1" title="Stars">
                <Star size={11} className="text-amber-500 fill-amber-500/20" />
                <span>{repo.stars}</span>
              </span>
            )}
          </div>
        </div>

        {/* Title: Monospace */}
        <h3 className="text-base sm:text-lg font-bold font-mono text-white mb-2 group-hover:text-editorial-accent group-hover:translate-x-0.5 transition-all flex flex-wrap items-center gap-2 break-all">
          <FolderGit2 size={16} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0" />
          <span translate="no" className="notranslate">{repo.name}</span>
          {repo.isPrivate && (
            <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
              <Lock size={9} />
              {lang === 'en' ? 'Private' : 'Prywatne'}
            </span>
          )}
        </h3>

        {/* Description */}
        <p className="text-editorial-muted text-sm leading-relaxed mb-4 max-w-2xl font-sans line-clamp-2">
          {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
        </p>
      </div>

      {/* Footer stats & actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-editorial-border/30 font-mono text-xs text-editorial-muted">
        <div className="flex items-center gap-4 flex-wrap">
          {repo.lang && (
            <span className="flex items-center gap-1.5 border border-editorial-border px-2 py-0.5 rounded text-[10px] font-medium tracking-wide shrink-0">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
              <span translate="no" className="text-zinc-300 notranslate">{repo.lang}</span>
            </span>
          )}
          {repo.pushedAt && (
            <span className="flex items-center gap-1 text-[10px] text-editorial-muted shrink-0" title={lang === 'en' ? 'Last pushed' : 'Ostatnia zmiana'}>
              <Calendar size={11} className="text-neutral-500 shrink-0" />
              <span>{new Date(repo.pushedAt).toISOString().split('T')[0]}</span>
            </span>
          )}
        </div>

        <button
          type="button"
          id={`view_details_${repo.name}`}
          className="text-editorial-accent group-hover:brightness-110 transition-all flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest shrink-0 self-start sm:self-auto"
        >
          {lang === 'en' ? 'Review Details →' : 'Zobacz szczegóły →'}
        </button>
      </div>
    </motion.div>
  );
}
