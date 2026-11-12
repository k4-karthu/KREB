/**
 * v3 Part 1 §5.3 — Type scale metadata
 *
 * Display: Bricolage Grotesque  |  UI/Body: Albert Sans  |  Plate: Archivo condensed
 * Receipt: IBM Plex Mono / Courier Prime
 *
 * Each step: { size, lineHeight, weight, tracking } — size/lineHeight in px.
 */

export interface TypeStep {
  /** CSS font-size in px */
  size: number;
  /** CSS line-height in px */
  lineHeight: number;
  /** CSS font-weight (numeric) */
  weight: 400 | 500 | 600 | 650 | 700;
  /** CSS letter-spacing (em string, e.g. "-0.02em" or "0") */
  tracking: string;
  /** Which family bucket this step belongs to */
  family: 'display' | 'ui' | 'mono';
}

export const TYPE_SCALE = {
  'display-xl': { size: 76, lineHeight: 76, weight: 700, tracking: '-0.02em',  family: 'display' },
  'display-l':  { size: 61, lineHeight: 64, weight: 700, tracking: '-0.015em', family: 'display' },
  'display-m':  { size: 55, lineHeight: 60, weight: 700, tracking: '-0.012em', family: 'display' },
  'display-s':  { size: 49, lineHeight: 54, weight: 650, tracking: '-0.01em',  family: 'display' },
  h1:           { size: 39, lineHeight: 44, weight: 650, tracking: '-0.005em', family: 'display' },
  h2:           { size: 31, lineHeight: 38, weight: 600, tracking: '0',        family: 'display' },
  h3:           { size: 25, lineHeight: 32, weight: 600, tracking: '0',        family: 'display' },
  h4:           { size: 20, lineHeight: 28, weight: 600, tracking: '0',        family: 'ui'      },
  'body-l':     { size: 18, lineHeight: 30, weight: 400, tracking: '0',        family: 'ui'      },
  'body-m':     { size: 16, lineHeight: 26, weight: 400, tracking: '0',        family: 'ui'      },
  body:         { size: 16, lineHeight: 26, weight: 400, tracking: '0',        family: 'ui'      },
  'body-s':     { size: 14, lineHeight: 22, weight: 400, tracking: '0',        family: 'ui'      },
  'label-l':    { size: 16, lineHeight: 24, weight: 500, tracking: '0',        family: 'ui'      },
  'label-m':    { size: 14, lineHeight: 20, weight: 500, tracking: '0',        family: 'ui'      },
  'label-s':    { size: 12, lineHeight: 16, weight: 500, tracking: '+0.005em', family: 'ui'      },
  caption:      { size: 13, lineHeight: 18, weight: 500, tracking: '+0.005em', family: 'ui'      },
  'price-xl':   { size: 49, lineHeight: 49, weight: 650, tracking: '-0.01em',  family: 'ui'      },
  'price-l':    { size: 31, lineHeight: 34, weight: 650, tracking: '-0.005em', family: 'ui'      },
  'price-m':    { size: 20, lineHeight: 24, weight: 600, tracking: '0',        family: 'ui'      },
} as const satisfies Record<string, TypeStep>;

export type TypeStepKey = keyof typeof TYPE_SCALE;

/** Font family stacks per bucket */
export const FONT_STACKS = {
  display: '"Bricolage Grotesque Variable", "Bricolage Grotesque", sans-serif',
  ui:      '"Albert Sans Variable", "Albert Sans", sans-serif',
  body:    '"Albert Sans Variable", "Albert Sans", sans-serif',
  mono:    '"IBM Plex Mono", "Courier Prime", monospace',
  plate:   '"Archivo Variable", "Archivo", sans-serif',
} as const;
