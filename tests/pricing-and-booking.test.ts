import Database from 'better-sqlite3';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_RENTAL_SETTINGS } from '../src/config/settings';
import { runMigrations } from '../src/db/migrate';
import { computeCancellationRefund } from '../src/domain/booking/cancellation';
import { checkEligibility } from '../src/domain/eligibility/eligibility';
import {
  computePureQuote,
  signQuotePayload,
  verifyQuoteSignature,
} from '../src/domain/pricing/pricing';
import { fromBranchLocal } from '../src/domain/shared/time';

describe('pricing engine & signed quotes (§8.2)', () => {
  it('matches the worked example to the exact paisa (₹11,759.88)', () => {
    const startAt = fromBranchLocal('2026-11-13T10:00', 'Asia/Kolkata'); // Friday
    const endAt = fromBranchLocal('2026-11-16T10:00', 'Asia/Kolkata'); // Monday (3 days)

    // Sat (bit 6 = 64) and Sun (bit 0 = 1) -> mask = 65
    const result = computePureQuote({
      vehicleCategory: 'sedan',
      baseDailyMinor: 280000, // ₹2,800
      depositMinor: 1000000, // ₹10,000
      branchTimezone: 'Asia/Kolkata',
      startAt,
      endAt,
      rateTiers: [],
      pricingRules: [
        {
          id: 1,
          kind: 'weekday_multiplier',
          weekdaysMask: 65,
          startsOn: null,
          endsOn: null,
          multiplierBp: 11500, // x1.15 -> ₹3,220
          flatAddMinor: null,
          priority: 10,
          label: 'Weekend rate',
        },
      ],
      addons: [{ id: 1, name: 'Child seat', priceType: 'per_day', priceMinor: 20000, quantity: 1 }],
      protection: { id: 2, name: 'Reduced excess', perDayMinor: 35000, excessMinor: 500000 },
      promo: {
        id: 1,
        code: 'WELCOME10',
        kind: 'percent',
        value: 1000, // 10%
        minDays: 1,
        categories: null,
        maxUses: 100,
        usedCount: 0,
        perUserLimit: 1,
        userUsedCount: 0,
        validFrom: null,
        validTo: null,
        appliesTo: 'base',
        isActive: true,
      },
      settings: DEFAULT_RENTAL_SETTINGS,
    });

    expect(result.billableDays).toBe(3);
    expect(result.baseTotalMinor).toBe(924000); // 2800 + 3220 + 3220 = ₹9,240
    expect(result.discountMinor).toBe(92400); // -₹924.00
    expect(result.subtotalMinor).toBe(996600); // ₹9,966.00
    expect(result.taxMinor).toBe(179388); // ₹1,793.88
    expect(result.totalMinor).toBe(1175988); // ₹11,759.88
    expect(result.depositMinor).toBe(1000000); // ₹10,000.00 separate
  });

  it('satisfies pricing & quote signature properties across random inputs', () => {
    const startAt = fromBranchLocal('2026-12-01T10:00', 'Asia/Kolkata');

    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 2000000 }), // daily rate
        fc.integer({ min: 1, max: 20 }), // days
        fc.integer({ min: 0, max: 50000 }), // addon price
        fc.integer({ min: 0, max: 5000 }), // promo % bp
        (dailyMinor, days, addonMinor, promoBp) => {
          const endAt = startAt + days * 86_400_000;
          const q = computePureQuote({
            vehicleCategory: 'hatchback',
            baseDailyMinor: dailyMinor,
            depositMinor: 500000,
            branchTimezone: 'Asia/Kolkata',
            startAt,
            endAt,
            rateTiers: [],
            pricingRules: [],
            addons:
              addonMinor > 0
                ? [{ id: 1, name: 'GPS', priceType: 'flat', priceMinor: addonMinor, quantity: 1 }]
                : [],
            protection: null,
            promo:
              promoBp > 0
                ? {
                    id: 1,
                    code: 'TEST',
                    kind: 'percent',
                    value: promoBp,
                    minDays: 1,
                    categories: null,
                    maxUses: null,
                    usedCount: 0,
                    perUserLimit: 5,
                    userUsedCount: 0,
                    validFrom: null,
                    validTo: null,
                    appliesTo: 'base',
                    isActive: true,
                  }
                : null,
          });

          expect(q.totalMinor).toBeGreaterThanOrEqual(0);
          const sumLines = q.lines.reduce((s, l) => s + l.amountMinor, 0);
          expect(sumLines).toBe(q.totalMinor);
          expect(q.discountMinor).toBeLessThanOrEqual(q.baseTotalMinor);
        },
      ),
      { numRuns: 50 },
    );

    const payload = { vehicleId: 1, totalMinor: 500000, expiresAt: 9999999999999 };
    const sig = signQuotePayload(payload);
    expect(verifyQuoteSignature(payload, sig)).toBe(true);
    expect(verifyQuoteSignature({ ...payload, totalMinor: 499999 }, sig)).toBe(false);
  });
});

