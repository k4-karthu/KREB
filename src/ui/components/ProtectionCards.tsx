'use client';

import { MoneyText } from '../primitives/MoneyText';

export interface ProtectionPlanOption {
  publicId: string;
  tier: number;
  name: string;
  summary: string;
  covered: string;
  notCovered: string;
  perDayMinor: number;
  excessMinor: number;
}

interface ProtectionCardsProps {
  plans: ProtectionPlanOption[];
  selectedPublicId: string;
  onChange: (publicId: string) => void;
  currency?: string;
}

export function ProtectionCards({
  plans,
  selectedPublicId,
  onChange,
  currency = 'INR',
}: ProtectionCardsProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-1 font-bold text-petrol-800 mb-2">Protection plan</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {plans.map((plan) => {
          const checked = plan.publicId === selectedPublicId;
          return (
            <label
              key={plan.publicId}
              className={`flex flex-col justify-between rounded-m border p-4 cursor-pointer transition-colors duration-150 ${
                checked
                  ? 'border-petrol-800 bg-amber-100'
                  : 'border-stone-200 bg-sheet hover:border-stone-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-0 font-bold text-petrol-800">{plan.name}</span>
                  <input
                    type="radio"
                    name="protection-plan"
                    value={plan.publicId}
                    checked={checked}
                    onChange={() => onChange(plan.publicId)}
                    className="mt-1 h-4 w-4 accent-petrol-800"
                  />
                </div>
                <p className="mt-1 text-m1 text-stone-500">{plan.summary}</p>
                <p className="mt-2 text-m1 text-petrol-800">
                  Excess: <MoneyText amountMinor={plan.excessMinor} currency={currency} />
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-200 text-0 font-bold text-petrol-800">
                {plan.perDayMinor === 0 ? (
                  <span>Included</span>
                ) : (
                  <span>
                    <MoneyText amountMinor={plan.perDayMinor} currency={currency} /> / day
                  </span>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
