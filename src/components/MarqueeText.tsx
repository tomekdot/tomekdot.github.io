/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useLayoutEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  translateNo?: boolean;
}

export default function MarqueeText({ text, className = '', translateNo = false }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<{ isOverflowing: boolean; maxScroll: number; duration: number }>({
    isOverflowing: false,
    maxScroll: 0,
    duration: 8,
  });

  useLayoutEffect(() => {
    const updateMeasurement = () => {
      const container = containerRef.current;
      const measureEl = measureRef.current;
      if (!container || !measureEl) return;

      const textWidth = measureEl.scrollWidth;
      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;

      const diff = textWidth - containerWidth;
      if (diff > 4) {
        const scrollDist = Math.ceil(diff + 12);
        const calcDuration = Math.max(7.5, Math.min(18, 7.5 + scrollDist / 25));
        setState(prev =>
          prev.isOverflowing && prev.maxScroll === scrollDist && prev.duration === calcDuration
            ? prev
            : { isOverflowing: true, maxScroll: scrollDist, duration: calcDuration }
        );
      } else {
        setState(prev =>
          !prev.isOverflowing ? prev : { isOverflowing: false, maxScroll: 0, duration: 8 }
        );
      }
    };

    // Measure synchronously before paint so dock tabs never flash or swap DOM nodes after appearing
    updateMeasurement();

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      let lastWidth = containerRef.current.clientWidth;
      const observer = new ResizeObserver((entries) => {
        const nextWidth = entries[0]?.contentRect?.width ?? 0;
        if (Math.abs(nextWidth - lastWidth) > 2) {
          lastWidth = nextWidth;
          updateMeasurement();
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateMeasurement, { passive: true });
    return () => window.removeEventListener('resize', updateMeasurement);
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`group/marquee relative min-w-0 overflow-hidden whitespace-nowrap ${className}`}
      style={
        state.isOverflowing
          ? {
              maskImage: 'linear-gradient(to right, black calc(100% - 14px), transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 14px), transparent 100%)',
              ['--max-scroll' as string]: `-${state.maxScroll}px`,
              ['--marquee-duration' as string]: `${state.duration}s`,
            }
          : undefined
      }
      title={state.isOverflowing ? text : undefined}
    >
      {/* Hidden unclipped span used solely for deterministic width measurement */}
      <span
        ref={measureRef}
        className="absolute opacity-0 pointer-events-none select-none left-0 top-0 whitespace-nowrap"
        aria-hidden="true"
        translate={translateNo ? 'no' : undefined}
      >
        {text}
      </span>

      <span
        className={
          state.isOverflowing
            ? 'inline-block shrink-0 animate-marquee-pingpong group-hover/marquee:[animation-play-state:paused]'
            : 'block truncate'
        }
        translate={translateNo ? 'no' : undefined}
      >
        {text}
      </span>
    </div>
  );
}
