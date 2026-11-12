export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexToRgb(hexA));
  const l2 = relativeLuminance(hexToRgb(hexB));
  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (bright + 0.05) / (dark + 0.05);
}

export function mixHex(hexA: string, hexB: string, weightA: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightA));
  return rgbToHex({
    r: a.r * w + b.r * (1 - w),
    g: a.g * w + b.g * (1 - w),
    b: a.b * w + b.b * (1 - w),
  });
}

/**
 * Derives accessible vehicle paint tokens (§11.4):
 * - `--paint`: softened slightly toward slate if neon-saturated
 * - `--paint-ink`: dark petrol or white guaranteeing >= 4.5:1 against `--paint`
 * - `--paint-tint`: 12% mix over sheet surface (readable with petrol-800 ink >= 4.5:1)
 */
export function derivePaintTokens(paintHex: string, sheetHex = '#F8F9F6') {
  const rgb = hexToRgb(paintHex);
  const maxC = Math.max(rgb.r, rgb.g, rgb.b);
  const minC = Math.min(rgb.r, rgb.g, rgb.b);
  const saturationProxy = maxC === 0 ? 0 : (maxC - minC) / maxC;
  // Clamp extreme neon chroma by mixing 20% with neutral slate when overly saturated
  const clamped =
    saturationProxy > 0.78 ? mixHex(paintHex, '#56635F', 0.8) : paintHex.toUpperCase();

  const darkInk = '#081A20';
  const lightInk = '#FFFFFF';
  const darkRatio = contrastRatio(clamped, darkInk);
  const lightRatio = contrastRatio(clamped, lightInk);
  const paintInk = darkRatio >= lightRatio ? darkInk : lightInk;

  const paintTint = mixHex(clamped, sheetHex, 0.12);

  return {
    paint: clamped,
    paintInk,
    paintTint,
  };
}
