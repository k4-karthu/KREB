'use client';

import { ArrowRight, Minus, Plus, ShieldCheck, Tag } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { QuoteComputationResult, QuoteLineItem } from '@/domain/pricing/pricing';
import { slipFromQuote } from '@/ui/components/receipt/adapters';
import { ReceiptPaper } from '@/ui/components/receipt/receipt-paper';
import type { SlipData } from '@/ui/components/receipt/types';
import { Gallery, type GalleryImageItem } from '@/ui/data/Gallery';
import { Price } from '@/ui/data/Price';
import {
  ProtectionCards,
  type ProtectionFeature,
  type ProtectionTier,
} from '@/ui/data/ProtectionCards';
import { type QuoteItem, QuotePanel } from '@/ui/data/QuotePanel';
import { type SpecRow, SpecSheet } from '@/ui/data/SpecSheet';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Button } from '@/ui/primitives/Button';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { TextField } from '@/ui/primitives/TextField';

export interface AddonOption {
  publicId: string;
  name: string;
  description: string | null;
  priceType: 'per_day' | 'flat';
  priceMinor: number;
  maxQty: number;
}

export interface ProtectionOption {
  publicId: string;
  tier: number;
  name: string;
  summary: string;
  perDayMinor: number;
  excessMinor: number;
}

export interface SiblingVariant {
  slug: string;
  variant: string | null;
  transmission: string;
  fuel_type: string;
  paint_name: string;
  paint_hex: string;
}

export interface VehicleDetailClientProps {
  vehicle: {
    id: number;
    make: string;
    model: string;
    variant: string | null;
    year: number;
    plate: string;
    category: string;
    transmission: string;
    fuel_type: string;
    branch_name: string;
    paint_name: string;
    paint_hex: string;
  };
  galleryImages: GalleryImageItem[];
  description: string | null;
  specItems: SpecRow[];
  siblingVariants: SiblingVariant[];
  features: Array<{ label: string }>;
  reviews: Array<{
    rating_condition: number;
    rating_clean: number;
    rating_pickup: number;
    comment: string | null;
    author_name: string;
  }>;
  pickupBranchId: number;
  startAt: number;
  endAt: number;
  initialAvailable: boolean;
  initialQuote: QuoteComputationResult;
  addons: AddonOption[];
  protectionPlans: ProtectionOption[];
}

