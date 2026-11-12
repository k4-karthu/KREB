'use client';

import { ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { QuoteLineItem } from '@/domain/pricing/pricing';
import { Button } from '@/ui/primitives/Button';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

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

export function VehicleDetailClient({
  vehicleId,
  pickupBranchId,
  startAt,
  endAt,
  initialAvailable,
  initialLines,
  initialTotalMinor,
  initialDepositMinor,
  addons,
  protectionPlans,
}: {
  vehicleId: number;
  pickupBranchId: number;
  startAt: number;
  endAt: number;
  initialAvailable: boolean;
  initialLines: QuoteLineItem[];
  initialTotalMinor: number;
  initialDepositMinor: number;
  addons: AddonOption[];
  protectionPlans: ProtectionOption[];
}) {
  const router = useRouter();
  const [selectedProtection, setSelectedProtection] = useState<string>(
    protectionPlans[0]?.publicId ?? '',
  );
  const [addonQtys, setAddonQtys] = useState<Record<string, number>>({});
  const [promoCode, setPromoCode] = useState('');
  const [lines, setLines] = useState<QuoteLineItem[]>(initialLines);
  const [totalMinor, setTotalMinor] = useState(initialTotalMinor);
  const [depositMinor, setDepositMinor] = useState(initialDepositMinor);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [available, setAvailable] = useState(initialAvailable);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

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
          vehicleId,
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
        quote?: {
          lines: QuoteLineItem[];
          totalMinor: number;
          depositMinor: number;
          promoError?: string | null;
        };
      };
      if (data.quote) {
        setLines(data.quote.lines);
        setTotalMinor(data.quote.totalMinor);
        setDepositMinor(data.quote.depositMinor);
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
          vehicleId,
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
        throw new Error(data.error ?? 'Could not lock quote');
      }
      router.push(`/checkout?quote=${data.publicId}`);
    } catch (err) {
      setLockError(err instanceof Error ? err.message : 'Unable to reserve');
    } finally {
      setLocking(false);
    }
  }

  return (
    <aside className="space-y-6 rounded-m border border-line bg-surface p-5 lg:sticky lg:top-24">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="text-xs font-medium text-ink-muted">Guaranteed trip total</div>
          <MoneyText amountMinor={totalMinor} size="large" className="text-3xl text-ink" />
          <div className="text-xs text-ink-muted">
            Includes GST. Refundable deposit: <MoneyText amountMinor={depositMinor} />
          </div>
        </div>
        <StatusBadge status={available ? 'ready' : 'hold'} />
      </div>

      {/* Protection */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <ShieldCheck className="h-4 w-4 text-petrol-700" /> Protection level
        </div>
        <div className="grid gap-2">
          {protectionPlans.map((p) => {
            const active = selectedProtection === p.publicId;
            return (
              <button
                key={p.publicId}
                type="button"
                onClick={() => {
                  setSelectedProtection(p.publicId);
                  void refreshPreview(p.publicId, addonQtys, promoCode);
                }}
                className={`flex items-center justify-between rounded-s border p-2.5 text-left text-xs ${
                  active
                    ? 'border-petrol-600 bg-petrol-100 text-petrol-900'
                    : 'border-line bg-surface-subtle text-ink'
                }`}
              >
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-ink-muted">
                    Excess: <MoneyText amountMinor={p.excessMinor} />
                  </div>
                </div>
                <span className="font-semibold tabular-nums">
                  {p.perDayMinor === 0 ? 'Included' : <MoneyText amountMinor={p.perDayMinor} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add-ons */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-ink">Optional add-ons</div>
        <div className="space-y-2">
          {addons.map((a) => {
            const qty = addonQtys[a.publicId] ?? 0;
            return (
              <div
                key={a.publicId}
                className="flex items-center justify-between gap-2 rounded-s border border-line bg-surface-subtle px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-medium text-ink">{a.name}</div>
                  <div className="text-ink-muted">
                    <MoneyText amountMinor={a.priceMinor} /> (
                    {a.priceType === 'per_day' ? 'per day' : 'flat'})
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...addonQtys, [a.publicId]: Math.max(0, qty - 1) };
                      setAddonQtys(next);
                      void refreshPreview(selectedProtection, next, promoCode);
                    }}
                    className="h-6 w-6 rounded-s border border-line bg-surface text-xs font-bold"
                    aria-label={`Remove ${a.name}`}
                  >
                    -
                  </button>
                  <span className="w-4 text-center tabular-nums font-medium">{qty}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...addonQtys, [a.publicId]: Math.min(a.maxQty, qty + 1) };
                      setAddonQtys(next);
                      void refreshPreview(selectedProtection, next, promoCode);
                    }}
                    className="h-6 w-6 rounded-s border border-line bg-surface text-xs font-bold"
                    aria-label={`Add ${a.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Promo code */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <Tag className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-muted" />
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Promo code (e.g. WELCOME10)"
              className="h-9 w-full rounded-s border border-line bg-surface-subtle pl-8 pr-2.5 font-mono text-xs"
            />
          </label>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={loadingQuote}
            onClick={() => void refreshPreview(selectedProtection, addonQtys, promoCode)}
          >
            Apply
          </Button>
        </div>
        {promoError && <p className="text-xs text-stop-600">{promoError}</p>}
      </div>

      {/* Itemized lines */}
      <div className="space-y-1.5 border-t border-line pt-3 text-xs">
        {lines.map((line, i) => (
          <div key={`${line.kind}-${i}`} className="flex items-center justify-between gap-2">
            <span className="text-ink-muted">{line.label}</span>
            <MoneyText amountMinor={line.amountMinor} className="font-medium text-ink" />
          </div>
        ))}
      </div>

      {lockError && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
          {lockError}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!available || locking || loadingQuote}
        onClick={() => void handleReserve()}
      >
        <span>
          {locking ? 'Locking quote...' : available ? 'Continue to checkout' : 'Dates unavailable'}
        </span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </aside>
  );
}
