import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { getEnv } from '@/config/env';
import { DEFAULT_RENTAL_SETTINGS, type RentalSettings } from '@/config/settings';
import { applyBasisPointsHalfUp, computeTaxHalfUp, formatMoney } from '@/domain/shared/money';
import { getBranchLocalDate, getBranchWeekday } from '@/domain/shared/time';

export const PRICING_ENGINE_VERSION = '2.0.0';

export interface PricingRuleInput {
  id: number;
  kind: 'weekday_multiplier' | 'date_range_multiplier' | 'date_range_flat_add';
  weekdaysMask: number | null;
  startsOn: string | null;
  endsOn: string | null;
  multiplierBp: number | null;
  flatAddMinor: number | null;
  priority: number;
  label: string;
}

export interface RateTierInput {
  fromDays: number;
  discountBp: number;
}

export interface AddonSelectionInput {
  id: number;
  name: string;
  priceType: 'per_day' | 'flat';
  priceMinor: number;
  quantity: number;
}

export interface ProtectionPlanInput {
  id: number;
  name: string;
  perDayMinor: number;
  excessMinor: number;
}

export interface PromoInput {
  id: number;
  code: string;
  kind: 'percent' | 'flat';
  value: number;
  minDays: number;
  categories: string[] | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number;
  userUsedCount: number;
  validFrom: number | null;
  validTo: number | null;
  appliesTo: 'base' | 'subtotal';
  isActive: boolean;
}

export interface QuoteLineItem {
  kind: 'base' | 'rule' | 'tier_discount' | 'addon' | 'protection' | 'fee' | 'promo' | 'tax';
  label: string;
  quantity: number;
  unitMinor: number;
  amountMinor: number;
  taxable: boolean;
}

export interface QuoteComputeInput {
  vehicleCategory: string;
  baseDailyMinor: number;
  depositMinor: number;
  branchTimezone: string;
  startAt: number;
  endAt: number;
  rateTiers: RateTierInput[];
  pricingRules: PricingRuleInput[];
  addons: AddonSelectionInput[];
  protection: ProtectionPlanInput | null;
  promo?: PromoInput | null;
  oneWayFeeMinor?: number;
  afterHoursFeeMinor?: number;
  settings?: RentalSettings;
  nowMs?: number;
}

export interface QuoteComputationResult {
  billableDays: number;
  baseTotalMinor: number;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  depositMinor: number;
  taxRateBp: number;
  lines: QuoteLineItem[];
  promoError?: string;
}

export function computeBillableDays(startAt: number, endAt: number, graceMinutes: number): number {
  const diff = endAt - startAt;
  if (diff <= 0) {
    throw new Error('Return time must be after pick-up time.');
  }
  const effectiveMs = Math.max(1, diff - graceMinutes * 60_000);
  return Math.max(1, Math.ceil(effectiveMs / 86_400_000));
}