export function VehicleDetailClient({
  vehicle,
  galleryImages,
  description,
  specItems,
  siblingVariants,
  features,
  reviews,
  pickupBranchId,
  startAt,
  endAt,
  initialAvailable,
  initialQuote,
  addons,
  protectionPlans,
}: VehicleDetailClientProps) {
  const router = useRouter();

  const [selectedProtection, setSelectedProtection] = useState<string>(
    protectionPlans[0]?.publicId ?? '',
  );
  const [addonQtys, setAddonQtys] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  const [currentQuote, setCurrentQuote] = useState<QuoteComputationResult>(initialQuote);
  const [available, setAvailable] = useState(initialAvailable);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [estimateMode, setEstimateMode] = useState<'quote' | 'receipt'>('quote');

  function buildAddonSelections(nextMap: Record<string, number>) {
    return Object.entries(nextMap)
      .filter(([, qty]) => qty > 0)
      .map(([publicId, quantity]) => ({ publicId, quantity }));
  }

  async function refreshPreview(
    nextProt: string,
    nextAddons: Record<string, number>,
    nextPromo: string,
  ) {
    setLoadingQuote(true);
    setPromoError(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'preview',
          vehicleId: vehicle.id,
          pickupBranchId,
          returnBranchId: pickupBranchId,
          startAt,
          endAt,
          protectionPlanPublicId: nextProt || undefined,
          addonSelections: buildAddonSelections(nextAddons),
          promoCode: nextPromo.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        available?: boolean;
        quote?: QuoteComputationResult;
      };
      if (data.quote) {
        setCurrentQuote(data.quote);
        setPromoError(data.quote.promoError ?? null);
      }
      if (data.available !== undefined) {
        setAvailable(data.available);
      }
    } finally {
      setLoadingQuote(false);
    }
  }

  async function handleReserve() {
    setLocking(true);
    setLockError(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'lock',
          vehicleId: vehicle.id,
          pickupBranchId,
          returnBranchId: pickupBranchId,
          startAt,
          endAt,
          protectionPlanPublicId: selectedProtection || undefined,
          addonSelections: buildAddonSelections(addonQtys),
          promoCode: promoCode.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { publicId?: string; error?: string };
      if (!res.ok || !data.publicId) {
        throw new Error(data.error ?? 'Could not lock quote rate');
      }
      router.push(`/checkout?quote=${data.publicId}`);
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Unable to lock reservation');
    } finally {
      setLocking(false);
    }
  }

  // Convert protection plans to ProtectionTier format
  const protectionTiers = useMemo<ProtectionTier[]>(() => {
    return protectionPlans.map((p) => {
      const isRecommended = p.tier === 1;
      const featuresList: ProtectionFeature[] = [
        { text: 'Third-party liability & bodily injury cover', included: true },
        { text: '24/7 kerbside roadside breakdown assistance', included: true },
        {
          text:
            p.excessMinor === 0
              ? 'Zero excess liability (nil deductible)'
              : `Security excess ₹${(p.excessMinor / 100).toLocaleString('en-IN')}`,
          included: p.excessMinor === 0,
        },
        { text: 'Windscreen, side glass & tyre puncture cover', included: p.tier >= 1 },
        { text: 'Lost key replacement & lock-out service', included: p.tier >= 2 },
      ];

      return {
        id: p.publicId,
        name: p.name,
        summary: p.summary,
        dailyMinor: p.perDayMinor,
        excessMinor: p.excessMinor,
        recommended: isRecommended,
        features: featuresList,
      };
    });
  }, [protectionPlans]);

  // Convert quote lines to QuotePanel add-ons items
  const quotePanelAddOns = useMemo<QuoteItem[]>(() => {
    return currentQuote.lines
      .filter((line: QuoteLineItem) => line.kind !== 'base' && line.kind !== 'tax')
      .map((line: QuoteLineItem, idx: number) => ({
        id: `${line.kind}-${idx}`,
        label: line.label,
        amountMinor: line.amountMinor,
      }));
  }, [currentQuote.lines]);

  // Build live SlipData for ReceiptPaper
  const quoteSlip = useMemo<SlipData>(() => {
    return slipFromQuote({
      referenceCode: 'EST-PREVIEW',
      quote: currentQuote,
      vehicleName: `${vehicle.make} ${vehicle.model}`,
      vehiclePlate: vehicle.plate,
      vehicleCategory: vehicle.category,
      branchPickup: vehicle.branch_name,
      branchReturn: vehicle.branch_name,
      startAt,
      endAt,
    });
  }, [currentQuote, vehicle, startAt, endAt]);

  const actionButton = (
    <div className="space-y-2">
      {lockError && (
        <div className="rounded-s border border-danger/30 bg-danger-subtle px-3 py-2 text-label-s text-danger">
          {lockError}
        </div>
      )}
      <Button
        type="button"
        variant="racing"
        size="lg"
        disabled={!available || locking || loadingQuote}
        onClick={() => void handleReserve()}
        className="w-full"
      >
        <span>
          {locking
            ? 'Locking reservation rate...'
            : available
              ? 'Continue to checkout'
              : 'Dates unavailable'}
        </span>
        <ArrowRight size={18} weight="bold" />
      </Button>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Column: Gallery, Specs, Protection, Addons, Reviews */}
      <div className="space-y-10 lg:col-span-7">
        {/* Studio Gallery Carousel */}
        <section aria-label="Vehicle studio images">
          <Gallery images={galleryImages} />
        </section>

        {/* Vehicle Description */}
        {description && (
          <section className="space-y-2">
            <h2 className="font-display text-h3 font-semibold text-text-1">Vehicle overview</h2>
            <p className="text-body text-text-2 leading-relaxed">{description}</p>
          </section>
        )}

        {/* Sibling Variants */}
        {siblingVariants.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-h3 font-semibold text-text-1">Available trims</h2>
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-s border border-racing-green bg-racing-green-subtle px-3 py-2 text-label-s font-semibold text-racing-green shadow-e0">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-border-subtle shrink-0"
                  style={{ backgroundColor: vehicle.paint_hex }}
                />
                <span>
                  {vehicle.variant ?? 'Standard'} ({vehicle.transmission}, {vehicle.fuel_type})
                </span>
              </span>
              {siblingVariants.map((sv) => (
                <Link
                  key={sv.slug}
                  href={`/cars/${sv.slug}?start=${startAt}&end=${endAt}`}
                  className="inline-flex items-center gap-2 rounded-s border border-border bg-surface px-3 py-2 text-label-s font-medium text-text-2 hover:border-border-strong hover:text-text-1 transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-border-subtle shrink-0"
                    style={{ backgroundColor: sv.paint_hex }}
                  />
                  <span>
                    {sv.variant ?? 'Standard'} ({sv.transmission}, {sv.fuel_type})
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Comprehensive SpecSheet */}
        <section className="space-y-4">
          <h2 className="font-display text-h3 font-semibold text-text-1">Technical sheet</h2>
          <SpecSheet rows={specItems} columns={2} />
        </section>

        {/* Equipment Included */}
        {features.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-h3 font-semibold text-text-1">Equipment included</h2>
            <div className="flex flex-wrap gap-2">
              {features.map((f) => (
                <span
                  key={f.label}
                  className="rounded-s border border-border-subtle bg-surface px-3 py-1.5 text-label-s font-medium text-text-2"
                >
                  {f.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Protection Plans Selection */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} weight="bold" className="text-racing-green" />
            <h2 className="font-display text-h3 font-semibold text-text-1">
              Choose protection cover
            </h2>
          </div>
          <ProtectionCards
            tiers={protectionTiers}
            selectedTierId={selectedProtection}
            onSelectTier={(tierId) => {
              setSelectedProtection(tierId);
              void refreshPreview(tierId, addonQtys, promoCode);
            }}
          />
        </section>

        {/* Optional Add-ons */}
        {addons.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-h3 font-semibold text-text-1">
              Optional equipment & add-ons
            </h2>
            <div className="space-y-3">
              {addons.map((a) => {
                const qty = addonQtys[a.publicId] ?? 0;
                return (
                  <div
                    key={a.publicId}
                    className="flex items-center justify-between gap-4 rounded-m border border-border-subtle bg-surface p-4 shadow-e0 transition-all hover:border-border"
                  >
                    <div>
                      <div className="font-display text-body-s font-semibold text-text-1">
                        {a.name}
                      </div>
                      {a.description && (
                        <div className="text-caption text-text-3">{a.description}</div>
                      )}
                      <div className="mt-1 text-label-s font-medium text-text-2">
                        <Price amountMinor={a.priceMinor} size="sm" />
                        <span className="text-text-3">
                          {' '}
                          ({a.priceType === 'per_day' ? 'per day' : 'one-time flat'})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Decrease ${a.name}`}
                        disabled={qty === 0}
                        onClick={() => {
                          const next = { ...addonQtys, [a.publicId]: Math.max(0, qty - 1) };
                          setAddonQtys(next);
                          void refreshPreview(selectedProtection, next, promoCode);
                        }}
                        className="h-8 w-8 !p-0 flex items-center justify-center"
                      >
                        <Minus size={14} weight="bold" />
                      </Button>
                      <span className="w-6 text-center text-body-s font-semibold tabular-nums text-text-1">
                        {qty}
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Increase ${a.name}`}
                        disabled={qty >= a.maxQty}
                        onClick={() => {
                          const next = { ...addonQtys, [a.publicId]: Math.min(a.maxQty, qty + 1) };
                          setAddonQtys(next);
                          void refreshPreview(selectedProtection, next, promoCode);
                        }}
                        className="h-8 w-8 !p-0 flex items-center justify-center"
                      >
                        <Plus size={14} weight="bold" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Promotion Code Section */}
        <section className="space-y-3 rounded-m border border-border-subtle bg-surface p-4 shadow-e0">
          <h2 className="font-display text-body font-semibold text-text-1">
            Have a promotion code?
          </h2>
          <div className="flex gap-2">
            <TextField
              aria-label="Promotion code"
              placeholder="e.g. WELCOME10"
              value={promoCode}
              onChange={setPromoCode}
              prefix={<Tag size={16} className="text-text-3" />}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={loadingQuote || !promoCode.trim()}
              onClick={() => void refreshPreview(selectedProtection, addonQtys, promoCode)}
            >
              Apply
            </Button>
          </div>
          {promoError && <p className="text-caption font-medium text-danger">{promoError}</p>}
        </section>

        {/* Verified Driver Reviews */}
        {reviews.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-h3 font-semibold text-text-1">
              Verified driver notes
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.map((rev, i) => (
                <div
                  key={`${rev.author_name}-${i}`}
                  className="rounded-m border border-border-subtle bg-surface p-4 text-body-s shadow-e0"
                >
                  <div className="flex items-center justify-between text-label-s text-text-3">
                    <span className="font-semibold text-text-1">{rev.author_name}</span>
                    <span className="tabular-nums">Condition {rev.rating_condition}/5</span>
                  </div>
                  {rev.comment && (
                    <p className="mt-2 text-label-s text-text-2 leading-relaxed">{rev.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right Column: Sticky QuotePanel & Thermal Receipt Estimate */}
      <div className="lg:col-span-5">
        <aside className="space-y-4 lg:sticky lg:top-24">
          {/* Header with Status Badge */}
          <div className="flex items-center justify-between rounded-m border border-border-subtle bg-surface px-4 py-3 shadow-e0">
            <span className="text-label-s font-medium text-text-3">Vehicle availability</span>
            <StatusBadge status={available ? 'ready' : 'hold'} />
          </div>

          {/* View Mode Toggle: Summary vs Thermal Receipt */}
          <SegmentedControl
            name="estimate-mode"
            aria-label="Estimate display mode"
            value={estimateMode}
            onValueChange={(val) => setEstimateMode(val as 'quote' | 'receipt')}
            options={[
              { value: 'quote', label: 'Price summary' },
              { value: 'receipt', label: 'Thermal receipt slip' },
            ]}
            className="w-full"
          />

          <div className="flex flex-col justify-between" style={{ minHeight: 540 }}>
            {estimateMode === 'quote' ? (
              <QuotePanel
                rentalDays={currentQuote.billableDays}
                dailyRateMinor={Math.round(
                  currentQuote.baseTotalMinor / Math.max(1, currentQuote.billableDays),
                )}
                addOns={quotePanelAddOns}
                taxesMinor={currentQuote.taxMinor}
                depositMinor={currentQuote.depositMinor}
                action={actionButton}
              />
            ) : (
              <div className="flex flex-col items-center justify-between rounded-l border border-border bg-surface p-5 shadow-e1 h-full">
                <div className="mb-4 text-center">
                  <h3 className="font-display text-h4 font-semibold text-text-1">
                    Interactive quote slip
                  </h3>
                  <p className="text-caption text-text-3">
                    Live verified rate slip with simulated thermal paper & barcode
                  </p>
                </div>

                <div className="w-full flex justify-center overflow-x-auto py-1">
                  <ReceiptPaper slip={quoteSlip} tornTop={true} tornBottom={true} />
                </div>

                <div className="mt-6 w-full">{actionButton}</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
