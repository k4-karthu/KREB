/*
 * Thermal receipt constants & deterministic barcode/QR helpers.
 * Seeded LCG barcode algorithm adapted from aqkprogrammer/receipt-printer
 * (MIT License, Copyright (c) 2026 Abdul Qadir Khan).
 */

export const PAPER_BG = '#FBFBF9';
export const PAPER_INK = '#14161A';
export const RECEIPT_MAX_WIDTH = 320;
export const RECEIPT_TOOTH_PX = 9;

export interface BarcodeBar {
  x: number;
  width: number;
}

/**
 * Generates deterministic Code-128-style vertical bar positions from a seed string.
 */
export function generateBarcodeBars(codeSeed: string, targetWidth = 260): BarcodeBar[] {
  let seed = [...codeSeed].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const gap = 2;
  const bars: BarcodeBar[] = [];
  let used = 0;
  while (used < targetWidth - 4) {
    const width = 1 + Math.floor(rand() * 3);
    bars.push({ x: used, width });
    used += width + gap;
  }
  return bars;
}

/**
 * Generates a deterministic 21x21 binary matrix for a booking reference QR placeholder.
 */
export function generateQrMatrix(seedStr: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const paintFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const row = grid[r0 + r];
        if (row) row[c0 + c] = isBorder || isCenter;
      }
    }
  };

  paintFinder(0, 0);
  paintFinder(0, size - 7);
  paintFinder(size - 7, 0);

  let seed = [...seedStr].reduce((h, ch) => (h * 33 + ch.charCodeAt(0)) >>> 0, 5381);
  for (let r = 0; r < size; r++) {
    const row = grid[r];
    if (!row) continue;
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      row[c] = (seed & 1) === 1;
    }
  }

  return grid;
}
