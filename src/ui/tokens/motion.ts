/**
 * v3 Part 1 §9.2 — Motion tokens
 *
 * Usage with the `motion` package:
 *   import { DUR, EASE, SPRING } from '@/ui/tokens/motion';
 *   <motion.div transition={{ duration: DUR.base / 1000, ease: EASE.out }} />
 *   <motion.div transition={{ type: 'spring', ...SPRING.ui }} />
 */

/** Duration tokens (milliseconds) */
export const DUR = {
  /** 100 ms — micro: toggle, checkbox, switch */
  instant: 100,
  /** 160 ms — fast: tooltip, badge, chip reveal */
  fast: 160,
  /** 260 ms — base: drawer enter, modal, page element */
  base: 260,
  /** 420 ms — slow: overlay backdrop, full-page transition */
  slow: 420,
  /** 800 ms — hero: hero illustration, marketing entrance */
  hero: 800,
} as const;

export type DurKey = keyof typeof DUR;

/**
 * Bezier easing arrays — compatible with Framer Motion / motion `ease` prop
 * and CSS `cubic-bezier(...)`.
 */
export const EASE = {
  /** [0.16, 1, 0.3, 1] — snappy decelerate; most enters & reveals */
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
  /** [0.65, 0, 0.35, 1] — balanced; value changes, toggles */
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
} as const;

/**
 * Spring presets — pass as `transition={{ type: 'spring', ...SPRING.ui }}`.
 * Compatible with `motion` (Framer Motion).
 */
export const SPRING = {
  /** Crisp interactive UI: buttons, menus, dropdowns */
  ui: { stiffness: 420, damping: 34, mass: 0.9 },
  /** Gentle content: cards, drawers, modals */
  soft: { stiffness: 220, damping: 28 },
  /** Kinetic drag & reorder */
  drag: { stiffness: 520, damping: 40 },
} as const;

export type SpringKey = keyof typeof SPRING;

/**
 * CSS custom property strings for use in vanilla CSS or theme.css.
 * e.g.  transition: transform var(--dur-base) var(--ease-out);
 */
export const CSS_DUR = {
  instant: 'var(--dur-instant, 100ms)',
  fast: 'var(--dur-fast, 160ms)',
  base: 'var(--dur-base, 260ms)',
  slow: 'var(--dur-slow, 420ms)',
  hero: 'var(--dur-hero, 800ms)',
} as const;

export const CSS_EASE = {
  out: 'var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))',
  inOut: 'var(--ease-in-out, cubic-bezier(0.65, 0, 0.35, 1))',
} as const;
