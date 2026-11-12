'use client';

import NumberFlow from '@number-flow/react';

export interface PriceProps {
  value?: number;
  amountMinor?: number;
  minorUnits?: number;
  period?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-label-m font-medium',
  md: 'text-h4 font-semibold',
  lg: 'text-2xl font-bold font-display',
  xl: 'text-4xl font-bold font-display',
};

/**
 * Kerb v3 Price:
 * Number Flow animated transitions with superscript ₹ symbol and tabular-nums.
 */
export function Price({ value, amountMinor, minorUnits, period, size = 'md', className = '' }: PriceProps) {
  // If amountMinor or minorUnits is provided, convert paise to rupees (divided by 100)
  const rawMinor = typeof amountMinor === 'number' ? amountMinor : minorUnits;
  const displayValue =
    typeof value === 'number'
      ? value
      : typeof rawMinor === 'number'
        ? Math.round(rawMinor / 100)
        : 0;

  return (
    <span
      className={`tabular-nums inline-flex items-baseline text-text-1 ${SIZE_CLASSES[size]} ${className}`.trim()}
    >
      <sup
        aria-hidden="true"
        className="mr-0.5 select-none"
        style={{ fontSize: '0.65em', verticalAlign: 'super' }}
      >
        ₹
      </sup>
      <NumberFlow value={displayValue} locales="en-IN" format={{ useGrouping: true }} />
      {period && (
        <span className="ml-1 text-body-s font-normal text-text-3 select-none">{period}</span>
      )}
    </span>
  );
}
