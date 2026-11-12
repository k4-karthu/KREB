'use client';

import { m } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import { useReducedMotionSafe } from '../../motion/MotionProvider';

export interface LightSweepProps {
  children?: ReactNode;
  active?: boolean;
  maskImageUrl?: string | null;
  className?: string;
  intensity?: 'subtle' | 'vivid';
  triggerKey?: string | number;
  reducedMotion?: boolean;
}

/**
 * v3 Part 3 §8 / §Part3 §11 R5 — LightSweep
 *
 * The ONE allowed gradient in the application: a subtle light sweep mask
 * on car alpha silhouette. Slop check explicitly allows this file
 * for gradients (Rule 1 & Rule R5).
 *
 * Subtle animated shine across car surface.
 */
const SWEEP_GRADIENT =
  'linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.05) 38%, rgba(255, 255, 255, 0.30) 50%, rgba(255, 255, 255, 0.05) 62%, transparent 80%)';

export function LightSweep({
  children,
  active = true,
  maskImageUrl,
  className = '',
  intensity = 'subtle',
  triggerKey,
  reducedMotion: forcedReduced = false,
}: LightSweepProps) {
  const osReduced = useReducedMotionSafe();
  const shouldReduce = forcedReduced || osReduced;

  const maskStyles: CSSProperties = maskImageUrl
    ? {
        maskImage: `url(${maskImageUrl})`,
        WebkitMaskImage: `url(${maskImageUrl})`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }
    : {};

  if (!children) {
    if (shouldReduce || !active) return null;
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()}
        style={maskStyles}
        data-testid="light-sweep-overlay"
      >
        <m.div
          key={triggerKey ?? 'sweep'}
          className="pointer-events-none absolute inset-y-0 w-full"
          style={{
            background: SWEEP_GRADIENT,
            opacity: intensity === 'vivid' ? 0.9 : 0.65,
            mixBlendMode: 'overlay',
            transform: 'skewX(-20deg)',
          }}
          initial={{ x: '-130%' }}
          animate={{ x: ['-130%', '160%'] }}
          transition={{
            duration: 1.4,
            ease: [0.16, 1, 0.3, 1],
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 3.5,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`.trim()}
      data-testid="light-sweep-container"
    >
      {children}
      {!shouldReduce && active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={maskStyles}
          data-testid="light-sweep-overlay"
        >
          <m.div
            key={triggerKey ?? 'sweep'}
            className="pointer-events-none absolute inset-y-0 w-full"
            style={{
              background: SWEEP_GRADIENT,
              opacity: intensity === 'vivid' ? 0.9 : 0.65,
              mixBlendMode: 'overlay',
              transform: 'skewX(-20deg)',
            }}
            initial={{ x: '-130%' }}
            animate={{ x: ['-130%', '160%'] }}
            transition={{
              duration: 1.4,
              ease: [0.16, 1, 0.3, 1],
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 3.5,
            }}
          />
        </div>
      )}
    </div>
  );
}