export function computePureQuote(input: QuoteComputeInput): QuoteComputationResult {
  const settings = input.settings ?? DEFAULT_RENTAL_SETTINGS;
  const now = input.nowMs ?? Date.now();
  const billableDays = computeBillableDays(input.startAt, input.endAt, settings.graceMinutes);
  const lines: QuoteLineItem[] = [];

  // Resolve per-24h block day pricing
  const groupedRates = new Map<
    string,
    { label: string; unitMinor: number; count: number; total: number }
  >();

  for (let i = 0; i < billableDays; i++) {
    const blockStart = input.startAt + i * 86_400_000;
    const localDate = getBranchLocalDate(blockStart, input.branchTimezone);
    const weekday = getBranchWeekday(blockStart, input.branchTimezone);
    const weekdayBit = 1 << weekday;

    let dayRate = input.baseDailyMinor;
    const appliedLabels: string[] = [];

    const sortedRules = [...input.pricingRules].sort((a, b) => a.priority - b.priority);
    for (const rule of sortedRules) {
      let matches = false;
      if (rule.kind === 'weekday_multiplier' && rule.weekdaysMask !== null) {
        matches = (rule.weekdaysMask & weekdayBit) !== 0;
      } else if (
        (rule.kind === 'date_range_multiplier' || rule.kind === 'date_range_flat_add') &&
        rule.startsOn &&
        rule.endsOn
      ) {
        matches = localDate >= rule.startsOn && localDate <= rule.endsOn;
      }

      if (!matches) continue;
      if (rule.kind === 'date_range_flat_add' && rule.flatAddMinor !== null) {
        dayRate += rule.flatAddMinor;
        appliedLabels.push(rule.label);
      } else if (rule.multiplierBp !== null) {
        dayRate = applyBasisPointsHalfUp(dayRate, rule.multiplierBp);
        appliedLabels.push(rule.label);
      }
    }

    const groupLabel = appliedLabels.length > 0 ? appliedLabels.join(', ') : 'Standard daily rate';
    const key = `${groupLabel}:${dayRate}`;
    const existing = groupedRates.get(key);
    if (existing) {
      existing.count += 1;
      existing.total += dayRate;
    } else {
      groupedRates.set(key, { label: groupLabel, unitMinor: dayRate, count: 1, total: dayRate });
    }
  }

  let baseTotalMinor = 0;
  for (const grp of groupedRates.values()) {
    baseTotalMinor += grp.total;
    lines.push({
      kind: grp.label === 'Standard daily rate' ? 'base' : 'rule',
      label: `${grp.count} ${grp.count === 1 ? 'day' : 'days'} × ${grp.label}`,
      quantity: grp.count,
      unitMinor: grp.unitMinor,
      amountMinor: grp.total,
      taxable: true,
    });
  }

  // Duration tier discount
  const matchingTier = [...input.rateTiers]
    .filter((t) => billableDays >= t.fromDays)
    .sort((a, b) => b.fromDays - a.fromDays)[0];

  let tierDiscountMinor = 0;
  if (matchingTier) {
    tierDiscountMinor = applyBasisPointsHalfUp(baseTotalMinor, matchingTier.discountBp);
    if (tierDiscountMinor > 0) {
      lines.push({
        kind: 'tier_discount',
        label: `${matchingTier.fromDays}+ day rental discount`,
        quantity: 1,
        unitMinor: -tierDiscountMinor,
        amountMinor: -tierDiscountMinor,
        taxable: true,
      });
    }
  }

  // Add-ons
  let addonsTotalMinor = 0;
  for (const addon of input.addons) {
    if (addon.quantity <= 0) continue;
    const lineTotal =
      addon.priceType === 'per_day'
        ? addon.priceMinor * billableDays * addon.quantity
        : addon.priceMinor * addon.quantity;
    addonsTotalMinor += lineTotal;
    lines.push({
      kind: 'addon',
      label:
        addon.priceType === 'per_day'
          ? `${addon.name} (${addon.quantity} × ${billableDays} ${billableDays === 1 ? 'day' : 'days'})`
          : `${addon.name} (${addon.quantity})`,
      quantity: addon.quantity,
      unitMinor: addon.priceMinor,
      amountMinor: lineTotal,
      taxable: true,
    });
  }

  // Protection plan
  let protectionTotalMinor = 0;
  if (input.protection && input.protection.perDayMinor > 0) {
    protectionTotalMinor = input.protection.perDayMinor * billableDays;
    lines.push({
      kind: 'protection',
      label: `${input.protection.name} (${billableDays} ${billableDays === 1 ? 'day' : 'days'})`,
      quantity: billableDays,
      unitMinor: input.protection.perDayMinor,
      amountMinor: protectionTotalMinor,
      taxable: true,
    });
  }

  // Fees
  let feesTotalMinor = 0;
  if (input.oneWayFeeMinor && input.oneWayFeeMinor > 0) {
    feesTotalMinor += input.oneWayFeeMinor;
    lines.push({
      kind: 'fee',
      label: 'One-way return fee',
      quantity: 1,
      unitMinor: input.oneWayFeeMinor,
      amountMinor: input.oneWayFeeMinor,
      taxable: true,
    });
  }
  if (input.afterHoursFeeMinor && input.afterHoursFeeMinor > 0) {
    feesTotalMinor += input.afterHoursFeeMinor;
    lines.push({
      kind: 'fee',
      label: 'After-hours branch service',
      quantity: 1,
      unitMinor: input.afterHoursFeeMinor,
      amountMinor: input.afterHoursFeeMinor,
      taxable: true,
    });
  }

  const netBaseMinor = Math.max(0, baseTotalMinor - tierDiscountMinor);
  const prePromoSubtotalMinor =
    netBaseMinor + addonsTotalMinor + protectionTotalMinor + feesTotalMinor;

  // Promo code
  let promoDiscountMinor = 0;
  let promoError: string | undefined;
  if (input.promo) {
    const p = input.promo;
    if (!p.isActive) {
      promoError = `${p.code} is not active.`;
    } else if (p.validFrom && now < p.validFrom) {
      promoError = `${p.code} is not valid yet.`;
    } else if (p.validTo && now > p.validTo) {
      promoError = `${p.code} has expired.`;
    } else if (billableDays < p.minDays) {
      promoError = `${p.code} needs a rental of ${p.minDays} days or more. Yours is ${billableDays} ${billableDays === 1 ? 'day' : 'days'}.`;
    } else if (
      p.categories &&
      p.categories.length > 0 &&
      !p.categories.includes(input.vehicleCategory)
    ) {
      promoError = `${p.code} does not apply to ${input.vehicleCategory} vehicles.`;
    } else if (p.maxUses !== null && p.usedCount >= p.maxUses) {
      promoError = `${p.code} has reached its total redemption limit.`;
    } else if (p.userUsedCount >= p.perUserLimit) {
      promoError = `You have already used ${p.code}.`;
    } else {
      const targetBase = p.appliesTo === 'base' ? netBaseMinor : prePromoSubtotalMinor;
      promoDiscountMinor =
        p.kind === 'percent' ? applyBasisPointsHalfUp(targetBase, p.value) : p.value;
      promoDiscountMinor = Math.min(targetBase, Math.max(0, promoDiscountMinor));
      if (promoDiscountMinor > 0) {
        lines.push({
          kind: 'promo',
          label: `Promo ${p.code}`,
          quantity: 1,
          unitMinor: -promoDiscountMinor,
          amountMinor: -promoDiscountMinor,
          taxable: true,
        });
      }
    }
  }

  const discountMinor = tierDiscountMinor + promoDiscountMinor;
  const subtotalMinor = Math.max(0, prePromoSubtotalMinor - promoDiscountMinor);
  const taxableMinor = lines.filter((l) => l.taxable).reduce((sum, l) => sum + l.amountMinor, 0);

  const taxMinor = computeTaxHalfUp(Math.max(0, taxableMinor), settings.taxRateBp);
  if (taxMinor > 0) {
    lines.push({
      kind: 'tax',
      label: `${settings.taxLabel} (${(settings.taxRateBp / 100).toFixed(0)}%)`,
      quantity: 1,
      unitMinor: taxMinor,
      amountMinor: taxMinor,
      taxable: false,
    });
  }

  const totalMinor = subtotalMinor + taxMinor;

  return {
    billableDays,
    baseTotalMinor,
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor,
    depositMinor: input.depositMinor,
    taxRateBp: settings.taxRateBp,
    lines,
    promoError,
  };
}

