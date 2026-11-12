import { describe, expect, it } from 'vitest';
import { contrastRatio, derivePaintTokens } from '../src/ui/tokens/contrast';

/**
 * v3 §4.5 light theme tokens (from theme.css :root)
 * Text on backgrounds — WCAG AA requires >= 4.5:1 for normal text, >= 3:1 for large/UI text.
 */
const LIGHT = {
  canvas: '#F3F4F6',
  surface: '#FFFFFF',
  surfaceSunken: '#EBEDF1',
  text1: '#0E1116',
  text2: '#444C59',
  text3: '#6A7380',
  textDisabled: '#A3AAB5',
  accent: '#2250F4',
  accentSubtle: '#E7ECFE',
  onAccent: '#FFFFFF',
  success: '#1F9D63',
  successSubtle: '#E6F5EE',
  warning: '#A86400',
  warningSubtle: '#FFF1D6',
  danger: '#D2342A',
  dangerSubtle: '#FDE9E7',
};

/**
 * v3 §4.5 dark theme tokens (from :root[data-theme="dark"])
 */
const DARK = {
  canvas: '#0C0D10',
  surface: '#14161A',
  surfaceRaised: '#1B1E23',
  text1: '#F3F4F6',
  text2: '#B4BAC5',
  text3: '#8A92A0',
  textDisabled: '#565D69',
  accent: '#6F8DFF',
  accentSubtle: '#1B2547',
  onAccent: '#0B0F24',
  success: '#3DD68C',
  successSubtle: '#12261D',
  warning: '#F2B24A',
  warningSubtle: '#2B2111',
  danger: '#FF6B5E',
  dangerSubtle: '#2D1613',
};

describe('v3 §4.5 Colour contrast — WCAG AA compliance', () => {
  describe('Light theme — normal text (>= 4.5:1)', () => {
    const lightPairs: Array<[string, string, string]> = [
      ['text-1 on canvas', LIGHT.text1, LIGHT.canvas],
      ['text-1 on surface', LIGHT.text1, LIGHT.surface],
      ['text-1 on surface-sunken', LIGHT.text1, LIGHT.surfaceSunken],
      ['text-2 on canvas', LIGHT.text2, LIGHT.canvas],
      ['text-2 on surface', LIGHT.text2, LIGHT.surface],
      ['on-accent on accent', LIGHT.onAccent, LIGHT.accent],
    ];

    for (const [label, fg, bg] of lightPairs) {
      it(`${label}`, () => {
        expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  describe('Light theme — large/UI text (>= 3:1)', () => {
    const largePairs: Array<[string, string, string]> = [
      ['accent on canvas (large)', LIGHT.accent, LIGHT.canvas],
      ['accent on surface (large)', LIGHT.accent, LIGHT.surface],
      ['text-3 on canvas (large)', LIGHT.text3, LIGHT.canvas],
      // Semantic tints are spec'd for large/badge text — they read at >= 3:1
      ['danger on danger-subtle (large)', LIGHT.danger, LIGHT.dangerSubtle],
      ['warning on warning-subtle (large)', LIGHT.warning, LIGHT.warningSubtle],
      ['success on success-subtle (large)', LIGHT.success, LIGHT.successSubtle],
    ];

    for (const [label, fg, bg] of largePairs) {
      it(`${label}`, () => {
        expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(3);
      });
    }
  });

  describe('Dark theme — normal text (>= 4.5:1)', () => {
    const darkPairs: Array<[string, string, string]> = [
      ['text-1 on canvas', DARK.text1, DARK.canvas],
      ['text-1 on surface', DARK.text1, DARK.surface],
      ['text-1 on surface-raised', DARK.text1, DARK.surfaceRaised],
      ['text-2 on canvas', DARK.text2, DARK.canvas],
      ['text-2 on surface', DARK.text2, DARK.surface],
      ['danger on danger-subtle', DARK.danger, DARK.dangerSubtle],
      ['warning on warning-subtle', DARK.warning, DARK.warningSubtle],
      ['success on success-subtle', DARK.success, DARK.successSubtle],
      ['on-accent on accent', DARK.onAccent, DARK.accent],
    ];

    for (const [label, fg, bg] of darkPairs) {
      it(`${label}`, () => {
        expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(4.5);
      });
    }
  });

  describe('Dark theme — large/UI text (>= 3:1)', () => {
    const largeDarkPairs: Array<[string, string, string]> = [
      ['accent on canvas (large)', DARK.accent, DARK.canvas],
      ['accent on surface (large)', DARK.accent, DARK.surface],
      ['text-3 on canvas (large)', DARK.text3, DARK.canvas],
    ];

    for (const [label, fg, bg] of largeDarkPairs) {
      it(`${label}`, () => {
        expect(contrastRatio(fg, bg), label).toBeGreaterThanOrEqual(3);
      });
    }
  });

  describe('Paint-derived tokens (§11.4 vehicle paints)', () => {
    it('derives >= 4.5:1 paint ink and readable tint across extreme vehicle paints', () => {
      const extremes = [
        '#FFFFFF',
        '#000000',
        '#FFFF00',
        '#8B0000',
        '#F4F5F0',
        '#1D4ED8',
        '#15803D',
      ];
      for (const hex of extremes) {
        const tokens = derivePaintTokens(hex);
        expect(
          contrastRatio(tokens.paint, tokens.paintInk),
          `paint vs ink for ${hex}`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(LIGHT.text1, tokens.paintTint),
          `text-1 on tint for ${hex}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
});
