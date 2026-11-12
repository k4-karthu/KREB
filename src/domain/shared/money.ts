export type MinorUnits = number;

/**
 * Ensures a monetary value is a safe integer in minor units (e.g. paise/cents).
 */
export function assertMinor(value: number, label = 'amount'): MinorUnits {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be an integer in minor units, received ${value}`);
  }
  return value;
}

/**
 * Multiplies a minor-unit amount by basis points (10000 = 100%, 1800 = 18%, 11500 = 1.15x)
 * using exact integer arithmetic with round half-up.
 */
export function applyBasisPointsHalfUp(amountMinor: MinorUnits, basisPoints: number): MinorUnits {
  assertMinor(amountMinor, 'amountMinor');
  if (!Number.isSafeInteger(basisPoints)) {
    throw new Error(`basisPoints must be an integer, received ${basisPoints}`);
  }
  const sign = amountMinor < 0 ? -1 : 1;
  const abs = Math.abs(amountMinor);
  const numerator = abs * basisPoints;
  const rounded = Math.floor((numerator + 5000) / 10000);
  return sign * rounded;
}

/**
 * Computes tax on a taxable subtotal in minor units using basis points and half-up rounding.
 */
export function computeTaxHalfUp(taxableMinor: MinorUnits, taxRateBp: number): MinorUnits {
  if (taxableMinor <= 0 || taxRateBp <= 0) return 0;
  return applyBasisPointsHalfUp(taxableMinor, taxRateBp);
}

/**
 * Formats integer minor units as a human-readable currency string.
 */
export function formatMoney(amountMinor: MinorUnits, currency = 'INR', locale = 'en-IN'): string {
  assertMinor(amountMinor, 'amountMinor');
  const major = amountMinor / 100;
  const hasDecimals = amountMinor % 100 !== 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(major);
}

/**
 * Splits formatted money into symbol and numeric value so large display prices
 * can raise the currency symbol per §11.5.
 */
export function splitMoneyParts(
  amountMinor: MinorUnits,
  currency = 'INR',
  locale = 'en-IN',
): { sign: string; symbol: string; value: string } {
  assertMinor(amountMinor, 'amountMinor');
  const major = Math.abs(amountMinor) / 100;
  const hasDecimals = amountMinor % 100 !== 0;
  const parts = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).formatToParts(major);

  const symbol = parts.find((p) => p.type === 'currency')?.value ?? '₹';
  const value = parts
    .filter((p) => p.type !== 'currency' && p.type !== 'literal')
    .map((p) => p.value)
    .join('');

  return {
    sign: amountMinor < 0 ? '−' : '',
    symbol,
    value,
  };
}
