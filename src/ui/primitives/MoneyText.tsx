import { formatMoney, splitMoneyParts } from '@/domain/shared/money';

interface MoneyTextProps {
  amountMinor: number;
  currency?: string;
  locale?: string;
  size?: 'inline' | 'large';
  className?: string;
}

/**
 * Formats integer minor units with tabular numerals.
 * On 'large' variant, raises and scales down the currency symbol per §11.5.
 */
export function MoneyText({
  amountMinor,
  currency = 'INR',
  locale = 'en-IN',
  size = 'inline',
  className = '',
}: MoneyTextProps) {
  if (size === 'large') {
    const parts = splitMoneyParts(amountMinor, currency, locale);
    return (
      <span
        className={`font-display tabular-nums font-bold inline-flex items-baseline ${className}`.trim()}
      >
        {parts.sign && <span>{parts.sign}</span>}
        <span className="text-1 self-start mt-1 mr-0.5">{parts.symbol}</span>
        <span>{parts.value}</span>
      </span>
    );
  }

  return (
    <span className={`tabular-nums ${className}`.trim()}>
      {formatMoney(amountMinor, currency, locale)}
    </span>
  );
}
