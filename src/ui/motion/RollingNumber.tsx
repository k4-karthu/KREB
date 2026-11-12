'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotionSafe } from './MotionProvider';

interface RollingNumberProps {
  value: number;
  format: (n: number) => string;
  className?: string;
}

/**
 * Rolls smoothly between integer minor-unit values over 200ms (§11.8).
 * Honours prefers-reduced-motion by snapping immediately.
 */
export function RollingNumber({ value, format, className = '' }: RollingNumberProps) {
  const reduced = useReducedMotionSafe();
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (reduced || prevRef.current === value) {
      prevRef.current = value;
      setDisplay(value);
      return;
    }

    const from = prevRef.current;
    const to = value;
    const duration = 200;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      prevRef.current = to;
    };
  }, [value, reduced]);

  return <span className={`tabular-nums ${className}`.trim()}>{format(display)}</span>;
}
