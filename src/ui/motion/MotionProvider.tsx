'use client';

import { domAnimation, LazyMotion, MotionConfig, useReducedMotion } from 'motion/react';
import { createContext, useContext, useState } from 'react';

interface ReducedMotionOverrideCtx {
  forcedReduced: boolean;
  setForcedReduced: (v: boolean) => void;
}

const ReducedCtx = createContext<ReducedMotionOverrideCtx>({
  forcedReduced: false,
  setForcedReduced: () => {},
});

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [forcedReduced, setForcedReduced] = useState(false);

  return (
    <ReducedCtx.Provider value={{ forcedReduced, setForcedReduced }}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion={forcedReduced ? 'always' : 'user'}>{children}</MotionConfig>
      </LazyMotion>
    </ReducedCtx.Provider>
  );
}

export function useReducedMotionSafe(): boolean {
  const osReduced = useReducedMotion();
  const { forcedReduced } = useContext(ReducedCtx);
  return Boolean(osReduced || forcedReduced);
}

export function useReducedMotionToggle() {
  return useContext(ReducedCtx);
}
