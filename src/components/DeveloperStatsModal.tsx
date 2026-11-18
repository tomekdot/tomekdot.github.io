/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Zap,
  TrendingUp,
  Sparkles,
  GitCommit,
  Star,
  GitFork,
  Calendar,
  Clock,
  ArrowUpRight,
  Gamepad2,
  Globe,
  Bot,
  Wrench,
  Activity,
  Layers,
  Code2,
  ExternalLink,
  ChevronRight,
  Shield,
  FolderGit2,
  Lock,
  FileText,
  BookOpen,
  Cpu,
  GitCompare,
  History,
  Tag,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { Repository, CategoryKey, BlogPost } from '../types';
import { CATEGORIES, LANG_COLORS } from '../data';
import { formatStarsCount, formatForksCount, pluralizePolish } from '../lib/pluralize';
import { safeDateYmd, safeTimeMs, safeRepoYear } from '../lib/repoUtils';

interface DeveloperStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repos: Repository[];
  lang: 'en' | 'pl';
  initialTab?: 'new_plugins' | 'recent_activity' | 'breakdown';
  onSelectRepo: (repo: Repository) => void;
}

export default function DeveloperStatsModal({
  isOpen,
  onClose,
  repos,
  lang,
  initialTab = 'new_plugins',
  onSelectRepo
}: DeveloperStatsModalProps) {
  const [activeTab, setActiveTab] = useState<'new_plugins' | 'recent_activity' | 'breakdown'>(initialTab);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [pluginsLimit, setPluginsLimit] = useState(20);
  const [activityLimit, setActivityLimit] = useState(20);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Reset scroll and pagination on tab/filter change or modal open
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    setPluginsLimit(20);
  }, [filterCategory, isOpen]);

  useEffect(() => {
    setActivityLimit(20);
  }, [activeTab, isOpen]);

  // Sync activeTab whenever modal opens with initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const safeRepos = useMemo(
    () =>
      (Array.isArray(repos) ? repos : []).map(r => ({
        ...r,
        cat: Array.isArray(r.cat) && r.cat.length > 0 ? r.cat : (['other'] as CategoryKey[]),
        desc: r.desc || '',
      })),
    [repos]
  );

  // General calculated metrics
  const metrics = useMemo(() => {
    const totalRepos = safeRepos.length;
    const pyplanetPlugins = safeRepos.filter(r => r.cat.includes('pyplanet')).length;
    const openplanetPlugins = safeRepos.filter(r => r.cat.includes('openplanet')).length;
    const trackmaniaTotal = safeRepos.filter(
      r => r.cat.includes('trackmania') || r.cat.includes('pyplanet') || r.cat.includes('openplanet')
    ).length;
    const aiAgents = safeRepos.filter(r => r.cat.includes('ai')).length;
    const devTools = safeRepos.filter(r => r.cat.includes('tools')).length;
    const totalCommits = safeRepos.reduce((acc, r) => acc + (r.commitsCount || 12), 0);
    const totalStars = safeRepos.reduce((acc, r) => acc + (r.stars || 0), 0);
    const forkedReposCount = safeRepos.filter(r => !!r.isFork).length;
    const totalForks = safeRepos.reduce((acc, r) => acc + (r.forks || 0), 0) + forkedReposCount;

    return {
      totalRepos,
      pyplanetPlugins,
      openplanetPlugins,
      totalPlugins: pyplanetPlugins + openplanetPlugins,
      trackmaniaTotal,
      aiAgents,
      devTools,
      totalCommits,
      totalStars,
      forkedReposCount,
      totalForks
    };
  }, [safeRepos]);

  // Newest plugins & projects
  const newestPlugins = useMemo(() => {
    return [...safeRepos]
      .filter(r => {
        if (filterCategory === 'all') return true;
        if (filterCategory === 'plugins') return r.cat.includes('pyplanet') || r.cat.includes('openplanet') || r.cat.includes('trackmania');
        if (filterCategory === 'ai') return r.cat.includes('ai');
        if (filterCategory === 'tools') return r.cat.includes('tools');
        if (filterCategory === 'forks') return !!r.isFork;
        return r.cat.includes(filterCategory as CategoryKey);
      })
      .sort((a, b) => {
        const yearA = safeRepoYear(a, 2024);
        const yearB = safeRepoYear(b, 2024);
        if (yearB !== yearA) return yearB - yearA;
        return safeTimeMs(b.pushedAt) - safeTimeMs(a.pushedAt);
      });
  }, [safeRepos, filterCategory]);

  // Recent changes / commits activity stream (Sorted chronologically by pushedAt)
  const recentChanges = useMemo(() => {
    return [...safeRepos]
      .filter(r => safeTimeMs(r.pushedAt) > 0)
      .sort((a, b) => safeTimeMs(b.pushedAt) - safeTimeMs(a.pushedAt));
  }, [safeRepos]);

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return lang === 'en' ? 'Archived snapshot' : 'Zapis archiwalny';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return lang === 'en' ? 'Archived snapshot' : 'Zapis archiwalny';
    }
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return lang === 'en' ? 'Today' : 'Dzisiaj';
    if (diffDays === 1) return lang === 'en' ? 'Yesterday' : 'Wczoraj';
    if (diffDays < 7) return lang === 'en' ? `${diffDays} days ago` : `${diffDays} dni temu`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return lang === 'en' ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago` : `${weeks} ${weeks === 1 ? 'tydzień' : 'tygodnie'} temu`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return lang === 'en' ? `${months} ${months === 1 ? 'month' : 'months'} ago` : `${months} ${months === 1 ? 'miesiąc' : 'miesięcy'} temu`;
    }
    return safeDateYmd(isoDate) || (lang === 'en' ? 'Archived' : 'Archiwalny');
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="developer_stats_modal_wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="modal-portal-viewport z-50 flex items-center justify-center p-0 desk:p-4 md:desk:p-6 overflow-hidden overscroll-contain"
        >
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-black/80 touch-none overscroll-none"
          />

          {/* Modal Window Container: Fullscreen on portrait & rotated landscape mobile, centered window on desk+ */}
          <motion.div
            key="developer_stats_modal"
            id="developer_stats_modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="relative z-10 bg-editorial-bg border-0 desk:border-2 desk:border-editorial-border w-full h-full max-h-[100dvh] desk:w-[92vw] md:desk:w-[88vw] desk:max-w-4xl desk:h-[88dvh] desk:max-h-[min(780px,calc(100dvh-2rem))] rounded-none shadow-2xl flex flex-col overflow-hidden desk:my-auto min-w-0 font-mono text-xs select-text"
          >
          {/* 1. Modal Top Header */}
          <div className="shrink-0 px-3.5 sm:px-6 py-2.5 land:py-1.5 desk:py-3.5 border-b border-editorial-border bg-editorial-sidebar-bg flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="p-1.5 land:p-1 desk:p-2 bg-[#1D170E] border border-editorial-accent/50 text-editorial-accent shrink-0">
                <Activity size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-white font-mono font-bold text-xs sm:text-sm desk:text-lg uppercase tracking-wider truncate">
                    <span className="sm:hidden">{lang === 'en' ? 'DEV STATS & LOGS' : 'STATYSTYKI I LOGI'}</span>
                    <span className="hidden sm:inline">{lang === 'en' ? 'Developer Stats & Changelog' : 'Statystyki Twórcy & Dziennik'}</span>
                  </h2>
                  <span className="hidden sm:inline text-[10px] font-mono font-bold text-editorial-accent shrink-0">
                    · @tomekdot
                  </span>
                </div>
                <p className="text-[11px] font-mono text-editorial-muted hidden desk:block truncate">
                  {lang === 'en'
                    ? 'Trackmania Plugins, PyPlanet Controllers, AI Agents & Code Changelog'
                    : 'Wtyczki Trackmania, Kontrolery PyPlanet, Agenci AI i Historia Zmian'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="close_stats_modal_btn"
              onClick={onClose}
              className="w-9 h-9 land:w-8 land:h-8 text-rose-400 hover:text-white hover:bg-rose-950/40 rounded-none transition-all border border-rose-500/50 shrink-0 cursor-pointer flex items-center justify-center shadow-sm touch-manipulation"
              title={lang === 'en' ? 'Close (Esc)' : 'Zamknij (Esc)'}
              aria-label={lang === 'en' ? 'Close modal' : 'Zamknij okno'}
            >
              <X size={16} />
            </button>
          </div>

          {/* 2. Navigation Tabs - Fixed 3-column grid */}
          <div className="shrink-0 grid grid-cols-3 border-b border-editorial-border font-mono bg-editorial-bg">
            <button
              type="button"
              id="stats_tab_new_plugins"
              title={lang === 'en' ? 'NEW PLUGINS & RELEASES' : 'NOWE PLUGINY I WYDANIA'}
              onClick={() => setActiveTab('new_plugins')}
              className={`min-w-0 h-11 land:h-9 desk:h-10 xl:h-12 px-1.5 xl:px-4 flex items-center justify-center gap-1.5 border-b-2 text-[10.5px] xl:text-xs font-bold uppercase transition-all cursor-pointer touch-manipulation ${
                activeTab === 'new_plugins'
                  ? 'border-editorial-accent text-editorial-accent bg-editorial-accent/10'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Sparkles size={13} className="shrink-0" />
              <span className="truncate 2xl:hidden">{lang === 'en' ? 'PLUGINS' : 'PLUGINY'}</span>
              <span className="hidden 2xl:inline truncate">{lang === 'en' ? 'NEW PLUGINS & RELEASES' : 'NOWE PLUGINY I WYDANIA'}</span>
            </button>

            <button
              type="button"
              id="stats_tab_recent_activity"
              title={lang === 'en' ? 'RECENT CHANGES & ACTIVITY' : 'OSTATNIE ZMIANY I HISTORIA'}
              onClick={() => setActiveTab('recent_activity')}
              className={`min-w-0 h-11 land:h-9 desk:h-10 xl:h-12 px-1.5 xl:px-4 flex items-center justify-center gap-1.5 border-b-2 text-[10.5px] xl:text-xs font-bold uppercase transition-all cursor-pointer touch-manipulation ${
                activeTab === 'recent_activity'
                  ? 'border-editorial-accent text-editorial-accent bg-editorial-accent/10'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Zap size={13} className="shrink-0" />
              <span className="truncate 2xl:hidden">{lang === 'en' ? 'CHANGES' : 'ZMIANY'}</span>
              <span className="hidden 2xl:inline truncate">{lang === 'en' ? 'RECENT CHANGES & ACTIVITY' : 'OSTATNIE ZMIANY I HISTORIA'}</span>
            </button>

            <button
              type="button"
              id="stats_tab_breakdown"
              title={lang === 'en' ? 'TECH & CATEGORY MATRIX' : 'MATRYCA KATEGORII I TECHNOLOGII'}
              onClick={() => setActiveTab('breakdown')}
              className={`min-w-0 h-11 land:h-9 desk:h-10 xl:h-12 px-1.5 xl:px-4 flex items-center justify-center gap-1.5 border-b-2 text-[10.5px] xl:text-xs font-bold uppercase transition-all cursor-pointer touch-manipulation ${
                activeTab === 'breakdown'
                  ? 'border-editorial-accent text-editorial-accent bg-editorial-accent/10'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Layers size={13} className="shrink-0" />
              <span className="truncate 2xl:hidden">{lang === 'en' ? 'MATRIX' : 'MATRYCA'}</span>
              <span className="hidden 2xl:inline truncate">{lang === 'en' ? 'TECH & CATEGORY MATRIX' : 'MATRYCA KATEGORII'}</span>
            </button>
          </div>

          {/* 4. Tab Body Content */}
          <div 
            ref={modalBodyRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden modal-scroll-safe p-3 sm:p-5 land:p-2.5 space-y-3 land:space-y-2 bg-editorial-bg min-w-0 w-full scrollbar-thin scrollbar-thumb-neutral-800"
          >
            {activeTab === 'new_plugins' && (
              <div className="space-y-3 sm:space-y-4 land:space-y-2">
                {/* Single-row horizontal filter rail on mobile portrait; wrapped with Filter label on sm+ */}
                <div className="flex items-center justify-between gap-2 pb-2.5 land:pb-1.5 border-b border-editorial-border/60 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-editorial-muted flex-1 min-w-0">
                    <span className="text-[11px] hidden sm:inline shrink-0">{lang === 'en' ? 'Filter:' : 'Filtruj:'}</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap pb-0.5 sm:pb-0 scrollbar-none w-full min-w-0">
                      <button
                        type="button"
                        onClick={() => setFilterCategory('all')}
                        className={`min-h-[38px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 land:py-0.5 text-[10.5px] font-mono uppercase cursor-pointer border whitespace-nowrap shrink-0 touch-manipulation ${
                          filterCategory === 'all' ? 'border-editorial-accent text-editorial-accent bg-neutral-900 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        {lang === 'en' ? 'All' : 'Wszystkie'} ({safeRepos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory('plugins')}
                        className={`min-h-[38px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 land:py-0.5 text-[10.5px] font-mono uppercase cursor-pointer border whitespace-nowrap shrink-0 flex items-center gap-1.5 touch-manipulation ${
                          filterCategory === 'plugins' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        <Gamepad2 size={12} className="text-emerald-400 shrink-0" />
                        <span>{lang === 'en' ? 'Plugins' : 'Pluginy'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory('ai')}
                        className={`min-h-[38px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 land:py-0.5 text-[10.5px] font-mono uppercase cursor-pointer border whitespace-nowrap shrink-0 flex items-center gap-1.5 touch-manipulation ${
                          filterCategory === 'ai' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        <Bot size={12} className="text-cyan-400 shrink-0" />
                        <span>AI</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory('tools')}
                        className={`min-h-[38px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 land:py-0.5 text-[10.5px] font-mono uppercase cursor-pointer border whitespace-nowrap shrink-0 flex items-center gap-1.5 touch-manipulation ${
                          filterCategory === 'tools' ? 'border-orange-500 text-orange-400 bg-orange-950/30 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        <Wrench size={12} className="text-orange-400 shrink-0" />
                        <span>{lang === 'en' ? 'Tools' : 'Narzędzia'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory(filterCategory === 'forks' ? 'all' : 'forks')}
                        className={`min-h-[38px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 land:py-0.5 text-[10.5px] font-mono uppercase cursor-pointer border whitespace-nowrap shrink-0 flex items-center gap-1.5 touch-manipulation ${
                          filterCategory === 'forks' ? 'border-purple-500 text-purple-400 bg-purple-950/40 font-bold' : 'border-editorial-border text-editorial-muted hover:text-purple-300'
                        }`}
                      >
                        <GitFork size={11} className="text-purple-400 shrink-0" />
                        <span>{lang === 'en' ? 'Forked' : 'Forki'}</span>
                        {metrics.forkedReposCount > 0 && (
                          <span className="text-[10px] text-purple-300 font-bold">
                            ({metrics.forkedReposCount})
                          </span>
                        )}
                      </button>

                      {filterCategory !== 'all' && filterCategory !== 'plugins' && filterCategory !== 'ai' && filterCategory !== 'tools' && filterCategory !== 'forks' && (
                        <button
                          type="button"
                          onClick={() => setFilterCategory('all')}
                          className="min-h-[38px] sm:min-h-0 px-3 sm:px-2.5 py-1.5 sm:py-1 land:py-0.5 text-[10.5px] font-mono uppercase cursor-pointer border border-editorial-accent text-editorial-accent bg-[#1D170E] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 touch-manipulation"
                          title={lang === 'en' ? 'Clear category filter' : 'Wyczyść filtr kategorii'}
                        >
                          <span>
                            {CATEGORIES[filterCategory as CategoryKey]
                              ? (lang === 'en' ? CATEGORIES[filterCategory as CategoryKey].labelEn : CATEGORIES[filterCategory as CategoryKey].labelPl)
                              : filterCategory}
                          </span>
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  <span className="hidden sm:inline text-[10px] font-mono text-editorial-muted shrink-0">
                    {newestPlugins.length} {lang === 'en' ? 'projects' : 'projektów'}
                  </span>
                </div>

                {/* Grid list with pagination so modal opens instantly */}
                <div className="space-y-2.5 sm:space-y-3 land:space-y-2">
                  {newestPlugins.slice(0, pluginsLimit).map((repo, index) => {
                    const seqNumber = String(index + 1).padStart(2, '0');
                    const isTrackmaniaPlugin = repo.cat.includes('pyplanet') || repo.cat.includes('openplanet') || repo.cat.includes('trackmania');
                    const isAiAgent = repo.cat.includes('ai');

                    return (
                      <div
                        key={repo.name}
                        className="p-3 sm:p-4 land:p-2.5 bg-neutral-950/60 hover:bg-neutral-900/80 border border-editorial-border hover:border-editorial-accent/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 land:gap-2.5 group"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="hidden sm:flex w-9 h-9 shrink-0 items-center justify-center font-mono font-black text-xs bg-neutral-900 border border-editorial-border text-editorial-accent group-hover:border-editorial-accent">
                            #{seqNumber}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                              <h3
                                onClick={() => onSelectRepo(repo)}
                                className="font-mono font-bold text-white text-sm sm:text-base hover:text-editorial-accent transition-colors cursor-pointer flex items-center gap-1.5 min-w-0"
                              >
                                <span className="sm:hidden text-editorial-accent text-xs font-bold shrink-0">#{seqNumber}</span>
                                <span className="truncate">{repo.name}</span>
                                <ArrowUpRight size={13} className="text-editorial-muted group-hover:text-editorial-accent hidden sm:inline sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </h3>

                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
                                {repo.isPrivate && (
                                  <span className="inline-flex items-center gap-1 text-rose-400 font-bold uppercase">
                                    <Lock size={9} />
                                    <span>{lang === 'en' ? 'Private' : 'Prywatne'}</span>
                                  </span>
                                )}
                                {repo.isFork && (
                                  <span className="inline-flex items-center gap-1 text-purple-400 font-bold uppercase">
                                    <GitFork size={9} />
                                    <span>Fork</span>
                                  </span>
                                )}
                                {isTrackmaniaPlugin && (
                                  <span className="text-emerald-400 font-bold uppercase">
                                    {repo.cat.includes('pyplanet') ? 'PyPlanet' : repo.cat.includes('openplanet') ? 'Openplanet' : 'Trackmania'}
                                  </span>
                                )}
                                {isAiAgent && (
                                  <span className="text-cyan-400 font-bold uppercase">AI</span>
                                )}
                                {repo.createdYear && (
                                  <span className="text-zinc-500 font-semibold tabular-nums">
                                    {repo.createdYear}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-editorial-muted font-sans line-clamp-2 max-w-2xl leading-relaxed">
                              {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
                            </p>

                            <div className="flex items-center gap-x-2.5 gap-y-1 text-[10.5px] font-mono text-editorial-muted pt-0.5 flex-wrap tabular-nums">
                              {repo.lang && (
                                <span className="inline-flex items-center gap-1 text-zinc-300">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: LANG_COLORS[repo.lang] || '#8b949e' }} />
                                  <span>{repo.lang}</span>
                                </span>
                              )}
                              <span>
                                · {repo.commitsCount || 12} {lang === 'en' ? 'commits' : pluralizePolish(repo.commitsCount || 12, 'commit', 'commity', 'commitów')}
                              </span>
                              {repo.stars > 0 && (
                                <span className="text-amber-400 inline-flex items-center gap-1" title={formatStarsCount(repo.stars, lang)}>
                                  · <Star size={10} className="fill-amber-400/20 text-amber-400" />
                                  <span>{repo.stars}</span>
                                </span>
                              )}
                              {(repo.forks > 0 || repo.isFork) && (
                                <span className="text-purple-400 inline-flex items-center gap-1" title={repo.isFork ? (repo.forkParent ? `Forked from ${repo.forkParent}` : 'Forked repository') : 'Forks'}>
                                  · <GitFork size={10} />
                                  <span>{repo.forks > 0 ? formatForksCount(repo.forks, lang) : 'Fork'}</span>
                                </span>
                              )}
                              {repo.pushedAt && (
                                <span className="text-zinc-400 inline-flex items-center gap-1">
                                  · <Clock size={10} className="shrink-0" />
                                  <span>{formatRelativeTime(repo.pushedAt)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons: comfortable touch height on mobile */}
                        <div className="flex items-center gap-2 sm:gap-1.5 w-full sm:w-auto sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => onSelectRepo(repo)}
                            className="flex-1 sm:flex-initial h-9 sm:h-8 px-3 bg-editorial-sidebar-bg hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation"
                          >
                            <span>{lang === 'en' ? 'Inspect' : 'Szczegóły'}</span>
                            <ChevronRight size={13} />
                          </button>
                          {repo.url && (
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-9 w-9 sm:h-8 sm:w-8 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent hover:text-white text-editorial-muted transition-all flex items-center justify-center shrink-0 touch-manipulation"
                              title="GitHub"
                              aria-label={`Open ${repo.name} on GitHub`}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {newestPlugins.length > pluginsLimit && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setPluginsLimit(c => c + 25)}
                        className="h-10 sm:h-auto px-3.5 py-2 sm:py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors touch-manipulation"
                      >
                        {lang === 'en'
                          ? `Show more (${Math.min(25, newestPlugins.length - pluginsLimit)} of ${newestPlugins.length - pluginsLimit})`
                          : `Więcej (${Math.min(25, newestPlugins.length - pluginsLimit)} z ${newestPlugins.length - pluginsLimit})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPluginsLimit(newestPlugins.length)}
                        className="h-10 sm:h-auto px-3.5 py-2 sm:py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-editorial-border text-editorial-muted hover:text-white text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors touch-manipulation"
                      >
                        {lang === 'en' ? `All (${newestPlugins.length})` : `Wszystkie (${newestPlugins.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'recent_activity' && (
              <div className="space-y-3 sm:space-y-4 land:space-y-2">
                <div className="p-2.5 sm:p-3.5 land:p-2 bg-amber-950/15 border border-amber-800/40 text-amber-300/90 text-[11px] sm:text-xs font-mono flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap size={14} className="text-amber-400 shrink-0" />
                    <span className="truncate sm:whitespace-normal">
                      {lang === 'en'
                        ? 'Chronological pushes, updates & releases.'
                        : 'Chronologiczny dziennik ostatnich zmian i commitów.'}
                    </span>
                  </div>
                  <span className="text-[9.5px] uppercase font-bold text-amber-400 shrink-0">
                    LIVE LOG
                  </span>
                </div>

                {/* Timeline list with compact left gutter on mobile */}
                <div className="space-y-2.5 sm:space-y-3 land:space-y-2 relative before:absolute before:left-2.5 sm:before:left-4 before:top-3 before:bottom-3 before:w-px before:bg-editorial-border">
                  {recentChanges.slice(0, activityLimit).map((repo, index) => {
                    const seqNumber = String(index + 1).padStart(2, '0');
                    const pushedYmd = safeDateYmd(repo.pushedAt);
                    return (
                      <div
                        key={repo.name}
                        className="relative pl-7 sm:pl-10 group"
                      >
                        {/* Timeline marker node */}
                        <div className="absolute left-0 sm:left-1.5 top-3.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#0C0C0C] border-2 border-editorial-accent flex items-center justify-center text-[8.5px] sm:text-[9px] font-mono font-black text-editorial-accent tabular-nums">
                          {index + 1}
                        </div>

                        <div className="p-3 sm:p-4 land:p-2.5 bg-neutral-950/80 border border-editorial-border hover:border-editorial-accent/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-editorial-accent tabular-nums">
                                #{seqNumber}
                              </span>
                              <h4
                                onClick={() => onSelectRepo(repo)}
                                className="font-mono font-bold text-white text-sm sm:text-base hover:text-editorial-accent cursor-pointer transition-colors truncate"
                              >
                                {repo.name}
                              </h4>

                              {repo.isPrivate && (
                                <span className="inline-flex items-center gap-1 text-rose-400 text-[10px] font-mono uppercase font-bold shrink-0">
                                  <Lock size={9} />
                                  <span>{lang === 'en' ? 'Private' : 'Prywatne'}</span>
                                </span>
                              )}

                              {repo.isFork && (
                                <span className="inline-flex items-center gap-1 text-purple-400 text-[10px] font-mono uppercase font-bold shrink-0">
                                  <GitFork size={9} />
                                  <span>Fork</span>
                                </span>
                              )}

                              <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 shrink-0">
                                · {formatRelativeTime(repo.pushedAt)}
                              </span>
                            </div>

                            <p className="text-xs text-editorial-muted font-sans line-clamp-2 sm:line-clamp-1">
                              {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
                            </p>

                            <div className="flex items-center gap-x-2.5 gap-y-1 text-[10px] font-mono text-editorial-muted pt-0.5 flex-wrap tabular-nums">
                              {pushedYmd && (
                                <span className="text-zinc-400 inline-flex items-center gap-1">
                                  <Calendar size={10} />
                                  <span>{pushedYmd}</span>
                                </span>
                              )}
                              <span>· {repo.lang || 'Code'}</span>
                              <span className="text-editorial-accent">
                                · {repo.commitsCount || 12} {lang === 'en' ? 'commits' : pluralizePolish(repo.commitsCount || 12, 'commit', 'commity', 'commitów')}
                              </span>
                              {repo.stars > 0 && (
                                <span className="text-amber-400 inline-flex items-center gap-1" title={formatStarsCount(repo.stars, lang)}>
                                  · <Star size={10} className="fill-amber-400/20 text-amber-400" />
                                  <span>{repo.stars}</span>
                                </span>
                              )}
                              {(repo.forks > 0 || repo.isFork) && (
                                <span className="text-purple-400 inline-flex items-center gap-1" title={repo.isFork ? (repo.forkParent ? `Forked from ${repo.forkParent}` : 'Forked repository') : 'Forks'}>
                                  · <GitFork size={10} />
                                  <span>{repo.forks > 0 ? formatForksCount(repo.forks, lang) : 'Fork'}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-1.5 shrink-0 w-full sm:w-auto sm:self-center">
                            <button
                              type="button"
                              onClick={() => onSelectRepo(repo)}
                              className="flex-1 sm:flex-initial h-9 sm:h-8 px-3 bg-editorial-sidebar-bg hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 touch-manipulation"
                            >
                              <span>{lang === 'en' ? 'Inspect' : 'Szczegóły'}</span>
                              <ChevronRight size={13} />
                            </button>
                            {repo.url && (
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="h-9 w-9 sm:h-8 sm:w-8 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent hover:text-white text-editorial-muted transition-all flex items-center justify-center shrink-0 touch-manipulation"
                                title="GitHub"
                                aria-label={`Open ${repo.name} on GitHub`}
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {recentChanges.length > activityLimit && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 pl-7 sm:pl-10">
                      <button
                        type="button"
                        onClick={() => setActivityLimit(c => c + 25)}
                        className="h-10 sm:h-auto px-3.5 py-2 sm:py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors touch-manipulation"
                      >
                        {lang === 'en'
                          ? `Show more (${Math.min(25, recentChanges.length - activityLimit)} of ${recentChanges.length - activityLimit})`
                          : `Więcej (${Math.min(25, recentChanges.length - activityLimit)} z ${recentChanges.length - activityLimit})`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityLimit(recentChanges.length)}
                        className="h-10 sm:h-auto px-3.5 py-2 sm:py-1.5 bg-neutral-950 hover:bg-neutral-900 border border-editorial-border text-editorial-muted hover:text-white text-xs font-mono uppercase tracking-wider cursor-pointer transition-colors touch-manipulation"
                      >
                        {lang === 'en' ? `All (${recentChanges.length})` : `Wszystkie (${recentChanges.length})`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="space-y-4 land:space-y-2.5 min-w-0 max-w-full">
                {/* Category distribution grid with centered header */}
                <div className="min-w-0 max-w-full">
                  <div className="flex items-center justify-center gap-3 mb-3 land:mb-2">
                    <div className="h-px flex-1 bg-editorial-border" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-accent text-center shrink-0">
                      {lang === 'en' ? 'Category Ecosystem Distribution' : 'Podział Ekosystemu wg Kategorii'}
                    </h3>
                    <div className="h-px flex-1 bg-editorial-border" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 land:gap-2 min-w-0 font-mono">
                    {Object.values(CATEGORIES).map(cat => {
                      const count = safeRepos.filter(r => r.cat.includes(cat.key)).length;
                      const percentage = metrics.totalRepos > 0 ? Math.round((count / metrics.totalRepos) * 100) : 0;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            setActiveTab('new_plugins');
                            setFilterCategory(cat.key);
                          }}
                          className="p-3 sm:p-3.5 land:p-2.5 bg-neutral-950 hover:bg-neutral-900 border border-editorial-border hover:border-editorial-accent transition-all flex flex-col justify-between gap-2 land:gap-1.5 shadow-sm text-left cursor-pointer group min-w-0"
                          title={lang === 'en' ? `Filter repositories by ${cat.labelEn}` : `Filtruj repozytoria wg ${cat.labelPl}`}
                        >
                          <div className="flex items-center justify-between gap-2 w-full min-w-0">
                            <span className="text-xs font-bold text-white group-hover:text-editorial-accent transition-colors truncate min-w-0 flex-1 flex items-center gap-1.5">
                              <span className="truncate">{lang === 'en' ? cat.labelEn : cat.labelPl}</span>
                              <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 text-editorial-accent transition-opacity shrink-0" />
                            </span>
                            <span className={`text-xs font-bold ${cat.colorClass} shrink-0 px-1.5 py-0.2 bg-neutral-900 border border-editorial-border group-hover:border-editorial-accent/50`}>
                              {count}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-900 h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-editorial-accent transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-editorial-muted w-full">
                            <span>{percentage}% {lang === 'en' ? 'of repos' : 'projektów'}</span>
                            <span className="text-[8.5px] uppercase text-zinc-500 group-hover:text-editorial-accent transition-colors">
                              {count > 0 ? (lang === 'en' ? 'Inspect →' : 'Pokaż →') : cat.key}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Trackmania & AI Highlight Section - Fully Interactive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 land:gap-2 min-w-0 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('new_plugins');
                      setFilterCategory('plugins');
                    }}
                    className="p-3 sm:p-4 land:p-2.5 bg-emerald-950/20 hover:bg-emerald-950/35 border border-emerald-800/40 hover:border-emerald-500 space-y-2 land:space-y-1.5 text-left cursor-pointer transition-all group min-w-0"
                    title={lang === 'en' ? 'Show all Trackmania & Plugins' : 'Pokaż wszystkie wtyczki i projekty Trackmania'}
                  >
                    <div className="flex items-center justify-between text-emerald-400 font-bold uppercase min-w-0">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <Gamepad2 size={16} className="shrink-0" />
                        <span className="truncate">{lang === 'en' ? 'Trackmania & Plugins Core' : 'Moduły i Pluginy Trackmania'}</span>
                      </div>
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                    </div>
                    <p className="text-editorial-muted text-xs font-sans line-clamp-3 land:line-clamp-2 desk:line-clamp-none">
                      {lang === 'en'
                        ? 'Includes custom server controllers (PyPlanet), in-game HUDs (Openplanet), telemetry processors, anticheat and discord sync bridges.'
                        : 'Obejmuje autorskie wtyczki PyPlanet, rozszerzenia HUD Openplanet, narzędzia telemetryczne, anty-cheat oraz integracje z Discordem.'}
                    </p>
                    <div className="pt-2 land:pt-1.5 text-emerald-300 font-bold flex justify-between border-t border-emerald-800/40">
                      <span>{lang === 'en' ? 'Total TM Plugins & Tools:' : 'Razem Wtyczek i Narzędzi TM:'}</span>
                      <span className="flex items-center gap-1">
                        <span>{metrics.trackmaniaTotal}</span>
                        <span className="text-[10px] text-emerald-400 group-hover:underline">→</span>
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('new_plugins');
                      setFilterCategory('ai');
                    }}
                    className="p-3 sm:p-4 land:p-2.5 bg-cyan-950/20 hover:bg-cyan-950/35 border border-cyan-800/40 hover:border-cyan-500 space-y-2 land:space-y-1.5 text-left cursor-pointer transition-all group min-w-0"
                    title={lang === 'en' ? 'Show all AI & Autonomous Agents' : 'Pokaż wszystkich Agentów AI'}
                  >
                    <div className="flex items-center justify-between text-cyan-400 font-bold uppercase min-w-0">
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        <Bot size={16} className="shrink-0" />
                        <span className="truncate">{lang === 'en' ? 'AI & Autonomous Systems' : 'Agenci AI & Automatyzacja'}</span>
                      </div>
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                    </div>
                    <p className="text-editorial-muted text-xs font-sans line-clamp-3 land:line-clamp-2 desk:line-clamp-none">
                      {lang === 'en'
                        ? 'Autonomous agentic frameworks (Hermes Agent, MCP Servers, Gemini CLI agents) and model integration toolkits.'
                        : 'Autonomiczne systemy agentowe (Hermes Agent, MCP Trackmania Server, agenci Gemini CLI) oraz narzędzia integracji modeli.'}
                    </p>
                    <div className="pt-2 land:pt-1.5 text-cyan-300 font-bold flex justify-between border-t border-cyan-800/40">
                      <span>{lang === 'en' ? 'Total AI Architectures:' : 'Razem Systemów AI:'}</span>
                      <span className="flex items-center gap-1">
                        <span>{metrics.aiAgents}</span>
                        <span className="text-[10px] text-cyan-400 group-hover:underline">→</span>
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 5. Footer Block: hidden on mobile portrait & landscape so scrolling content gets full vertical viewport */}
          <div className="hidden desk:flex shrink-0 border-t border-editorial-border px-6 py-2.5 items-center justify-between gap-2 bg-editorial-sidebar-bg min-w-0 font-mono text-xs">
            <span className="flex items-center gap-1.5 text-editorial-accent font-bold min-w-0 flex-1 truncate">
              <Activity size={14} className="shrink-0" />
              <span className="truncate">{lang === 'en' ? 'TOMEKDOT DEVELOPER HUB' : 'CENTRUM TWÓRCY TOMEKDOT'}</span>
            </span>
            <div className="flex items-center gap-2.5 ml-auto shrink-0">
              <span className="hidden md:inline text-editorial-muted text-[10.5px]">© 2026 @tomekdot</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-white transition-colors cursor-pointer uppercase text-xs font-mono shrink-0"
              >
                {lang === 'en' ? 'CLOSE (ESC)' : 'ZAMKNIJ (ESC)'}
              </button>
            </div>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
