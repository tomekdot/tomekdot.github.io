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
  compact?: boolean;
  key?: string;
}

const RepoCard = React.memo(function RepoCard({ repo, onSelect, lang, compact }: RepoCardProps) {
  const primaryCatKey = repo.cat[0] || 'other';
  const catSpec = CATEGORIES[primaryCatKey] || CATEGORIES.other;
  const catLabel = lang === 'en' ? (catSpec.shortLabelEn || catSpec.labelEn) : (catSpec.shortLabelPl || catSpec.labelPl);
  const displayLang = repo.lang && repo.lang.trim() !== '' ? repo.lang : 'Shell/Other';
  const langColor = LANG_COLORS[repo.lang] || LANG_COLORS[displayLang] || '#89e051';

  if (compact) {
    return (
      <motion.div
        id={`repo_card_${repo.name}`}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
        transition={{ duration: 0.15 }}
        onClick={() => onSelect(repo)}
        className="group relative border border-editorial-border p-3 sm:p-3.5 cursor-pointer flex flex-col gap-2.5 bg-editorial-sidebar-bg hover:border-editorial-accent/60 transition-all rounded-none"
      >
        {/* Title row: name + badges */}
        <div className="flex items-start gap-2.5 min-w-0 w-full">
          <FolderGit2 size={16} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold font-mono text-white group-hover:text-editorial-accent transition-colors truncate" translate="no">
                {repo.name}
              </span>
              {repo.isPrivate && (
                <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-1 py-0.5 text-[8.5px] font-mono uppercase font-bold shrink-0 whitespace-nowrap">
                  <Lock size={8} />
                  {lang === 'en' ? 'Private' : 'Prywatne'}
                </span>
              )}
              {repo.isFork && (
                <span className="inline-flex items-center gap-1 bg-[#1A1028] text-purple-300 border border-purple-500/40 px-1.5 py-0.5 text-[8.5px] font-mono uppercase font-bold shrink-0 whitespace-nowrap">
                  <GitFork size={8} className="text-purple-400 shrink-0" />
                  <span>
                    {repo.isContributed
                      ? (lang === 'en' ? 'Contributed Fork' : 'Wkład własny (Fork)')
                      : (repo.forkParent ? `forked from ${repo.forkParent}` : 'Fork')}
                  </span>
                </span>
              )}
            </div>
            {repo.desc && (
              <p className="text-editorial-muted text-xs font-sans line-clamp-1 mt-0.5">
                {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
              </p>
            )}
          </div>
        </div>

        {/* Wiersz metadanych pod nazwą: flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0 w-full */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0 w-full font-mono text-xs text-editorial-muted pt-2 border-t border-editorial-border/30">
          <span className="max-w-full truncate shrink min-w-0 text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-accent font-bold tracking-wider">
            {catLabel.toUpperCase()}
          </span>
          {repo.createdYear && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-zinc-400 border border-editorial-border/60 px-1.5 py-0.5 font-bold" title={lang === 'en' ? 'Created year' : 'Rok utworzenia'}>
              <Calendar size={10} className="text-sky-400 shrink-0" />
              <span>{repo.createdYear}</span>
            </span>
          )}
          <span className="shrink-0 inline-flex items-center gap-1.5 border border-editorial-border/60 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
            <span className="text-zinc-300" translate="no">
              {displayLang === 'Shell/Other' ? (lang === 'en' ? 'SHELL / OTHER' : 'SHELL / INNE') : displayLang.toUpperCase()}
            </span>
          </span>
          {!repo.isPrivate && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-mono uppercase font-bold" title="Stars">
              <Star size={10} className="text-amber-500 fill-amber-500/20" />
              <span>{repo.stars}</span>
            </span>
          )}
          <button
            type="button"
            className="shrink-0 ml-auto text-editorial-accent group-hover:brightness-110 flex items-center gap-1 text-[10.5px] uppercase font-bold tracking-wider font-mono"
          >
            {lang === 'en' ? 'Details →' : 'Szczegóły →'}
          </button>
        </div>
      </motion.div>
    );
  }

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
      className="group relative border border-editorial-border bg-editorial-sidebar-bg hover:border-editorial-accent/60 p-4 sm:p-5 md:p-6 cursor-pointer flex flex-col justify-between h-full transition-all rounded-none overflow-hidden"
    >
      <div>
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
          {repo.isFork && (
            <span className="inline-flex items-center gap-1 bg-[#1A1028] text-purple-300 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap shadow-[0_0_8px_rgba(168,85,247,0.15)]">
              <GitFork size={9} className="text-purple-400 shrink-0" />
              <span>
                {repo.isContributed
                  ? (lang === 'en' ? 'Contributed Fork' : 'Wkład własny (Fork)')
                  : (repo.forkParent ? `forked from ${repo.forkParent}` : 'Fork')}
              </span>
            </span>
          )}
        </h3>

        {/* Description */}
        <p className="text-editorial-muted text-sm leading-relaxed mb-4 max-w-2xl font-sans line-clamp-2">
          {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
        </p>
      </div>

      {/* Wiersz metadanych pod nazwą: flex flex-wrap items-center gap-x-2 gap-y-1.5 min-w-0 w-full */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-2.5 border-t border-editorial-border/30 font-mono text-xs text-editorial-muted w-full min-w-0">
        <span className="max-w-full truncate shrink min-w-0 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-accent font-bold">
          {catLabel.toUpperCase()}
        </span>
        {repo.createdYear && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-zinc-400 border border-editorial-border/60 px-1.5 py-0.5 font-bold" title={lang === 'en' ? 'Created year' : 'Rok utworzenia'}>
            <Calendar size={10} className="text-sky-400 shrink-0" />
            <span>{repo.createdYear}</span>
          </span>
        )}
        <span className="shrink-0 inline-flex items-center gap-1.5 border border-editorial-border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono uppercase tracking-wider font-bold">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
          <span translate="no" className="text-zinc-300 notranslate font-mono uppercase">
            {displayLang === 'Shell/Other' ? (lang === 'en' ? 'SHELL / OTHER' : 'SHELL / INNE') : displayLang.toUpperCase()}
          </span>
        </span>
        {!repo.isPrivate && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px]" title="Stars">
            <Star size={10} className="text-amber-500 fill-amber-500/20" />
            <span>{repo.stars}</span>
          </span>
        )}
        <button
          type="button"
          id={`view_details_${repo.name}`}
          className="shrink-0 ml-auto text-editorial-accent group-hover:brightness-110 hover:text-white transition-all flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest"
        >
          {lang === 'en' ? 'DETAILS →' : 'SZCZEGÓŁY →'}
        </button>
      </div>
    </motion.div>
  );
});

export default RepoCard;
