/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import { CATEGORIES, LANG_COLORS, BLOG_POSTS as FALLBACK_BLOG_POSTS } from '../data';
import AnimatedNumber from './AnimatedNumber';

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

  // Sync activeTab whenever modal opens with initialTab
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // General calculated metrics
  const metrics = useMemo(() => {
    const totalRepos = repos.length;
    const pyplanetPlugins = repos.filter(r => r.cat.includes('pyplanet')).length;
    const openplanetPlugins = repos.filter(r => r.cat.includes('openplanet')).length;
    const trackmaniaTotal = repos.filter(r => r.cat.includes('trackmania') || r.cat.includes('pyplanet') || r.cat.includes('openplanet')).length;
    const aiAgents = repos.filter(r => r.cat.includes('ai')).length;
    const devTools = repos.filter(r => r.cat.includes('tools')).length;
    const totalCommits = repos.reduce((acc, r) => acc + (r.commitsCount || 12), 0);
    const totalStars = repos.reduce((acc, r) => acc + (r.stars || 0), 0);
    const forkedReposCount = repos.filter(r => !!r.isFork).length;
    const totalForks = repos.reduce((acc, r) => acc + (r.forks || 0), 0) + forkedReposCount;

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
  }, [repos]);

  // Newest plugins & projects (Prioritizing Trackmania / Pyplanet / Openplanet / AI agents and latest createdYear)
  const newestPlugins = useMemo(() => {
    return [...repos]
      .filter(r => {
        if (filterCategory === 'all') return true;
        if (filterCategory === 'plugins') return r.cat.includes('pyplanet') || r.cat.includes('openplanet') || r.cat.includes('trackmania');
        if (filterCategory === 'ai') return r.cat.includes('ai');
        if (filterCategory === 'tools') return r.cat.includes('tools');
        if (filterCategory === 'forks') return !!r.isFork;
        return r.cat.includes(filterCategory as CategoryKey);
      })
      .sort((a, b) => {
        // Sort primarily by createdYear descending, then pushedAt descending
        const yearA = a.createdYear || 2024;
        const yearB = b.createdYear || 2024;
        if (yearB !== yearA) return yearB - yearA;

        const dateA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
        const dateB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [repos, filterCategory]);

  // Recent changes / commits activity stream (Sorted chronologically by pushedAt)
  const recentChanges = useMemo(() => {
    return [...repos]
      .filter(r => !!r.pushedAt)
      .sort((a, b) => {
        const timeA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
        const timeB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [repos]);

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return lang === 'en' ? 'Archived snapshot' : 'Zapis archiwalny';
    const date = new Date(isoDate);
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
    return date.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/80 backdrop-blur-sm">
        {/* Backdrop dismiss click */}
        <div className="fixed inset-0" onClick={onClose} />

        {/* Modal Window Container matching BlogModal structure & frame */}
        <motion.div
          id="developer_stats_modal"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative bg-editorial-bg border-2 border-editorial-border w-full max-w-5xl rounded-none shadow-2xl flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[88vh] h-[92vh] sm:h-[680px]"
        >
          {/* 1. Modal Top Header */}
          <div className="bg-editorial-sidebar-bg border-b border-editorial-border px-3.5 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
              <div className="p-1.5 sm:p-2 bg-[#1D170E] border border-editorial-accent/50 text-editorial-accent shrink-0">
                <Activity size={17} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-white font-mono font-bold text-xs sm:text-base md:text-lg uppercase tracking-wider truncate">
                    {lang === 'en' ? 'Developer Stats & Changelog' : 'Statystyki Twórcy & Dziennik'}
                  </h2>
                  <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-editorial-accent/15 border border-editorial-accent/50 text-editorial-accent shrink-0">
                    @tomekdot
                  </span>
                </div>
                <p className="text-[11px] font-mono text-editorial-muted hidden sm:block truncate">
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
              className="p-1.5 sm:p-2 text-editorial-muted hover:text-white hover:bg-neutral-900 border border-editorial-border transition-colors cursor-pointer shrink-0"
              title={lang === 'en' ? 'Close (Esc)' : 'Zamknij (Esc)'}
            >
              <X size={16} />
            </button>
          </div>

          {/* 2. Top Summary KPI Highlights Grid (6-col repository metrics) */}
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-editorial-border border-b border-editorial-border bg-neutral-950/70 shrink-0 text-center font-mono">
            <button
              type="button"
              onClick={() => {
                setActiveTab('new_plugins');
                setFilterCategory('all');
              }}
              className={`p-2 sm:p-3 flex flex-col items-center justify-center min-w-0 transition-all cursor-pointer group ${
                activeTab === 'new_plugins' && filterCategory === 'all'
                  ? 'bg-neutral-900 ring-1 ring-inset ring-editorial-accent/60'
                  : 'hover:bg-neutral-900/60'
              }`}
              title={lang === 'en' ? 'Show all repositories' : 'Pokaż wszystkie repozytoria'}
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-white group-hover:text-editorial-accent transition-colors leading-tight">
                <AnimatedNumber value={metrics.totalRepos} />
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-editorial-muted group-hover:text-white mt-0.5 truncate w-full flex items-center justify-center gap-1">
                <span>{lang === 'en' ? 'Repos' : 'Repozytoria'}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('new_plugins');
                setFilterCategory('pyplanet');
              }}
              className={`p-2 sm:p-3 flex flex-col items-center justify-center min-w-0 transition-all cursor-pointer group ${
                activeTab === 'new_plugins' && filterCategory === 'pyplanet'
                  ? 'bg-emerald-950/40 ring-1 ring-inset ring-emerald-400'
                  : 'bg-emerald-950/15 hover:bg-emerald-950/30'
              }`}
              title={lang === 'en' ? 'Filter PyPlanet plugins' : 'Filtruj pluginy PyPlanet'}
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-emerald-400 group-hover:text-emerald-300 transition-colors leading-tight">
                <AnimatedNumber value={metrics.pyplanetPlugins} />
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-emerald-300/90 mt-0.5 flex items-center justify-center gap-0.5 truncate w-full">
                <Gamepad2 size={9} className="shrink-0" />
                <span className="truncate">PyPlanet</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('new_plugins');
                setFilterCategory('openplanet');
              }}
              className={`p-2 sm:p-3 flex flex-col items-center justify-center min-w-0 transition-all cursor-pointer group ${
                activeTab === 'new_plugins' && filterCategory === 'openplanet'
                  ? 'bg-fuchsia-950/40 ring-1 ring-inset ring-fuchsia-400'
                  : 'bg-fuchsia-950/15 hover:bg-fuchsia-950/30'
              }`}
              title={lang === 'en' ? 'Filter Openplanet plugins' : 'Filtruj pluginy Openplanet'}
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-fuchsia-400 group-hover:text-fuchsia-300 transition-colors leading-tight">
                <AnimatedNumber value={metrics.openplanetPlugins} />
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-fuchsia-300/90 mt-0.5 flex items-center justify-center gap-0.5 truncate w-full">
                <Globe size={9} className="shrink-0" />
                <span className="truncate">Openplanet</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('new_plugins');
                setFilterCategory('ai');
              }}
              className={`p-2 sm:p-3 flex flex-col items-center justify-center min-w-0 transition-all cursor-pointer group ${
                activeTab === 'new_plugins' && filterCategory === 'ai'
                  ? 'bg-cyan-950/40 ring-1 ring-inset ring-cyan-400'
                  : 'bg-cyan-950/15 hover:bg-cyan-950/30'
              }`}
              title={lang === 'en' ? 'Filter AI & Autonomous Agents' : 'Filtruj agentów AI'}
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-cyan-400 group-hover:text-cyan-300 transition-colors leading-tight">
                <AnimatedNumber value={metrics.aiAgents} />
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-cyan-300/90 mt-0.5 flex items-center justify-center gap-0.5 truncate w-full">
                <Bot size={9} className="shrink-0" />
                <span className="truncate">AI & Agents</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('recent_activity');
              }}
              className={`p-2 sm:p-3 flex flex-col items-center justify-center min-w-0 transition-all cursor-pointer group ${
                activeTab === 'recent_activity'
                  ? 'bg-[#221A0F] ring-1 ring-inset ring-editorial-accent'
                  : 'bg-[#17130B]/30 hover:bg-[#17130B]/60'
              }`}
              title={lang === 'en' ? 'View commit activity log & changelog' : 'Zobacz dziennik aktywności commitów'}
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-editorial-accent group-hover:text-white transition-colors leading-tight truncate">
                {metrics.totalCommits >= 1000 ? `${(metrics.totalCommits / 1000).toFixed(1)}k+` : `${metrics.totalCommits}+`}
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-editorial-muted group-hover:text-editorial-accent mt-0.5 flex items-center justify-center gap-0.5 truncate w-full">
                <GitCommit size={9} className="shrink-0 text-editorial-accent" />
                <span className="truncate">{lang === 'en' ? 'Commits' : 'Commity'}</span>
              </span>
            </button>

            <button
              type="button"
              id="stats_kpi_forks_btn"
              onClick={() => {
                setActiveTab('new_plugins');
                setFilterCategory(filterCategory === 'forks' && activeTab === 'new_plugins' ? 'all' : 'forks');
              }}
              className={`p-2 sm:p-3 flex flex-col items-center justify-center min-w-0 transition-all cursor-pointer group ${
                activeTab === 'new_plugins' && filterCategory === 'forks'
                  ? 'bg-purple-950/50 ring-1 ring-inset ring-purple-400'
                  : 'bg-purple-950/15 hover:bg-purple-950/35'
              }`}
              title={lang === 'en' ? `Filter ${metrics.forkedReposCount} forked repositories` : `Filtruj ${metrics.forkedReposCount} sforkowane repozytoria`}
            >
              <span className="text-base sm:text-xl md:text-2xl font-black text-purple-400 group-hover:text-purple-300 transition-colors leading-tight">
                <AnimatedNumber value={metrics.forkedReposCount} />
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-purple-300/90 mt-0.5 flex items-center justify-center gap-0.5 truncate w-full">
                <GitFork size={9} className="shrink-0 text-purple-400" />
                <span className="truncate">{lang === 'en' ? 'Forked' : 'Forki'}</span>
              </span>
            </button>
          </div>

          {/* 3. Navigation Tabs within modal */}
          <div className="flex border-b border-editorial-border bg-[#0E0E0E] px-2 sm:px-4 md:px-6 pt-1.5 sm:pt-2 md:pt-3 shrink-0 gap-1 sm:gap-1.5 md:gap-2 overflow-x-auto font-mono text-[11px] sm:text-xs scrollbar-none w-full">
            <button
              type="button"
              id="stats_tab_new_plugins"
              onClick={() => setActiveTab('new_plugins')}
              className={`flex-1 md:flex-initial justify-center md:justify-start px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 font-bold uppercase tracking-wider border-t-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === 'new_plugins'
                  ? 'border-editorial-accent text-editorial-accent bg-[#18140E]'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Sparkles size={13} className={activeTab === 'new_plugins' ? 'text-editorial-accent shrink-0' : 'text-editorial-muted shrink-0'} />
              <span className="sm:hidden">{lang === 'en' ? 'Plugins' : 'Pluginy'}</span>
              <span className="hidden sm:inline lg:hidden">{lang === 'en' ? 'Plugins & Releases' : 'Pluginy & Wydania'}</span>
              <span className="hidden lg:inline">{lang === 'en' ? 'New Plugins & Releases' : 'Nowe Pluginy i Projekty'}</span>
              <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 bg-neutral-900 border border-editorial-border text-editorial-muted">
                {newestPlugins.length}
              </span>
            </button>

            <button
              type="button"
              id="stats_tab_recent_activity"
              onClick={() => setActiveTab('recent_activity')}
              className={`flex-1 md:flex-initial justify-center md:justify-start px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 font-bold uppercase tracking-wider border-t-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === 'recent_activity'
                  ? 'border-editorial-accent text-editorial-accent bg-[#18140E]'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Zap size={13} className={activeTab === 'recent_activity' ? 'text-editorial-accent shrink-0' : 'text-editorial-muted shrink-0'} />
              <span className="sm:hidden">{lang === 'en' ? 'Changelog' : 'Zmiany'}</span>
              <span className="hidden sm:inline lg:hidden">{lang === 'en' ? 'Activity & Changelog' : 'Aktywność & Dziennik'}</span>
              <span className="hidden lg:inline">{lang === 'en' ? 'Recent Changes & Changelog' : 'Ostatnie Zmiany i Aktywność'}</span>
              <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 bg-neutral-900 border border-editorial-border text-editorial-muted">
                {recentChanges.length}
              </span>
            </button>

            <button
              type="button"
              id="stats_tab_breakdown"
              onClick={() => setActiveTab('breakdown')}
              className={`flex-1 md:flex-initial justify-center md:justify-start px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 font-bold uppercase tracking-wider border-t-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === 'breakdown'
                  ? 'border-editorial-accent text-editorial-accent bg-[#18140E]'
                  : 'border-transparent text-editorial-muted hover:text-white'
              }`}
            >
              <Layers size={13} className={activeTab === 'breakdown' ? 'text-editorial-accent shrink-0' : 'text-editorial-muted shrink-0'} />
              <span className="sm:hidden">{lang === 'en' ? 'Matrix' : 'Kategorie'}</span>
              <span className="hidden sm:inline lg:hidden">{lang === 'en' ? 'Tech Matrix' : 'Matryca Tech'}</span>
              <span className="hidden lg:inline">{lang === 'en' ? 'Category & Tech Matrix' : 'Kategorie i Technologie'}</span>
            </button>
          </div>

          {/* 4. Tab Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            {activeTab === 'new_plugins' && (
              <div className="space-y-4">
                {/* Category quick chips for plugins */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-editorial-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-editorial-muted flex-wrap">
                    <span className="text-[11px] hidden sm:inline">{lang === 'en' ? 'Filter focus:' : 'Filtruj:'}</span>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFilterCategory('all')}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-mono uppercase cursor-pointer border ${
                          filterCategory === 'all' ? 'border-editorial-accent text-editorial-accent bg-neutral-900 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        {lang === 'en' ? 'All' : 'Wszystkie'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory('plugins')}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-mono uppercase cursor-pointer border ${
                          filterCategory === 'plugins' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/30 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        🎮 TM & Plugins
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory('ai')}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-mono uppercase cursor-pointer border ${
                          filterCategory === 'ai' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/30 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        🤖 AI
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory('tools')}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-mono uppercase cursor-pointer border ${
                          filterCategory === 'tools' ? 'border-orange-500 text-orange-400 bg-orange-950/30 font-bold' : 'border-editorial-border text-editorial-muted hover:text-white'
                        }`}
                      >
                        🛠️ Tools
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterCategory(filterCategory === 'forks' ? 'all' : 'forks')}
                        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-mono uppercase cursor-pointer border flex items-center gap-1 ${
                          filterCategory === 'forks' ? 'border-purple-500 text-purple-400 bg-purple-950/40 font-bold shadow-[0_0_8px_rgba(168,85,247,0.15)]' : 'border-editorial-border text-editorial-muted hover:text-purple-300'
                        }`}
                      >
                        <GitFork size={10} className="text-purple-400" />
                        <span>{lang === 'en' ? 'Forked' : 'Forki'}</span>
                        {metrics.forkedReposCount > 0 && (
                          <span className="text-[8.5px] px-1 bg-purple-950 border border-purple-800 text-purple-300 font-bold">
                            {metrics.forkedReposCount}
                          </span>
                        )}
                      </button>

                      {filterCategory !== 'all' && filterCategory !== 'plugins' && filterCategory !== 'ai' && filterCategory !== 'tools' && filterCategory !== 'forks' && (
                        <button
                          type="button"
                          onClick={() => setFilterCategory('all')}
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9.5px] sm:text-[10px] font-mono uppercase cursor-pointer border border-editorial-accent text-editorial-accent bg-[#1D170E] font-bold flex items-center gap-1"
                          title={lang === 'en' ? 'Clear category filter' : 'Wyczyść filtr kategorii'}
                        >
                          <span>
                            {CATEGORIES[filterCategory as CategoryKey]
                              ? (lang === 'en' ? CATEGORIES[filterCategory as CategoryKey].labelEn : CATEGORIES[filterCategory as CategoryKey].labelPl)
                              : filterCategory}
                          </span>
                          <span className="text-xs">✕</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-editorial-muted">
                    {newestPlugins.length} {lang === 'en' ? 'projects' : 'projektów'}
                  </span>
                </div>

                {/* Grid list with strictly unique consecutive numbers (01, 02, 03, ...) */}
                <div className="space-y-3">
                  {newestPlugins.map((repo, index) => {
                    // Strictly consecutive numbering: 01, 02, 03... (no duplicates!)
                    const seqNumber = String(index + 1).padStart(2, '0');
                    const primaryCat = repo.cat[0] || 'other';
                    const catSpec = CATEGORIES[primaryCat] || CATEGORIES.other;
                    const isTrackmaniaPlugin = repo.cat.includes('pyplanet') || repo.cat.includes('openplanet') || repo.cat.includes('trackmania');
                    const isAiAgent = repo.cat.includes('ai');

                    return (
                      <div
                        key={repo.name}
                        className="p-4 bg-neutral-950/60 hover:bg-neutral-900/80 border border-editorial-border hover:border-editorial-accent/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Unique Non-repeating sequence badge */}
                          <div className="w-9 h-9 shrink-0 flex items-center justify-center font-mono font-black text-xs bg-neutral-900 border border-editorial-border text-editorial-accent group-hover:border-editorial-accent">
                            #{seqNumber}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <h3
                                onClick={() => onSelectRepo(repo)}
                                className="font-mono font-bold text-white text-sm sm:text-base hover:text-editorial-accent transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <span>{repo.name}</span>
                                <ArrowUpRight size={13} className="text-editorial-muted group-hover:text-editorial-accent opacity-0 group-hover:opacity-100 transition-all" />
                              </h3>

                              {/* Exact tag sizing matching RepoCard.tsx */}
                              {repo.isPrivate && (
                                <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
                                  <Lock size={9} />
                                  <span>{lang === 'en' ? 'Private' : 'Prywatne'}</span>
                                </span>
                              )}

                              {repo.isFork && (
                                <span className="inline-flex items-center gap-1 bg-[#1A1028] text-purple-400 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                                  <GitFork size={9} className="text-purple-400 shrink-0" />
                                  <span>{lang === 'en' ? 'Fork' : 'Fork'}</span>
                                </span>
                              )}

                              {isTrackmaniaPlugin && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 shrink-0 whitespace-nowrap">
                                  {repo.cat.includes('pyplanet') ? 'PyPlanet' : repo.cat.includes('openplanet') ? 'Openplanet' : 'Trackmania'}
                                </span>
                              )}

                              {isAiAgent && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 shrink-0 whitespace-nowrap">
                                  AI Agent
                                </span>
                              )}

                              {repo.createdYear && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400 bg-neutral-900 border border-editorial-border shrink-0 whitespace-nowrap">
                                  {repo.createdYear}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-editorial-muted font-sans line-clamp-2 max-w-2xl leading-relaxed">
                              {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] font-mono text-editorial-muted pt-1 flex-wrap">
                              {repo.lang && (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.lang] || '#8b949e' }} />
                                  <span className="text-zinc-300">{repo.lang}</span>
                                </span>
                              )}
                              <span>•</span>
                              <span>
                                {repo.commitsCount || 12} {lang === 'en' ? 'commits' : 'commitów'}
                              </span>
                              {repo.stars > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400 flex items-center gap-1" title="Stars">
                                    <Star size={10} className="fill-amber-400/20 text-amber-400" />
                                    <span>{repo.stars}</span>
                                  </span>
                                </>
                              )}
                              {(repo.forks > 0 || repo.isFork) && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-400 flex items-center gap-1" title={repo.isFork ? (repo.forkParent ? `Forked from ${repo.forkParent}` : 'Forked repository') : 'Forks'}>
                                    <GitFork size={10} />
                                    <span>{repo.forks > 0 ? `${repo.forks} ${repo.forks === 1 ? 'fork' : 'forks'}` : (lang === 'en' ? 'Fork' : 'Fork')}</span>
                                  </span>
                                </>
                              )}
                              {repo.pushedAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-zinc-400 flex items-center gap-1">
                                    <Clock size={10} />
                                    <span>{lang === 'en' ? 'Updated:' : 'Aktualizacja:'} {formatRelativeTime(repo.pushedAt)}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons with unified identical height & styling */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => onSelectRepo(repo)}
                            className="h-8 px-3 bg-editorial-sidebar-bg hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>{lang === 'en' ? 'Inspect' : 'Szczegóły'}</span>
                            <ChevronRight size={13} />
                          </button>
                          {repo.url && (
                            <a
                              href={repo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 w-8 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent hover:text-white text-editorial-muted transition-all flex items-center justify-center shrink-0"
                              title="GitHub"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'recent_activity' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-950/15 border border-amber-800/40 text-amber-300/90 text-xs font-mono flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-amber-400 shrink-0" />
                    <span>
                      {lang === 'en'
                        ? 'Chronological feed of latest pushes, updates, and releases across repositories.'
                        : 'Chronologiczny dziennik ostatnich zmian, aktualizacji i commitów w repozytoriach.'}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 border border-amber-800/60 shrink-0">
                    LIVE LOG
                  </span>
                </div>

                {/* Timeline list with guaranteed unique numbers */}
                <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-px before:bg-editorial-border">
                  {recentChanges.map((repo, index) => {
                    const seqNumber = String(index + 1).padStart(2, '0');
                    return (
                      <div
                        key={repo.name}
                        className="relative pl-10 group"
                      >
                        {/* Timeline marker node with unique sequence */}
                        <div className="absolute left-1.5 top-3.5 w-6 h-6 rounded-full bg-[#0C0C0C] border-2 border-editorial-accent flex items-center justify-center text-[9px] font-mono font-black text-editorial-accent">
                          {index + 1}
                        </div>

                        <div className="p-4 bg-neutral-950/80 border border-editorial-border hover:border-editorial-accent/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold text-editorial-accent">
                                #{seqNumber}
                              </span>
                              <h4
                                onClick={() => onSelectRepo(repo)}
                                className="font-mono font-bold text-white text-sm sm:text-base hover:text-editorial-accent cursor-pointer transition-colors"
                              >
                                {repo.name}
                              </h4>

                              {repo.isPrivate && (
                                <span className="inline-flex items-center gap-1 bg-[#1F1111] text-rose-500 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap">
                                  <Lock size={9} />
                                  <span>{lang === 'en' ? 'Private' : 'Prywatne'}</span>
                                </span>
                              )}

                              {repo.isFork && (
                                <span className="inline-flex items-center gap-1 bg-[#1A1028] text-purple-400 border border-purple-500/40 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold shrink-0 whitespace-nowrap shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                                  <GitFork size={9} className="text-purple-400 shrink-0" />
                                  <span>{lang === 'en' ? 'Fork' : 'Fork'}</span>
                                </span>
                              )}

                              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 shrink-0 whitespace-nowrap">
                                {formatRelativeTime(repo.pushedAt)}
                              </span>
                            </div>

                            <p className="text-xs text-editorial-muted font-sans line-clamp-1">
                              {lang === 'en' ? repo.desc : (repo.descPl || repo.desc)}
                            </p>

                            <div className="flex items-center gap-3 text-[10px] font-mono text-editorial-muted pt-0.5 flex-wrap">
                              {repo.pushedAt && (
                                <span className="text-zinc-400 flex items-center gap-1">
                                  <Calendar size={10} />
                                  <span>{new Date(repo.pushedAt).toISOString().split('T')[0]}</span>
                                </span>
                              )}
                              <span>•</span>
                              <span>{repo.lang || 'Code'}</span>
                              <span>•</span>
                              <span className="text-editorial-accent">
                                {repo.commitsCount || 12} {lang === 'en' ? 'commits tracked' : 'zarejestrowanych commitów'}
                              </span>
                              {repo.stars > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-400 flex items-center gap-1">
                                    <Star size={10} className="fill-amber-400/20 text-amber-400" />
                                    <span>{repo.stars}</span>
                                  </span>
                                </>
                              )}
                              {(repo.forks > 0 || repo.isFork) && (
                                <>
                                  <span>•</span>
                                  <span className="text-purple-400 flex items-center gap-1">
                                    <GitFork size={10} />
                                    <span>{repo.forks > 0 ? `${repo.forks} forks` : 'Fork'}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => onSelectRepo(repo)}
                              className="h-8 px-3 bg-editorial-sidebar-bg hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-editorial-accent hover:text-white text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>{lang === 'en' ? 'Inspect' : 'Szczegóły'}</span>
                              <ChevronRight size={13} />
                            </button>
                            {repo.url && (
                              <a
                                href={repo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="h-8 w-8 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent hover:text-white text-editorial-muted transition-all flex items-center justify-center shrink-0"
                                title="GitHub"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'breakdown' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Category distribution grid with centered header */}
                <div>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-editorial-border" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-editorial-accent text-center shrink-0">
                      {lang === 'en' ? 'Category Ecosystem Distribution' : 'Podział Ekosystemu wg Kategorii'}
                    </h3>
                    <div className="h-px flex-1 bg-editorial-border" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
                    {Object.values(CATEGORIES).map(cat => {
                      const count = repos.filter(r => r.cat.includes(cat.key)).length;
                      const percentage = metrics.totalRepos > 0 ? Math.round((count / metrics.totalRepos) * 100) : 0;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => {
                            setActiveTab('new_plugins');
                            setFilterCategory(cat.key);
                          }}
                          className="p-3.5 bg-neutral-950 hover:bg-neutral-900 border border-editorial-border hover:border-editorial-accent transition-all flex flex-col justify-between gap-2 shadow-sm text-left cursor-pointer group"
                          title={lang === 'en' ? `Filter repositories by ${cat.labelEn}` : `Filtruj repozytoria wg ${cat.labelPl}`}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="text-xs font-bold text-white group-hover:text-editorial-accent transition-colors truncate flex items-center gap-1.5">
                              <span>{lang === 'en' ? cat.labelEn : cat.labelPl}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('new_plugins');
                      setFilterCategory('plugins');
                    }}
                    className="p-4 bg-emerald-950/20 hover:bg-emerald-950/35 border border-emerald-800/40 hover:border-emerald-500 space-y-2 text-left cursor-pointer transition-all group"
                    title={lang === 'en' ? 'Show all Trackmania & Plugins' : 'Pokaż wszystkie wtyczki i projekty Trackmania'}
                  >
                    <div className="flex items-center justify-between text-emerald-400 font-bold uppercase">
                      <div className="flex items-center gap-2">
                        <Gamepad2 size={16} />
                        <span>{lang === 'en' ? 'Trackmania & Plugins Core' : 'Moduły i Pluginy Trackmania'}</span>
                      </div>
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-editorial-muted text-xs font-sans">
                      {lang === 'en'
                        ? 'Includes custom server controllers (PyPlanet), in-game HUDs (Openplanet), telemetry processors, anticheat and discord sync bridges.'
                        : 'Obejmuje autorskie wtyczki PyPlanet, rozszerzenia HUD Openplanet, narzędzia telemetryczne, anty-cheat oraz integracje z Discordem.'}
                    </p>
                    <div className="pt-2 text-emerald-300 font-bold flex justify-between border-t border-emerald-800/40">
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
                    className="p-4 bg-cyan-950/20 hover:bg-cyan-950/35 border border-cyan-800/40 hover:border-cyan-500 space-y-2 text-left cursor-pointer transition-all group"
                    title={lang === 'en' ? 'Show all AI & Autonomous Agents' : 'Pokaż wszystkich Agentów AI'}
                  >
                    <div className="flex items-center justify-between text-cyan-400 font-bold uppercase">
                      <div className="flex items-center gap-2">
                        <Bot size={16} />
                        <span>{lang === 'en' ? 'AI & Autonomous Systems' : 'Agenci AI & Automatyzacja'}</span>
                      </div>
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-editorial-muted text-xs font-sans">
                      {lang === 'en'
                        ? 'Autonomous agentic frameworks (Hermes Agent, MCP Servers, Gemini CLI agents) and model integration toolkits.'
                        : 'Autonomiczne systemy agentowe (Hermes Agent, MCP Trackmania Server, agenci Gemini CLI) oraz narzędzia integracji modeli.'}
                    </p>
                    <div className="pt-2 text-cyan-300 font-bold flex justify-between border-t border-cyan-800/40">
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

          {/* 5. Footer Block matching BlogModal */}
          <div className="bg-editorial-sidebar-bg border-t border-editorial-border px-6 py-4 flex items-center justify-between text-xs font-mono text-editorial-muted shrink-0">
            <span className="flex items-center gap-1.5 text-editorial-accent font-bold">
              <Activity size={14} />
              {lang === 'en' ? 'TOMEKDOT DEVELOPER HUB' : 'CENTRUM TWÓRCY TOMEKDOT'}
            </span>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline">© 2026 @tomekdot</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-editorial-border hover:border-editorial-accent text-white transition-colors cursor-pointer uppercase text-xs font-mono"
              >
                {lang === 'en' ? 'Close Window (Esc)' : 'Zamknij (Esc)'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
