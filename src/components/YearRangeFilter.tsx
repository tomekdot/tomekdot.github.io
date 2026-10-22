/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Calendar, SlidersHorizontal, RotateCcw, Sparkles, History, ChevronLeft, ChevronRight } from 'lucide-react';

interface YearRangeFilterProps {
  minYear: number;
  maxYear: number;
  selectedRange: [number, number];
  onChange: (range: [number, number]) => void;
  yearDistribution: Record<number, number>;
  totalFilteredCount: number;
  lang: 'en' | 'pl';
}

export default function YearRangeFilter({
  minYear,
  maxYear,
  selectedRange,
  onChange,
  yearDistribution,
  totalFilteredCount,
  lang
}: YearRangeFilterProps) {
  const [fromYear, toYear] = selectedRange;
  const isFullRange = fromYear === minYear && toYear === maxYear;
  const rangeSpan = Math.max(1, maxYear - minYear);

  // Generate list of all individual years between minYear and maxYear
  const yearsList = useMemo(() => {
    const list: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  // Find the maximum count in any year for proportional histogram scaling
  const maxYearCount = useMemo(() => {
    let max = 1;
    yearsList.forEach(y => {
      const c = yearDistribution[y] || 0;
      if (c > max) max = c;
    });
    return max;
  }, [yearsList, yearDistribution]);

  // Handle slider changes
  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const clamped = Math.min(val, toYear);
    onChange([clamped, toYear]);
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const clamped = Math.max(val, fromYear);
    onChange([fromYear, clamped]);
  };

  // Steppers for precision adjustment
  const handleNudgeMin = (delta: number) => {
    const next = Math.max(minYear, Math.min(toYear, fromYear + delta));
    onChange([next, toYear]);
  };

  const handleNudgeMax = (delta: number) => {
    const next = Math.max(fromYear, Math.min(maxYear, toYear + delta));
    onChange([fromYear, next]);
  };

  const handleReset = () => {
    onChange([minYear, maxYear]);
  };

  // Quick preset shortcuts
  const presets = useMemo(() => {
    const midYear = Math.floor((minYear + maxYear) / 2);
    return [
      {
        id: 'all',
        labelEn: `All (${minYear}–${maxYear})`,
        labelPl: `Wszystkie (${minYear}–${maxYear})`,
        range: [minYear, maxYear] as [number, number],
        icon: 'all'
      },
      {
        id: 'newest',
        labelEn: `✨ Newest (2025–${maxYear})`,
        labelPl: `✨ Najnowsze (2025–${maxYear})`,
        range: [Math.max(minYear, 2025), maxYear] as [number, number],
        icon: 'new'
      },
      {
        id: 'y2024',
        labelEn: '2024 Projects',
        labelPl: 'Projekty 2024',
        range: [2024, 2024] as [number, number],
        icon: 'single'
      },
      {
        id: 'older',
        labelEn: `📜 Older (≤ 2023)`,
        labelPl: `📜 Starsze (≤ 2023)`,
        range: [minYear, Math.min(maxYear, 2023)] as [number, number],
        icon: 'old'
      }
    ].filter(p => p.range[0] <= p.range[1] && p.range[0] >= minYear && p.range[1] <= maxYear);
  }, [minYear, maxYear]);

  // Calculate track highlight coordinates
  const leftPercent = ((fromYear - minYear) / rangeSpan) * 100;
  const widthPercent = ((toYear - fromYear) / rangeSpan) * 100;

  return (
    <div className="bg-editorial-sidebar-bg border border-editorial-border p-3 sm:p-4 font-mono select-none">
      {/* 1. Header Toolbar with Title, Range Info and Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-editorial-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-neutral-900 border border-editorial-accent/40 text-editorial-accent">
            <Calendar size={13} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase text-white tracking-wide">
                {lang === 'en' ? 'Created Year Filter' : 'Filtr Rocznika Projektu'}
              </span>
              <span className="text-[10px] text-editorial-muted font-normal">
                ({lang === 'en' ? 'Older vs Newer' : 'Starsze vs Nowsze'})
              </span>
            </div>
          </div>
        </div>

        {/* Selected Range Readout & Clear */}
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 text-xs font-bold border transition-colors flex items-center gap-1.5 ${
            !isFullRange 
              ? 'bg-sky-950/50 border-sky-400 text-sky-300 shadow-[0_0_8px_rgba(88,166,255,0.25)]' 
              : 'bg-neutral-900 border-editorial-border text-editorial-muted'
          }`}>
            <span>
              {fromYear === toYear ? fromYear : `${fromYear} – ${toYear}`}
            </span>
            <span className="text-[10px] opacity-80">
              ({totalFilteredCount} {lang === 'en' ? 'repos' : 'repo'})
            </span>
          </div>

          {!isFullRange && (
            <button
              type="button"
              id="reset_year_filter_btn"
              onClick={handleReset}
              className="text-[10.5px] uppercase font-bold text-editorial-accent hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-editorial-accent/50 px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-colors"
              title={lang === 'en' ? 'Reset year range' : 'Zresetuj zakres lat'}
            >
              <RotateCcw size={10} />
              <span>{lang === 'en' ? 'Reset' : 'Wyczyść'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Visual Histogram Distribution of Projects by Year */}
      <div className="pt-3 pb-1">
        <div className="text-[9.5px] text-editorial-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span>{lang === 'en' ? 'Repository Distribution by Creation Year:' : 'Rozkład projektów według roku:'}</span>
          <span className="text-[9px] text-zinc-500">
            {lang === 'en' ? 'Click year to isolate' : 'Kliknij rok aby wyizolować'}
          </span>
        </div>

        <div className="grid grid-flow-col auto-cols-fr gap-1 sm:gap-2 items-end h-16 pt-2 pb-1 px-1 bg-black/40 border border-editorial-border/40">
          {yearsList.map(year => {
            const count = yearDistribution[year] || 0;
            const inRange = year >= fromYear && year <= toYear;
            const heightPercent = maxYearCount > 0 ? Math.max(12, Math.round((count / maxYearCount) * 100)) : 12;

            return (
              <button
                key={year}
                type="button"
                id={`year_histogram_bar_${year}`}
                onClick={() => {
                  // If already only this year is selected, reset to all; otherwise select just this year
                  if (fromYear === year && toYear === year) {
                    onChange([minYear, maxYear]);
                  } else {
                    onChange([year, year]);
                  }
                }}
                className={`group flex flex-col items-center justify-end h-full cursor-pointer relative transition-all`}
                title={`${year}: ${count} ${lang === 'en' ? 'repositories' : 'repozytoriów'}`}
              >
                {/* Count badge on hover or if bar is notable */}
                <span className={`text-[8.5px] font-bold mb-0.5 transition-opacity ${
                  inRange ? 'text-sky-300' : 'text-neutral-500 group-hover:text-zinc-300'
                }`}>
                  {count}
                </span>

                {/* Vertical Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[32px] transition-all rounded-none ${
                    inRange
                      ? 'bg-sky-500/80 group-hover:bg-sky-400 group-hover:shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                      : 'bg-neutral-800/80 group-hover:bg-neutral-700'
                  }`}
                />

                {/* Year Label */}
                <span className={`text-[9.5px] mt-1 font-bold tracking-tight ${
                  inRange ? 'text-white' : 'text-editorial-muted group-hover:text-zinc-300'
                }`}>
                  {year}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Dual Range Slider Track and Knobs */}
      <div className="pt-4 pb-2 px-1">
        <div className="relative flex items-center h-7">
          {/* Base Track */}
          <div className="absolute left-0 right-0 h-2 bg-neutral-900 border border-editorial-border rounded-none pointer-events-none" />

          {/* Active Highlighted Range Track */}
          <div
            className="absolute h-2 bg-sky-500/80 border-t border-b border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)] pointer-events-none transition-all"
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`
            }}
          />

          {/* Min Input Slider */}
          <input
            type="range"
            id="created_year_min_slider"
            min={minYear}
            max={maxYear}
            step={1}
            value={fromYear}
            onChange={handleMinSliderChange}
            aria-label={lang === 'en' ? 'Minimum creation year' : 'Minimalny rok utworzenia'}
            className="range-slider-thumb absolute left-0 right-0 w-full h-7 appearance-none bg-transparent cursor-pointer z-20"
          />

          {/* Max Input Slider */}
          <input
            type="range"
            id="created_year_max_slider"
            min={minYear}
            max={maxYear}
            step={1}
            value={toYear}
            onChange={handleMaxSliderChange}
            aria-label={lang === 'en' ? 'Maximum creation year' : 'Maksymalny rok utworzenia'}
            className="range-slider-thumb absolute left-0 right-0 w-full h-7 appearance-none bg-transparent cursor-pointer z-30"
          />
        </div>

        {/* Year Range Bounds and Stepper Controls */}
        <div className="flex items-center justify-between text-xs pt-1.5 text-editorial-muted">
          {/* Left / Min Bound Controller */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 uppercase mr-1">
              {lang === 'en' ? 'From:' : 'Od:'}
            </span>
            <button
              type="button"
              id="year_min_dec_btn"
              onClick={() => handleNudgeMin(-1)}
              disabled={fromYear <= minYear}
              className="p-1 bg-neutral-900 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={lang === 'en' ? 'Decrease minimum year' : 'Zmniejsz minimalny rok'}
            >
              <ChevronLeft size={10} />
            </button>
            <span className="px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-white font-bold text-xs">
              {fromYear}
            </span>
            <button
              type="button"
              id="year_min_inc_btn"
              onClick={() => handleNudgeMin(1)}
              disabled={fromYear >= toYear}
              className="p-1 bg-neutral-900 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={lang === 'en' ? 'Increase minimum year' : 'Zwiększ minimalny rok'}
            >
              <ChevronRight size={10} />
            </button>
          </div>

          {/* Center Span indicator */}
          <div className="text-[10px] text-zinc-500 hidden sm:block">
            {fromYear === toYear ? (
              <span>{lang === 'en' ? 'Single year isolated' : 'Pojedynczy rok'}</span>
            ) : (
              <span>{toYear - fromYear + 1} {lang === 'en' ? 'years span' : 'lata w zakresie'}</span>
            )}
          </div>

          {/* Right / Max Bound Controller */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 uppercase mr-1">
              {lang === 'en' ? 'To:' : 'Do:'}
            </span>
            <button
              type="button"
              id="year_max_dec_btn"
              onClick={() => handleNudgeMax(-1)}
              disabled={toYear <= fromYear}
              className="p-1 bg-neutral-900 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={lang === 'en' ? 'Decrease maximum year' : 'Zmniejsz maksymalny rok'}
            >
              <ChevronLeft size={10} />
            </button>
            <span className="px-1.5 py-0.5 bg-neutral-950 border border-editorial-border text-white font-bold text-xs">
              {toYear}
            </span>
            <button
              type="button"
              id="year_max_inc_btn"
              onClick={() => handleNudgeMax(1)}
              disabled={toYear >= maxYear}
              className="p-1 bg-neutral-900 border border-editorial-border hover:border-editorial-accent text-editorial-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={lang === 'en' ? 'Increase maximum year' : 'Zwiększ maksymalny rok'}
            >
              <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Preset Filter Buttons (Older vs Newer) */}
      <div className="pt-2.5 mt-2 border-t border-editorial-border/40 flex flex-wrap items-center gap-1.5">
        <span className="text-[9.5px] text-zinc-500 uppercase font-mono mr-1">
          {lang === 'en' ? 'Presets:' : 'Skróty:'}
        </span>
        {presets.map(p => {
          const isPresetActive = fromYear === p.range[0] && toYear === p.range[1];
          return (
            <button
              key={p.id}
              type="button"
              id={`year_preset_${p.id}`}
              onClick={() => onChange(p.range)}
              className={`px-2 py-1 text-[10.5px] uppercase font-bold transition-all cursor-pointer border ${
                isPresetActive
                  ? 'bg-neutral-900 text-sky-400 border-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                  : 'bg-black/50 text-editorial-muted hover:text-white border-editorial-border/60 hover:border-editorial-border'
              }`}
            >
              {lang === 'en' ? p.labelEn : p.labelPl}
            </button>
          );
        })}
      </div>
    </div>
  );
}
