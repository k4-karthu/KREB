/*
 * Pure deterministic thermal receipt simulation state machine.
 * Stepper-motor quantisation & damped settle math adapted from
 * aqkprogrammer/receipt-printer (MIT License, Copyright (c) 2026 Abdul Qadir Khan).
 */

export type SimPhase = 'idle' | 'feeding' | 'shaking' | 'ready' | 'tearing' | 'torn';

export type SimEvent =
  | { type: 'PRINT' }
  | { type: 'SKIP' }
  | { type: 'TEAR' }
  | { type: 'RESET' }
  | { type: 'TICK'; dtMs: number };

export interface SimConfig {
  lineCount?: number;
  paperHeightPx?: number;
  reducedMotion?: boolean;
}

export interface SimState {
  phase: SimPhase;
  feedProgress: number; // 0-1
  printProgress: number; // 0-1
  shakeIntensity: number; // 0-1
  paperY: number; // px offset of paper from machine slot
  tornAt: number | null; // timestamp when torn
  elapsedMs: number;
  totalPrintMs: number;
  lineCount: number;
  paperHeightPx: number;
  reducedMotion: boolean;
  feedDurationMs: number;
  shakeDurationMs: number;
  tearDurationMs: number;
}

export const MAX_PRINT_DURATION_MS = 2400;
const STEP_PX = 3;
const DEFAULT_PAPER_HEIGHT_PX = 420;
const SHAKE_DURATION_MS = 450;
const TEAR_DURATION_MS = 350;

function easeOutThermal(t: number): number {
  return 1 - (1 - t) ** 2.2;
}

export function createInitialSimState(config: SimConfig = {}): SimState {
  const lineCount = Math.max(1, config.lineCount ?? 12);
  const paperHeightPx = Math.max(120, config.paperHeightPx ?? DEFAULT_PAPER_HEIGHT_PX);
  const reducedMotion = Boolean(config.reducedMotion);

  // Cap feed + shake at <= 2400ms regardless of slip length (e.g. 300-line slip).
  const maxFeedMs = MAX_PRINT_DURATION_MS - SHAKE_DURATION_MS;
  const feedDurationMs = Math.min(maxFeedMs, Math.max(700, 600 + lineCount * 20));

  return {
    phase: 'idle',
    feedProgress: 0,
    printProgress: 0,
    shakeIntensity: 0,
    paperY: 0,
    tornAt: null,
    elapsedMs: 0,
    totalPrintMs: 0,
    lineCount,
    paperHeightPx,
    reducedMotion,
    feedDurationMs,
    shakeDurationMs: SHAKE_DURATION_MS,
    tearDurationMs: TEAR_DURATION_MS,
  };
}

export function simReducer(state: SimState, event: SimEvent, nowMs = Date.now()): SimState {
  switch (event.type) {
    case 'RESET': {
      return createInitialSimState({
        lineCount: state.lineCount,
        paperHeightPx: state.paperHeightPx,
        reducedMotion: state.reducedMotion,
      });
    }

    case 'PRINT': {
      if (state.reducedMotion) {
        return {
          ...state,
          phase: 'ready',
          feedProgress: 1,
          printProgress: 1,
          shakeIntensity: 0,
          paperY: state.paperHeightPx,
          tornAt: null,
          elapsedMs: 0,
          totalPrintMs: 0,
        };
      }
      return {
        ...state,
        phase: 'feeding',
        feedProgress: 0,
        printProgress: 0,
        shakeIntensity: 0,
        paperY: 0,
        tornAt: null,
        elapsedMs: 0,
        totalPrintMs: 0,
      };
    }

    case 'SKIP': {
      if (state.phase === 'idle' || state.phase === 'torn') return state;
      return {
        ...state,
        phase: 'ready',
        feedProgress: 1,
        printProgress: 1,
        shakeIntensity: 0,
        paperY: state.paperHeightPx,
        elapsedMs: 0,
      };
    }

    case 'TEAR': {
      if (state.phase === 'idle' || state.phase === 'torn') return state;
      if (state.reducedMotion) {
        return {
          ...state,
          phase: 'torn',
          feedProgress: 1,
          printProgress: 1,
          shakeIntensity: 0,
          paperY: state.paperHeightPx + 140,
          tornAt: nowMs,
          elapsedMs: 0,
        };
      }
      return {
        ...state,
        phase: 'tearing',
        feedProgress: 1,
        printProgress: 1,
        shakeIntensity: 0,
        paperY: state.paperHeightPx,
        elapsedMs: 0,
      };
    }

    case 'TICK': {
      const dt = Math.max(0, event.dtMs);

      if (state.phase === 'feeding') {
        const nextElapsed = state.elapsedMs + dt;
        const nextTotal = Math.min(MAX_PRINT_DURATION_MS, state.totalPrintMs + dt);
        const t = Math.min(nextElapsed / state.feedDurationMs, 1);
        const eased = easeOutThermal(t);
        const quantisedPx = Math.min(
          state.paperHeightPx,
          Math.round((eased * state.paperHeightPx) / STEP_PX) * STEP_PX,
        );
        const feedProgress = Math.min(1, quantisedPx / state.paperHeightPx);

        if (t >= 1) {
          return {
            ...state,
            phase: 'shaking',
            feedProgress: 1,
            printProgress: 1,
            shakeIntensity: 1,
            paperY: state.paperHeightPx,
            elapsedMs: 0,
            totalPrintMs: nextTotal,
          };
        }

        return {
          ...state,
          feedProgress,
          printProgress: t,
          shakeIntensity: 0.15 * (1 - t),
          paperY: quantisedPx,
          elapsedMs: nextElapsed,
          totalPrintMs: nextTotal,
        };
      }

      if (state.phase === 'shaking') {
        const nextElapsed = state.elapsedMs + dt;
        const nextTotal = Math.min(MAX_PRINT_DURATION_MS, state.totalPrintMs + dt);
        const t = Math.min(nextElapsed / state.shakeDurationMs, 1);
        const sec = nextElapsed / 1000;
        const shakeIntensity =
          t >= 1 ? 0 : Math.min(1, Math.exp(-sec * 4.2) * Math.abs(Math.sin(sec * 15)));

        if (t >= 1) {
          return {
            ...state,
            phase: 'ready',
            shakeIntensity: 0,
            elapsedMs: 0,
            totalPrintMs: nextTotal,
          };
        }

        return {
          ...state,
          shakeIntensity,
          elapsedMs: nextElapsed,
          totalPrintMs: nextTotal,
        };
      }

      if (state.phase === 'tearing') {
        const nextElapsed = state.elapsedMs + dt;
        const t = Math.min(nextElapsed / state.tearDurationMs, 1);

        if (t >= 1) {
          return {
            ...state,
            phase: 'torn',
            paperY: state.paperHeightPx + 140,
            tornAt: nowMs,
            elapsedMs: 0,
          };
        }

        return {
          ...state,
          paperY: state.paperHeightPx + Math.round(t * 140),
          elapsedMs: nextElapsed,
        };
      }

      return state;
    }
  }
}
