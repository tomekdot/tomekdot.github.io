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

export default function RepoCard({ repo, onSelect, lang, compact }: RepoCardProps) {
  const primaryCatKey = repo.cat[0] || 'other';
  const catSpec = CATEGORIES[primaryCatKey] || CATEGORIES.other;
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
        className="group relative border border-editorial-border p-3 sm:p-3.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 bg-editorial-sidebar-bg hover:border-editorial-accent/60 transition-all rounded-none"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <FolderGit2 size={16} className="text-editorial-muted group-hover:text-editorial-accent transition-colors shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold font-mono text-white group-hover:text-editorial-accent transition-colors truncate" translate="no">
                {repo.name}
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-neutral-900 border border-editorial-border text-editorial-accent font-semibold shrink-0">
                {lang === 'en' ? catSpec.labelEn : catSpec.labelPl}
              </span>
              {repo.isPrivate && (
                <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-1 py-0.5 text-[8.5px] font-mono uppercase font-bold shrink-0">
                  <Lock size={8} />
                  {lang === 'en' ? 'Private' : 'Prywatne'}
                </span>
              )}
              {repo.isFork && (
                <span className="inline-flex items-center gap-1 bg-[#1A1028] text-purple-300 border border-purple-500/40 px-1.5 py-0.5 text-[8.5px] font-mono uppercase font-bold shrink-0">
                  <GitFork size={8} className="text-purple-400 shrink-0" />
                  <span>
                    {repo.isContributed
                      ? (lang === 'en' ? 'Contributed Fork' : 'Wkład własny (Fork)')
                      : (repo.forkParent ? `forked from ${repo.forkParent}` : 'Fork')}
                  </span>
                </span>
              )}
            </div>
            <p className="text-editorial-muted text-xs font-sans line-clamp-1 mt-0.5">
              {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-editorial-muted">
          {repo.createdYear && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-400 border border-editorial-border/60 px-1.5 py-0.5" title={lang === 'en' ? 'Created year' : 'Rok utworzenia'}>
              <Calendar size={10} className="text-sky-400 shrink-0" />
              <span>{repo.createdYear}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 border border-editorial-border/60 px-2 py-0.5 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
            <span className="text-zinc-300" translate="no">
              {displayLang === 'Shell/Other' ? (lang === 'en' ? 'Shell/Other' : 'Shell/Inne') : displayLang}
            </span>
          </span>
          {!repo.isPrivate && (
            <span className="flex items-center gap-1 text-[10px]" title="Stars">
              <Star size={10} className="text-amber-500 fill-amber-500/20" />
              <span>{repo.stars}</span>
            </span>
          )}
          <button
            type="button"
            className="text-editorial-accent group-hover:brightness-110 flex items-center gap-1 text-[10.5px] uppercase font-bold tracking-wider"
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
      className="group relative border border-editorial-border bg-editorial-sidebar-bg hover:border-editorial-accent/60 p-5 sm:p-6 cursor-pointer flex flex-col justify-between h-full transition-all rounded-none"
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

      {/* Footer stats & actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-editorial-border/30 font-mono text-xs text-editorial-muted">
        <div className="flex items-center gap-4 flex-wrap">
          {repo.createdYear && (
            <span className="flex items-center gap-1.5 border border-sky-500/30 bg-sky-950/20 px-2 py-0.5 rounded text-[10px] font-mono text-sky-300 font-medium tracking-wide shrink-0" title={lang === 'en' ? 'Created year' : 'Rok utworzenia'}>
              <Calendar size={11} className="text-sky-400 shrink-0" />
              <span>{lang === 'en' ? 'Created ' : 'Utworzono '}{repo.createdYear}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5 border border-editorial-border px-2 py-0.5 rounded text-[10px] font-medium tracking-wide shrink-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: langColor }} />
            <span translate="no" className="text-zinc-300 notranslate">
              {displayLang === 'Shell/Other' ? (lang === 'en' ? 'Shell/Other' : 'Shell/Inne') : displayLang}
            </span>
          </span>
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
