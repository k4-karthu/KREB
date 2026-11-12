import type { ReactNode } from 'react';
import { Price } from './Price';

export interface QuoteItem {
  id: string;
  label: string;
  description?: string;
  amountMinor: number;
}

export interface QuotePanelProps {
  rentalDays: number;
  dailyRateMinor: number;
  addOns?: QuoteItem[];
  taxesMinor: number;
  depositMinor: number;
  currency?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Kerb v3 QuotePanel:
 * Comprehensive pricing summary panel detailing rental, add-ons, taxes, deposit, and total.
 */
export function QuotePanel({
  rentalDays,
  dailyRateMinor,
  addOns = [],
  taxesMinor,
  depositMinor,
  action,
  className = '',
}: QuotePanelProps) {
  const rentalTotalMinor = dailyRateMinor * rentalDays;
  const addOnsTotalMinor = addOns.reduce((sum, item) => sum + item.amountMinor, 0);
  const totalMinor = rentalTotalMinor + addOnsTotalMinor + taxesMinor + depositMinor;

  return (
    <aside
      className={`rounded-l border border-border bg-surface p-6 shadow-e1 ${className}`.trim()}
    >
      <h3 className="font-display text-h4 font-semibold text-text-1">Price summary</h3>

      <dl className="mt-5 space-y-3 text-body-s">
        {/* Base Rental */}
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <dt className="text-text-2">Vehicle rental</dt>
            <span className="text-label-s text-text-3 tabular-nums">
              {rentalDays} {rentalDays === 1 ? 'day' : 'days'} ×{' '}
              <Price amountMinor={dailyRateMinor} size="sm" />
            </span>
          </div>
          <dd className="text-right font-medium text-text-1 tabular-nums">
            <Price amountMinor={rentalTotalMinor} size="sm" />
          </dd>
        </div>

        {/* Add-ons */}
        {addOns.map((addOn) => (
          <div key={addOn.id} className="flex items-baseline justify-between gap-4">
            <div>
              <dt className="text-text-2">{addOn.label}</dt>
              {addOn.description && (
                <span className="text-label-s text-text-3">{addOn.description}</span>
              )}
            </div>
            <dd className="text-right font-medium text-text-1 tabular-nums">
              <Price amountMinor={addOn.amountMinor} size="sm" />
            </dd>
          </div>
        ))}

        {/* Taxes & GST */}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-text-2">Taxes & fees (18% GST)</dt>
          <dd className="text-right font-medium text-text-1 tabular-nums">
            <Price amountMinor={taxesMinor} size="sm" />
          </dd>
        </div>

        {/* Refundable Security Deposit */}
        <div className="flex items-baseline justify-between gap-4 border-t border-border-subtle pt-3">
          <div>
            <dt className="flex items-center gap-1.5 text-text-2">
              <span>Security deposit</span>
              <span className="rounded-xs bg-surface-sunken px-1.5 py-0.5 text-label-s text-text-3">
                Refundable
              </span>
            </dt>
            <span className="text-label-s text-text-3">Released upon vehicle return</span>
          </div>
          <dd className="text-right font-medium text-text-1 tabular-nums">
            <Price amountMinor={depositMinor} size="sm" />
          </dd>
        </div>
      </dl>

      {/* Total Section */}
      <div className="mt-6 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <span className="font-display text-body font-semibold text-text-1">Total amount</span>
            <span className="block text-label-s text-text-3">Including taxes and deposit</span>
          </div>
          <div className="text-right">
            <Price amountMinor={totalMinor} size="lg" />
          </div>
        </div>
      </div>

      {action && <div className="mt-6">{action}</div>}
    </aside>
  );
}
