'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { quote1DayEvPercent, quote2DayHatchback, quote3DaySuvAllLines } from './receipt/fixtures';
import { ReceiptAnimation } from './receipt/ReceiptAnimation';
import type { SlipData } from './receipt/types';

interface QuotePreset {
  id: string;
  name: string;
  subtitle: string;
  slip: SlipData;
}

const PRESETS: QuotePreset[] = [
  {
    id: 'hatchback',
    name: 'Swift ZXi',
    subtitle: '2-day weekend',
    slip: quote2DayHatchback,
  },
  {
    id: 'ev',
    name: 'Nexon.ev',
    subtitle: '1-day electric',
    slip: quote1DayEvPercent,
  },
  {
    id: 'suv',
    name: 'XUV700 AX7L',
    subtitle: '3-day tourer',
    slip: quote3DaySuvAllLines,
  },
];

const DEFAULT_PRESET: QuotePreset = PRESETS[0] as QuotePreset;

export function LiveReceiptSection() {
  const [selectedId, setSelectedId] = useState<string>('hatchback');
  const current: QuotePreset = PRESETS.find((p) => p.id === selectedId) ?? DEFAULT_PRESET;

  return (
    <section className="border-t border-border bg-surface-sunken py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="space-y-3 max-w-2xl mb-12">
          <span className="text-caption font-semibold text-accent">Pricing transparency</span>
          <h2 className="font-display text-h1 font-bold tracking-tight text-text-1">
            Every quote signed to the rupee
          </h2>
          <p className="text-body text-text-2">
            Before you pay or upload your licence, Kerb computes a binding thermal quote. Zero
            deposit surprises, zero fuel arithmetic, zero surge multipliers.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Preset Switcher + Receipt Thermal Printer Assembly */}
          <div className="space-y-6 lg:col-span-7 flex flex-col items-center">
            {/* Quote Preset Switcher */}
            <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-md">
              {PRESETS.map((p) => {
                const isActive = p.id === selectedId;
                return (
                  <Button
                    key={p.id}
                    variant={isActive ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSelectedId(p.id)}
                  >
                    <span>{p.name}</span>
                    <span className="opacity-95">({p.subtitle})</span>
                  </Button>
                );
              })}
            </div>

            {/* Thermal Slip Assembly */}
            <div className="w-full max-w-md">
              <ReceiptAnimation key={current.id} slip={current.slip} autoPrint={false} />
            </div>
          </div>

          {/* Right Column: Editorial Transparency Tenets */}
          <div className="space-y-8 lg:col-span-5 lg:pt-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-display text-h3 font-semibold text-text-1">
                  Whole-rupee clarity
                </h3>
                <p className="text-body-s text-text-2">
                  The daily rate you see is the rate you pay. GST is itemised at 18%, never hidden
                  inside a final checkout step.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-h3 font-semibold text-text-1">
                  15-minute hold guarantee
                </h3>
                <p className="text-body-s text-text-2">
                  When you request a quote, your vehicle bay is locked for 15 minutes. No one can
                  take your car while you complete verification.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-display text-h3 font-semibold text-text-1">
                  Same-level fuel and deposit release
                </h3>
                <p className="text-body-s text-text-2">
                  Handover slip records fuel in eighths (or 90%+ battery state). Return at the same
                  mark to release your refundable security deposit within 5 working days.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/cars"
                className="inline-flex items-center justify-center rounded-s bg-accent px-5 py-2.5 text-body-s font-semibold text-on-accent transition-colors hover:bg-accent-hover shadow-e1"
              >
                Browse available fleet
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
