import { describe, expect, it } from 'vitest';
import {
  applyBasisPointsHalfUp,
  computeTaxHalfUp,
  formatMoney,
  splitMoneyParts,
} from '../src/domain/shared/money';
import {
  formatBranchDateTime,
  fromBranchLocal,
  getBranchLocalDate,
  getBranchMinuteOfDay,
  getBranchWeekday,
} from '../src/domain/shared/time';

describe('money helpers (§8.2, §11.5)', () => {
  it('computes half-up basis points and tax accurately to the paisa', () => {
    // 9,966.00 INR = 996,600 paise; 18% GST = 179,388 paise (₹1,793.88)
    expect(computeTaxHalfUp(996600, 1800)).toBe(179388);
    // Half-up rounding check: 5 * 1000 / 10000 = 0.5 -> rounds to 1
    expect(applyBasisPointsHalfUp(5, 1000)).toBe(1);
    // Negative discount check
    expect(applyBasisPointsHalfUp(-924000, 1000)).toBe(-92400);
  });

  it('formats INR money and splits currency parts cleanly', () => {
    expect(formatMoney(1175988, 'INR', 'en-IN')).toContain('11,759.88');
    const parts = splitMoneyParts(280000, 'INR', 'en-IN');
    expect(parts.symbol).toBe('₹');
    expect(parts.value).toBe('2,800');
  });
});

describe('time helpers (§7.1, §8.1)', () => {
  it('converts branch-local time to UTC epoch ms and back cleanly', () => {
    // Friday 14 Nov 2025 10:00 IST (UTC+05:30)
    const ms = fromBranchLocal('2025-11-14T10:00', 'Asia/Kolkata');
    expect(getBranchLocalDate(ms, 'Asia/Kolkata')).toBe('2025-11-14');
    expect(getBranchWeekday(ms, 'Asia/Kolkata')).toBe(5); // Friday
    expect(getBranchMinuteOfDay(ms, 'Asia/Kolkata')).toBe(600);
    expect(formatBranchDateTime(ms, 'Asia/Kolkata', 'en-IN')).toContain('10:00');
  });
});
