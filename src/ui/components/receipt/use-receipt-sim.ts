'use client';

import { useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  createInitialSimState,
  type SimConfig,
  type SimEvent,
  type SimState,
  simReducer,
} from './receipt-sim';

export interface UseReceiptSimReturn {
  state: SimState;
  dispatch: (event: SimEvent) => void;
  print: () => void;
  skip: () => void;
  tear: () => void;
  reset: () => void;
}

export function useReceiptSim(
  config: Omit<SimConfig, 'reducedMotion'> & { autoPrint?: boolean } = {},
): UseReceiptSimReturn {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);

  const [state, rawDispatch] = useReducer(
    (prev: SimState, event: SimEvent) => simReducer(prev, event, Date.now()),
    {
      lineCount: config.lineCount,
      paperHeightPx: config.paperHeightPx,
      reducedMotion,
    },
    createInitialSimState,
  );

  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const isActive =
      state.phase === 'feeding' || state.phase === 'shaking' || state.phase === 'tearing';

    if (!isActive) {
      lastTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const step = (now: number) => {
      const prev = lastTimeRef.current ?? now;
      const dtMs = Math.min(50, Math.max(0, now - prev));
      lastTimeRef.current = now;
      rawDispatch({ type: 'TICK', dtMs });
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state.phase]);

  useEffect(() => {
    if (config.autoPrint && state.phase === 'idle') {
      rawDispatch({ type: 'PRINT' });
    }
  }, [config.autoPrint, state.phase]);

  const dispatch = useCallback((event: SimEvent) => rawDispatch(event), []);
  const print = useCallback(() => rawDispatch({ type: 'PRINT' }), []);
  const skip = useCallback(() => rawDispatch({ type: 'SKIP' }), []);
  const tear = useCallback(() => rawDispatch({ type: 'TEAR' }), []);
  const reset = useCallback(() => rawDispatch({ type: 'RESET' }), []);

  return { state, dispatch, print, skip, tear, reset };
}
