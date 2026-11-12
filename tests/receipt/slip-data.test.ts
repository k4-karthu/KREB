import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { computePureQuote } from '@/domain/pricing/pricing';
import { slipFromQuote } from '@/ui/components/receipt/adapters';
import {
  ALL_SLIP_FIXTURES,
  bookingWithCancelDeadline,
  handoverInLateAndFuelShortfall,
  handoverOutWith3DamageMarks,
  invoiceWithCreditNote,
  quote1DayEvPercent,
  quote2DayHatchback,
  quote3DaySuvAllLines,
  quote30Day,
  quoteLongVehicleName,
} from '@/ui/components/receipt/fixtures';

const FORBIDDEN_GROCERY_WORDS = [
  'grocery',
  'groceries',
  'supermarket',
  'basket',
  'aisle',
  'produce',
  'milk',
  'bread',
  'eggs',
  'apples',
  'bananas',
  'cashier',
  'shopping bag',
  'shopping cart',
  'items in bag',
  'loyalty',
  'coupon',
  'gratuity',
  'merchandise',
  'change due',
  'pro plan',
  'annual subscription',
  'launch10',
];

describe('Receipt SlipData contract & fixtures', () => {
  const entries = Object.entries(ALL_SLIP_FIXTURES);

  it('provides all 9 required fixtures covering all 5 SlipKind modes', () => {
    expect(entries).toHaveLength(9);
    const kinds = new Set(entries.map(([, slip]) => slip.kind));
    expect(kinds).toEqual(new Set(['quote', 'booking', 'handover_out', 'handover_in', 'invoice']));
  });

  it.each(entries)('%s: lines sum strictly to totalMinor', (_name, slip) => {
    const sum = slip.lines.reduce((acc, line) => acc + line.amountMinor, 0);
    expect(sum).toBe(slip.totalMinor);
    expect(Number.isSafeInteger(slip.totalMinor)).toBe(true);
  });

  it('validates domain-specific properties on each of the 9 fixtures', () => {
    expect(quote2DayHatchback.billableDays).toBe(2);
    expect(quote2DayHatchback.kind).toBe('quote');

    const suvLineKinds = new Set(quote3DaySuvAllLines.lines.map((l) => l.kind));
    expect(suvLineKinds).toEqual(
      new Set(['base', 'rule', 'tier_discount', 'addon', 'protection', 'fee', 'promo', 'tax']),
    );

    expect(quote1DayEvPercent.billableDays).toBe(1);
    expect(quote1DayEvPercent.meta.some((m) => m.value.includes('%'))).toBe(true);

    expect(bookingWithCancelDeadline.kind).toBe('booking');
    expect(bookingWithCancelDeadline.cancelDeadlineAt).toBeTypeOf('number');

    expect(handoverOutWith3DamageMarks.kind).toBe('handover_out');
    expect(handoverOutWith3DamageMarks.inspection?.damageMarks).toHaveLength(3);

    expect(handoverInLateAndFuelShortfall.kind).toBe('handover_in');
    expect(handoverInLateAndFuelShortfall.lines.some((l) => /late/i.test(l.label))).toBe(true);
    expect(handoverInLateAndFuelShortfall.lines.some((l) => /fuel/i.test(l.label))).toBe(true);
    expect(handoverInLateAndFuelShortfall.totalMinor).toBeGreaterThan(0);

    expect(invoiceWithCreditNote.kind).toBe('invoice');
    expect(invoiceWithCreditNote.isCreditNote).toBe(true);
    expect(invoiceWithCreditNote.totalMinor).toBeLessThan(0);

    expect(quoteLongVehicleName.vehicleName.length).toBeGreaterThanOrEqual(40);

    expect(quote30Day.billableDays).toBe(30);
  });

  it('contains zero grocery or SaaS-template words in any fixture', () => {
    for (const [name, slip] of entries) {
      const serialized = JSON.stringify(slip).toLowerCase();
      for (const word of FORBIDDEN_GROCERY_WORDS) {
        expect(serialized, `${name} must not contain "${word}"`).not.toContain(word);
      }
    }
  });

  it('contains zero grocery or SaaS-template words in receipt types/adapters/fixtures source', () => {
    const files = [
      path.resolve('src/ui/components/receipt/types.ts'),
      path.resolve('src/ui/components/receipt/adapters.ts'),
      path.resolve('src/ui/components/receipt/fixtures/index.ts'),
    ];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8').toLowerCase();
      for (const word of FORBIDDEN_GROCERY_WORDS) {
        expect(content, `${path.basename(file)} must not contain "${word}"`).not.toContain(word);
      }
    }
  });

  it('slipFromQuote preserves exact sum invariant with computePureQuote output', () => {
    const startAt = Date.UTC(2026, 10, 20, 4, 30, 0);
    const endAt = startAt + 4 * 86_400_000;
    const quote = computePureQuote({
      vehicleCategory: 'sedan',
      baseDailyMinor: 280_000,
      depositMinor: 500_000,
      branchTimezone: 'Asia/Kolkata',
      startAt,
      endAt,
      rateTiers: [{ fromDays: 3, discountBp: 1000 }],
      pricingRules: [],
      addons: [{ id: 1, name: 'GPS Nav', priceType: 'per_day', priceMinor: 15_000, quantity: 1 }],
      protection: { id: 1, name: 'Standard Cover', perDayMinor: 20_000, excessMinor: 500_000 },
      oneWayFeeMinor: 50_000,
    });
    const slip = slipFromQuote({
      referenceCode: 'QT-PURE-01',
      quote,
      vehicleName: 'Honda City V',
      branchPickup: 'Indiranagar Hub',
      branchReturn: 'Whitefield Hub',
      startAt,
      endAt,
    });
    const sum = slip.lines.reduce((acc, line) => acc + line.amountMinor, 0);
    expect(sum).toBe(slip.totalMinor);
    expect(slip.totalMinor).toBe(quote.totalMinor);
  });
});
