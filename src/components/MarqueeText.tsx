/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  translateNo?: boolean;
}

export default function MarqueeText({ text, className = '', translateNo = false }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [maxScroll, setMaxScroll] = useState(0);
  const [duration, setDuration] = useState(8);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const textWidth = textRef.current.scrollWidth;
        const containerWidth = containerRef.current.clientWidth;
        const diff = textWidth - containerWidth;
        if (diff > 4) {
          setIsOverflowing(true);
          const scrollDist = Math.ceil(diff + 12);
          setMaxScroll(scrollDist);
          // Relaxed timing: base 8 seconds + 1s per 25px overflow distance
          const calcDuration = Math.max(7, Math.min(18, 7.5 + scrollDist / 25));
          setDuration(calcDuration);
        } else {
          setIsOverflowing(false);
        }
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 120);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  if (!isOverflowing) {
    return (
      <div ref={containerRef} className={`min-w-0 overflow-hidden ${className}`}>
        <span 
          ref={textRef} 
          className="block truncate" 
          translate={translateNo ? "no" : undefined}
        >
          {text}
        </span>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`group/marquee relative min-w-0 overflow-hidden whitespace-nowrap ${className}`}
      style={{
        maskImage: 'linear-gradient(to right, black calc(100% - 14px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black calc(100% - 14px), transparent 100%)',
        ['--max-scroll' as string]: `-${maxScroll}px`,
        ['--marquee-duration' as string]: `${duration}s`,
      }}
      title={text}
    >
      {/* Invisible measurement element to reliably get unclipped scrollWidth */}
      <span 
        ref={textRef} 
        className="absolute opacity-0 pointer-events-none select-none left-0 top-0 whitespace-nowrap"
        aria-hidden="true"
        translate={translateNo ? "no" : undefined}
      >
        {text}
      </span>
      <span 
        className="inline-block shrink-0 animate-marquee-pingpong group-hover/marquee:[animation-play-state:paused]"
        translate={translateNo ? "no" : undefined}
      >
        {text}
      </span>
    </div>
  );
}