export function signQuotePayload(payload: object): string {
  return crypto
    .createHmac('sha256', getEnv().QUOTE_SIGNING_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function verifyQuoteSignature(payload: object, signature: string): boolean {
  const expected = signQuotePayload(payload);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export function loadAndPriceVehicle(
  sqlite: Database.Database,
  params: {
    vehicleId: number;
    pickupBranchId: number;
    returnBranchId: number;
    startAt: number;
    endAt: number;
    protectionPlanPublicId?: string;
    addonSelections?: Array<{ publicId: string; quantity: number }>;
    promoCode?: string;
    userId?: string | null;
    settings?: RentalSettings;
  },
): QuoteComputationResult & {
  vehicleId: number;
  ratePlanBaseDailyMinor: number;
  protectionPlanId: number | null;
  promoCodeId: number | null;
} {
  const veh = sqlite
    .prepare(
      `SELECT v.id, v.category, v.deposit_minor, v.rate_plan_id, rp.base_daily_minor, br.timezone
       FROM vehicles v
       JOIN rate_plans rp ON rp.id = v.rate_plan_id
       JOIN branches br ON br.id = ?
       WHERE v.id = ? AND v.deleted_at IS NULL`,
    )
    .get(params.pickupBranchId, params.vehicleId) as
    | {
        id: number;
        category: string;
        deposit_minor: number;
        rate_plan_id: number;
        base_daily_minor: number;
        timezone: string;
      }
    | undefined;

  if (!veh) {
    throw new Error('Vehicle or branch not found.');
  }

  const tiers = sqlite
    .prepare(
      'SELECT from_days AS fromDays, discount_bp AS discountBp FROM rate_tiers WHERE rate_plan_id = ?',
    )
    .all(veh.rate_plan_id) as RateTierInput[];

  const rules = sqlite
    .prepare(
      `SELECT id, kind, weekdays_mask AS weekdaysMask, starts_on AS startsOn, ends_on AS endsOn,
              multiplier_bp AS multiplierBp, flat_add_minor AS flatAddMinor, priority, label
       FROM pricing_rules
       WHERE is_active = 1 AND (rate_plan_id IS NULL OR rate_plan_id = ?)`,
    )
    .all(veh.rate_plan_id) as PricingRuleInput[];

  const addons: AddonSelectionInput[] = [];
  if (params.addonSelections && params.addonSelections.length > 0) {
    for (const sel of params.addonSelections) {
      if (sel.quantity <= 0) continue;
      const row = sqlite
        .prepare(
          'SELECT id, name, price_type, price_minor, max_qty FROM addons WHERE public_id = ? AND is_active = 1 AND deleted_at IS NULL',
        )
        .get(sel.publicId) as
        | {
            id: number;
            name: string;
            price_type: 'per_day' | 'flat';
            price_minor: number;
            max_qty: number;
          }
        | undefined;
      if (row) {
        addons.push({
          id: row.id,
          name: row.name,
          priceType: row.price_type,
          priceMinor: row.price_minor,
          quantity: Math.min(sel.quantity, row.max_qty),
        });
      }
    }
  }

  let protectionRow:
    | { id: number; name: string; per_day_minor: number; excess_minor: number }
    | undefined;
  if (params.protectionPlanPublicId) {
    protectionRow = sqlite
      .prepare(
        'SELECT id, name, per_day_minor, excess_minor FROM protection_plans WHERE public_id = ? AND is_active = 1',
      )
      .get(params.protectionPlanPublicId) as typeof protectionRow;
  }
  if (!protectionRow) {
    protectionRow = sqlite
      .prepare(
        'SELECT id, name, per_day_minor, excess_minor FROM protection_plans WHERE is_active = 1 ORDER BY tier ASC LIMIT 1',
      )
      .get() as typeof protectionRow;
  }

  let promoInput: PromoInput | null = null;
  let promoCodeId: number | null = null;
  if (params.promoCode?.trim()) {
    const code = params.promoCode.trim().toUpperCase();
    const row = sqlite.prepare('SELECT * FROM promo_codes WHERE code = ?').get(code) as
      | {
          id: number;
          code: string;
          kind: 'percent' | 'flat';
          value: number;
          valid_from: number | null;
          valid_to: number | null;
          min_days: number;
          categories_json: string | null;
          max_uses: number | null;
          used_count: number;
          per_user_limit: number;
          applies_to: 'base' | 'subtotal';
          is_active: number;
        }
      | undefined;

    if (!row) {
      promoInput = {
        id: 0,
        code,
        kind: 'flat',
        value: 1,
        minDays: 1,
        categories: null,
        maxUses: 1,
        usedCount: 0,
        perUserLimit: 1,
        userUsedCount: 0,
        validFrom: null,
        validTo: null,
        appliesTo: 'base',
        isActive: false,
      };
    } else {
      const userUses = params.userId
        ? (
            sqlite
              .prepare(
                "SELECT count(*) AS cnt FROM bookings WHERE user_id = ? AND promo_code_id = ? AND status NOT IN ('cancelled','expired','rejected')",
              )
              .get(params.userId, row.id) as { cnt: number }
          ).cnt
        : 0;
      promoCodeId = row.id;
      promoInput = {
        id: row.id,
        code: row.code,
        kind: row.kind,
        value: row.value,
        minDays: row.min_days,
        categories: row.categories_json ? (JSON.parse(row.categories_json) as string[]) : null,
        maxUses: row.max_uses,
        usedCount: row.used_count,
        perUserLimit: row.per_user_limit,
        userUsedCount: userUses,
        validFrom: row.valid_from,
        validTo: row.valid_to,
        appliesTo: row.applies_to,
        isActive: row.is_active === 1,
      };
    }
  }

  let oneWayFeeMinor = 0;
  if (params.pickupBranchId !== params.returnBranchId) {
    const ow = sqlite
      .prepare('SELECT fee_minor FROM one_way_fees WHERE from_branch_id = ? AND to_branch_id = ?')
      .get(params.pickupBranchId, params.returnBranchId) as { fee_minor: number } | undefined;
    oneWayFeeMinor = ow?.fee_minor ?? 0;
  }

  const computed = computePureQuote({
    vehicleCategory: veh.category,
    baseDailyMinor: veh.base_daily_minor,
    depositMinor: veh.deposit_minor,
    branchTimezone: veh.timezone,
    startAt: params.startAt,
    endAt: params.endAt,
    rateTiers: tiers,
    pricingRules: rules,
    addons,
    protection: protectionRow
      ? {
          id: protectionRow.id,
          name: protectionRow.name,
          perDayMinor: protectionRow.per_day_minor,
          excessMinor: protectionRow.excess_minor,
        }
      : null,
    promo: promoInput,
    oneWayFeeMinor,
    settings: params.settings,
  });

  if (computed.promoError) {
    promoCodeId = null;
  }

  return {
    ...computed,
    vehicleId: veh.id,
    ratePlanBaseDailyMinor: veh.base_daily_minor,
    protectionPlanId: protectionRow?.id ?? null,
    promoCodeId,
  };
}

export function formatQuoteLineSummary(line: QuoteLineItem, currency = 'INR'): string {
  return `${line.label}: ${formatMoney(line.amountMinor, currency)}`;
}
