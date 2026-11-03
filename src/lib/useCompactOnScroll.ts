import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface UseCompactOnScrollOptions {
  expandThreshold?: number; // threshold to expand back (default 20)
  collapseThreshold?: number; // threshold to collapse into compact (default 60)
  resetDeps?: React.DependencyList;
}

/**
 * Hook to manage scroll-driven compact UI transitions with hysteresis.
 * - Expands back to full mode only when scrolled near the top (y <= expandThreshold)
 * - Collapses to compact mode only when scrolled past collapseThreshold
 * - Automatically resets scroll position and compact state when specified dependencies change
 */
export function useCompactOnScroll(options: UseCompactOnScrollOptions = {}) {
  const { expandThreshold = 20, collapseThreshold = 60, resetDeps = [] } = options;
  const [isCompact, setIsCompact] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const y = e.currentTarget.scrollTop;
      setIsCompact(prev => (prev ? y > expandThreshold : y > collapseThreshold));
    },
    [expandThreshold, collapseThreshold]
  );

  const resetScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    setIsCompact(false);
  }, []);

  useEffect(() => {
    resetScroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  return {
    isCompact,
    setIsCompact,
    scrollContainerRef,
    handleScroll,
    resetScroll
  };
}