describe('cancellation, eligibility & concurrent overlap guard (§4.5, §8.5, §14.1)', () => {
  it('computes exact cancellation refunds across tiers', () => {
    const pickup = 1_800_000_000_000;
    const h = 3_600_000;
    const tiers = DEFAULT_RENTAL_SETTINGS.cancellationTiers;

    expect(
      computeCancellationRefund({
        totalPaidMinor: 100000,
        pickupAt: pickup,
        cancelledAt: pickup - 60 * h,
        tiers,
      }).refundMinor,
    ).toBe(100000);
    expect(
      computeCancellationRefund({
        totalPaidMinor: 100000,
        pickupAt: pickup,
        cancelledAt: pickup - 30 * h,
        tiers,
      }).refundMinor,
    ).toBe(75000);
    expect(
      computeCancellationRefund({
        totalPaidMinor: 100000,
        pickupAt: pickup,
        cancelledAt: pickup - 12 * h,
        tiers,
      }).refundMinor,
    ).toBe(50000);
    expect(
      computeCancellationRefund({
        totalPaidMinor: 100000,
        pickupAt: pickup,
        cancelledAt: pickup - 2 * h,
        tiers,
      }).refundMinor,
    ).toBe(0);
    expect(
      computeCancellationRefund({
        totalPaidMinor: 100000,
        pickupAt: pickup,
        cancelledAt: pickup - 2 * h,
        tiers,
        adminInitiated: true,
      }).refundMinor,
    ).toBe(100000);
  });

  it('flags licence expiring before return date', () => {
    const res = checkEligibility({
      dateOfBirth: '1995-05-10',
      isBlacklisted: false,
      licence: { status: 'verified', expiresOn: '2026-03-12' },
      vehicle: { minDriverAge: 21, minLicenceYears: 1 },
      pickupAt: fromBranchLocal('2026-03-10T10:00', 'Asia/Kolkata'),
      returnAt: fromBranchLocal('2026-03-14T10:00', 'Asia/Kolkata'),
      branchTimezone: 'Asia/Kolkata',
      kycRequiredBeforePay: true,
    });
    expect(res.ok).toBe(false);
    expect(res.blockers.some((b) => b.code === 'LICENCE_EXPIRES_MID_TRIP')).toBe(true);
  });

  it('prevents double-booking under parallel attempts (exactly 1 wins)', async () => {
    const sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    runMigrations(sqlite);
    const now = Date.now();

    sqlite
      .prepare(
        "INSERT INTO branches (public_id, slug, name, city, address, timezone, created_at, updated_at) VALUES ('b1','b1','Hub','BLR','Rd','Asia/Kolkata',?,?)",
      )
      .run(now, now);
    sqlite
      .prepare(
        "INSERT INTO rate_plans (public_id, name, base_daily_minor, created_at, updated_at) VALUES ('r1','Std',200000,?,?)",
      )
      .run(now, now);
    sqlite
      .prepare(
        "INSERT INTO vehicles (public_id, slug, home_branch_id, current_branch_id, make, model, year, plate, category, transmission, fuel_type, seats, paint_name, paint_hex, rate_plan_id, created_at, updated_at) VALUES ('v1','car-1',1,1,'Honda','City',2025,'KA01AB0001','sedan','automatic','petrol',5,'White','#FFFFFF',1,?,?)",
      )
      .run(now, now);

    const start = 1_800_000_000_000;
    const end = start + 86_400_000;
    const bufferEnd = end + 90 * 60_000;

    const attempts = Array.from({ length: 10 }, (_, idx) =>
      Promise.resolve().then(() => {
        try {
          sqlite
            .prepare(
              "INSERT INTO vehicle_blocks (vehicle_id, kind, start_at, end_at, buffer_end_at, note, created_at) VALUES (1, 'booking', ?, ?, ?, ?, ?)",
            )
            .run(start, end, bufferEnd, `attempt-${idx}`, now);
          return 'won';
        } catch {
          return 'conflict';
        }
      }),
    );

    const outcomes = await Promise.all(attempts);
    expect(outcomes.filter((o) => o === 'won')).toHaveLength(1);
    expect(outcomes.filter((o) => o === 'conflict')).toHaveLength(9);
    sqlite.close();
  });
});
