'use client';

import { m } from 'motion/react';
import { useReducedMotionSafe } from './MotionProvider';
import { MOTION_DURATION, MOTION_EASE } from './tokens';

/**
 * Confirmation-only plate stamp-in (scale 1.06 -> 1, 280ms, once) (§11.8).
 */
export function PlateStamp({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotionSafe();

  if (reduced) {
    return <div>{children}</div>;
  }

  return (
    <m.div
      initial={{ scale: 1.06, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: MOTION_DURATION.base, ease: MOTION_EASE.out }}
    >
      {children}
    </m.div>
  );
}
