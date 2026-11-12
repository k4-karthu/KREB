export const MOTION_DURATION = {
  instant: 0.1,
  fast: 0.18,
  base: 0.28,
  slow: 0.48,
  moment: 0.9,
} as const;

export const MOTION_EASE = {
  out: [0.2, 0.8, 0.2, 1] as const,
  inOut: [0.6, 0, 0.2, 1] as const,
};

export const SPRING_LAYOUT = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.9,
};

export const SPRING_DRAG = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 40,
};
