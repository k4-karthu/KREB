'use client';

import { Check, X } from '@phosphor-icons/react';
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup } from 'react-aria-components';
import { Price } from './Price';

export interface ProtectionFeature {
  text: string;
  included: boolean;
}

export interface ProtectionTier {
  id: string;
  name: string;
  summary: string;
  dailyMinor: number;
  excessMinor: number;
  features: ProtectionFeature[];
  recommended?: boolean;
}

export interface ProtectionCardsProps {
  tiers: ProtectionTier[];
  selectedTierId: string;
  onSelectTier: (id: string) => void;
  className?: string;
}

/**
 * Kerb v3 ProtectionCards:
 * 3-tier protection options featuring feature checklists and React Aria RadioGroup selection.
 */
export function ProtectionCards({
  tiers,
  selectedTierId,
  onSelectTier,
  className = '',
}: ProtectionCardsProps) {
  return (
    <AriaRadioGroup
      value={selectedTierId}
      onChange={onSelectTier}
      aria-label="Protection plan options"
      className={`grid grid-cols-1 gap-4 md:grid-cols-3 ${className}`.trim()}
    >
      {tiers.map((tier) => (
        <AriaRadio
          key={tier.id}
          value={tier.id}
          className="group relative flex cursor-pointer flex-col justify-between rounded-m border border-border-subtle bg-surface p-5 shadow-e0 transition-all duration-200 hover:border-border hover:shadow-e1 focus-visible:outline-2 focus-visible:outline-accent data-[selected]:border-racing-green data-[selected]:bg-racing-green-subtle/30 data-[selected]:shadow-e1 data-[selected]:ring-2 data-[selected]:ring-racing-green"
        >
          {({ isSelected }) => (
            <>
              {tier.recommended && (
                <span className="absolute -top-2.5 right-4 rounded-xs bg-cognac px-2.5 py-0.5 text-label-s font-semibold text-on-cognac select-none shadow-e0">
                  Recommended
                </span>
              )}

              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-h4 font-semibold text-text-1">{tier.name}</h4>
                    <p className="mt-1 text-body-s text-text-2">{tier.summary}</p>
                  </div>

                  {/* Headless Radio Indicator */}
                  <div
                    aria-hidden="true"
                    className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected ? 'border-racing-green' : 'border-border-strong'
                    }`}
                  >
                    {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-racing-green" />}
                  </div>
                </div>

                {/* Price & Excess */}
                <div className="mt-4 border-t border-border-subtle pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-label-s text-text-3">Daily rate</span>
                    {tier.dailyMinor === 0 ? (
                      <span className="text-label-m font-semibold text-text-1">Included</span>
                    ) : (
                      <Price amountMinor={tier.dailyMinor} period="/day" size="sm" />
                    )}
                  </div>

                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-label-s text-text-3">Security excess</span>
                    <span className="text-body-s font-medium text-text-1 tabular-nums">
                      {tier.excessMinor === 0 ? (
                        'Zero excess'
                      ) : (
                        <Price amountMinor={tier.excessMinor} size="sm" />
                      )}
                    </span>
                  </div>
                </div>

                {/* Features Checklist */}
                <ul className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-body-s">
                  {tier.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-2">
                      {feature.included ? (
                        <Check size={16} weight="bold" className="text-success shrink-0" />
                      ) : (
                        <X size={16} weight="bold" className="text-text-disabled shrink-0" />
                      )}
                      <span
                        className={
                          feature.included ? 'text-text-1' : 'text-text-disabled line-through'
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </AriaRadio>
      ))}
    </AriaRadioGroup>
  );
}

export const ProtectionRadioGroup = AriaRadioGroup;
export const ProtectionRadio = AriaRadio;
