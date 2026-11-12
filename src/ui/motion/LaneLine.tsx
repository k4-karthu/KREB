'use client';

import { m } from 'motion/react';
import { useReducedMotionSafe } from './MotionProvider';
import { MOTION_EASE } from './tokens';

interface LaneLineProps {
  mode?: 'reveal' | 'marching' | 'static';
  className?: string;
}

/**
 * The Kerb lane-line dashed motif (§11.3, §11.7, §11.8):
 * - reveal: 600ms clip-path draw-in under the hero search
 * - marching: indeterminate loading indicator
 * - static: connector / timeline now-marker
 */
export function LaneLine({ mode = 'static', className = '' }: LaneLineProps) {
  const reduced = useReducedMotionSafe();

  const svgLine = (
    <svg
      aria-hidden="true"
      className="h-1 w-full text-amber-500"
      preserveAspectRatio="none"
      viewBox="0 0 600 4"
    >
      <line
        x1="0"
        y1="2"
        x2="600"
        y2="2"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="14 10"
        className={mode === 'marching' && !reduced ? 'kb-lane-march' : undefined}
      />
    </svg>
  );

  if (mode === 'reveal' && !reduced) {
    return (
      <m.div
        aria-hidden="true"
        initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0.4 }}
        animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
        transition={{ duration: 0.6, ease: MOTION_EASE.out }}
        className={`w-full ${className}`.trim()}
      >
        {svgLine}
      </m.div>
    );
  }

  return (
    <div aria-hidden="true" className={`w-full ${className}`.trim()}>
      {svgLine}
    </div>
  );
}
