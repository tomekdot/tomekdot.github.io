/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Filter, X, Sparkles, Check } from 'lucide-react';
import { Repository, LanguageStat } from '../types';
import { LANG_COLORS } from '../data';

interface LanguageChartProps {
  repos: Repository[];
  lang: 'en' | 'pl';
  selectedLang?: string;
  onSelectLang?: (language: string) => void;
}

export default function LanguageChart({ repos, lang, selectedLang, onSelectLang }: LanguageChartProps) {
  const languageStats: LanguageStat[] = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithLanguage = 0;

    repos.forEach(r => {
      let language = (r.lang && r.lang.trim() !== '') ? r.lang : 'Shell/Other';
      if (language === 'Shell' || language === 'Other') {
        language = 'Shell/Other';
      }
      counts[language] = (counts[language] || 0) + 1;
      totalWithLanguage++;
    });

    if (totalWithLanguage === 0) return [];

    return Object.entries(counts)
      .map(([name, count]) => {
        const color = LANG_COLORS[name] || (name === 'Shell/Other' ? '#89e051' : '#8b949e');
        const percentage = Math.round((count / totalWithLanguage) * 100);
        return { name, color, count, percentage };
      })
      .sort((a, b) => b.count - a.count);
  }, [repos]);

  if (languageStats.length === 0) return null;

  const isFiltering = selectedLang && selectedLang !== 'all' && selectedLang !== '';

  return (
    <div id="language_spectrum_panel" className="bg-editorial-sidebar-bg border border-editorial-border p-2.5 sm:p-3 md:p-3.5 shadow-sm relative clear-both">
      {/* Header with Title and Language Filter Reset */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2 sm:mb-2.5">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-mono text-[11px] sm:text-xs font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span>{lang === 'en' ? 'Languages Breakdown' : 'Podział Języków Programowania'}</span>
          </h3>
          <span className="text-[9px] sm:text-[10px] text-editorial-muted font-mono uppercase tracking-wider hidden md:inline">
            ({lang === 'en' ? 'Click language button to filter' : 'Kliknij przycisk języka, aby przefiltrować'})
          </span>
        </div>

        {/* Active Language Filter Indicator & Reset */}
        {isFiltering ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-editorial-accent font-bold flex items-center gap-1 bg-black/60 border border-editorial-accent/50 px-2 py-0.5">
              <Check size={11} className="text-editorial-accent" />
              <span>
                {lang === 'en' ? 'Filtered: ' : 'Filtr: '}
                {selectedLang === 'Shell/Other' || selectedLang === 'Shell' || selectedLang === 'Other'
                  ? (lang === 'en' ? 'Shell/Other' : 'Shell/Inne')
                  : selectedLang}
              </span>
            </span>
            <button
              type="button"
              id="clear_language_chart_filter_btn"
              onClick={() => onSelectLang && onSelectLang('all')}
              className="text-[10px] font-mono font-bold text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-colors"
              title={lang === 'en' ? 'Clear language filter' : 'Wyczyść filtr języka'}
            >
              <X size={11} />
              <span>{lang === 'en' ? 'Show All Languages' : 'Pokaż wszystkie'}</span>
            </button>
          </div>
        ) : (
          <span className="text-[9px] sm:text-[10px] text-editorial-muted font-mono uppercase tracking-wider hidden sm:inline">
            {lang === 'en' ? `${languageStats.length} technologies in visible repos` : `${languageStats.length} języków w widocznych projektach`}
          </span>
        )}
      </div>

      {/* Modern Interactive Continuous Bar Spectrum */}
      <div 
        className="w-full h-2 sm:h-2.5 overflow-hidden flex bg-neutral-900 mb-2 sm:mb-2.5 rounded-none border border-editorial-border/40 shadow-inner"
        role="group"
        aria-label={lang === 'en' ? 'Language spectrum bar' : 'Pasek spektrum języków'}
      >
        {languageStats.map((stat) => {
          const isSelected = selectedLang === stat.name || 
            (stat.name === 'Shell/Other' && (selectedLang === 'Shell' || selectedLang === 'Other' || selectedLang === 'Shell/Other'));
          const isDimmed = isFiltering && !isSelected;
          const displayName = stat.name === 'Shell/Other' ? (lang === 'en' ? 'Shell/Other' : 'Shell/Inne') : stat.name;

          return (
            <button
              type="button"
              key={stat.name}
              style={{ width: `${Math.max(stat.percentage, 1.5)}%`, backgroundColor: stat.color }}
              onClick={() => onSelectLang && onSelectLang(isSelected ? 'all' : stat.name)}
              className={`h-full transition-all duration-200 cursor-pointer focus:outline-none hover:brightness-125 ${
                isDimmed ? 'opacity-30 hover:opacity-85' : 'opacity-100 hover:scale-y-110'
              }`}
              title={`${displayName}: ${stat.percentage}% (${stat.count} ${stat.count === 1 ? 'repo' : 'repos'}) — ${
                isSelected 
                  ? (lang === 'en' ? 'Click to deselect' : 'Kliknij, aby odznaczyć') 
                  : (lang === 'en' ? 'Click to filter' : 'Kliknij, aby przefiltrować')
              }`}
            />
          );
        })}
      </div>

      {/* Grid of Interactive Language Filter Buttons */}
      <div translate="no" className="grid grid-cols-[repeat(auto-fill,minmax(125px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(145px,1fr))] gap-2 sm:gap-2.5 pt-0.5 notranslate">
        {languageStats.map(stat => {
          const isSelected = selectedLang === stat.name || 
            (stat.name === 'Shell/Other' && (selectedLang === 'Shell' || selectedLang === 'Other' || selectedLang === 'Shell/Other'));
          const isDimmed = isFiltering && !isSelected;
          const displayName = stat.name === 'Shell/Other' ? (lang === 'en' ? 'Shell/Other' : 'Shell/Inne') : stat.name;

          return (
            <button
              type="button"
              key={stat.name}
              onClick={() => onSelectLang && onSelectLang(isSelected ? 'all' : stat.name)}
              className={`group flex flex-col justify-between p-2 sm:p-2.5 text-left transition-all duration-150 cursor-pointer rounded-none border focus:outline-none ${
                isSelected
                  ? 'border-editorial-accent bg-editorial-accent/15 shadow-[0_0_12px_rgba(230,175,46,0.25)] ring-1 ring-editorial-accent scale-[1.02]'
                  : isDimmed
                    ? 'border-editorial-border/40 bg-neutral-950/20 opacity-60 hover:opacity-100 hover:border-editorial-accent/60 hover:bg-neutral-900/60'
                    : 'border-editorial-border bg-neutral-950/40 hover:border-editorial-accent/60 hover:bg-neutral-900/70 hover:shadow-sm'
              }`}
              title={
                isSelected 
                  ? (lang === 'en' ? `Active filter: ${displayName}. Click to clear filter.` : `Aktywny filtr: ${displayName}. Kliknij, aby wyczyścić filtr.`)
                  : (lang === 'en' ? `Filter by ${displayName} (${stat.count} repositories)` : `Filtruj po: ${displayName} (${stat.count} repozytoriów)`)
              }
            >
              <div className="flex items-center justify-between gap-1 mb-1 min-w-0 w-full">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span 
                    className={`w-2 h-2 shrink-0 transition-transform ${isSelected ? 'scale-125 ring-1 ring-white/60' : 'group-hover:scale-125'}`} 
                    style={{ backgroundColor: stat.color }}
                  />
                  <span className={`text-[11px] sm:text-xs font-bold font-mono whitespace-nowrap truncate ${
                    isSelected ? 'text-editorial-accent' : 'text-white group-hover:text-editorial-accent'
                  }`}>
                    {displayName}
                  </span>
                </div>
                {isSelected && (
                  <span className="text-[9px] font-mono font-bold text-editorial-accent px-1 bg-black/80 border border-editorial-accent/40 shrink-0" title={lang === 'en' ? 'Active - click to clear' : 'Aktywny - kliknij, aby wyczyścić'}>
                    ✕
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-editorial-muted font-mono pl-3.5 uppercase tracking-wider whitespace-nowrap w-full">
                <span>{stat.percentage}%</span>
                <span className={`${isSelected ? 'text-editorial-accent font-bold' : 'text-neutral-400 group-hover:text-zinc-300'}`}>
                  {stat.count} {stat.count === 1 ? (lang === 'en' ? 'repo' : 'repo') : (lang === 'en' ? 'repos' : 'repo')}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
