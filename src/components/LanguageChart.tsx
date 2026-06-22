/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Repository, LanguageStat } from '../types';
import { LANG_COLORS } from '../data';

interface LanguageChartProps {
  repos: Repository[];
  lang: 'en' | 'pl';
}

export default function LanguageChart({ repos, lang }: LanguageChartProps) {
  const languageStats: LanguageStat[] = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWithLanguage = 0;

    repos.forEach(r => {
      const language = r.lang || 'Shell/Other';
      counts[language] = (counts[language] || 0) + 1;
      totalWithLanguage++;
    });

    if (totalWithLanguage === 0) return [];

    return Object.entries(counts)
      .map(([name, count]) => {
        const color = LANG_COLORS[name] || '#8b949e';
        const percentage = Math.round((count / totalWithLanguage) * 100);
        return { name, color, count, percentage };
      })
      .sort((a, b) => b.count - a.count);
  }, [repos]);

  if (languageStats.length === 0) return null;

  return (
    <div id="language_spectrum_panel" className="bg-editorial-sidebar-bg border border-editorial-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-mono text-xs font-bold tracking-widest uppercase">
          {lang === 'en' ? 'Languages Breakdown' : 'Podział Języków Programowania'}
        </h3>
        <span className="text-[10px] text-editorial-muted font-mono uppercase tracking-wider">
          {lang === 'en' ? 'Calculated on filtered projects' : 'Obliczone dla wyfiltrowanych'}
        </span>
      </div>

      {/* Modern Continuous bar spectrum */}
      <div className="w-full h-2 overflow-hidden flex bg-neutral-900 mb-5 pointer-events-none">
        {languageStats.map((stat, idx) => (
          <div
            key={stat.name}
            style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }}
            className="transition-all duration-500 hover:brightness-110"
            title={`${stat.name}: ${stat.percentage}%`}
          />
        ))}
      </div>

      {/* Grid of details */}
      <div translate="no" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-1 notranslate">
        {languageStats.map(stat => (
          <div 
            key={stat.name} 
            className="flex flex-col p-2 border border-editorial-border bg-neutral-950/20 hover:bg-neutral-950/60 transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span 
                className="w-2 h-2 inline-block pointer-events-none" 
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-white text-xs font-bold font-mono truncate">
                {stat.name}
              </span>
            </div>
            <div className="text-[10px] text-editorial-muted font-mono ml-4 uppercase tracking-wider">
              {stat.percentage}% <span className="text-[9px] text-zinc-650">({stat.count} {stat.count === 1 ? (lang === 'en' ? 'repo' : 'projekt') : (lang === 'en' ? 'repos' : 'projekty')})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
