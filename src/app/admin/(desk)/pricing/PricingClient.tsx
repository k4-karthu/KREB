'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

interface PricingProps {
  ratePlans: Array<{ id: number; name: string; base_daily_minor: number; is_active: number }>;
  rules: Array<{
    id: number;
    kind: string;
    label: string;
    multiplier_bp: number | null;
    flat_add_minor: number | null;
    is_active: number;
  }>;
  addons: Array<{
    id: number;
    name: string;
    price_type: string;
    price_minor: number;
    max_qty: number;
    is_active: number;
  }>;
  promoCodes: Array<{
    id: number;
    code: string;
    kind: string;
    value: number;
    min_days: number;
    used_count: number;
    max_uses: number | null;
    is_active: number;
  }>;
  canEdit: boolean;
}

export function PricingClient({ ratePlans, rules, addons, promoCodes, canEdit }: PricingProps) {
  const router = useRouter();
  const [promoForm, setPromoForm] = useState({
    code: '',
    kind: 'percent',
    value: '1000',
    minDays: '2',
  });
  const [addonForm, setAddonForm] = useState({
    name: '',
    priceType: 'per_day',
    priceMinor: '35000',
  });
  const [error, setError] = useState<string | null>(null);

  async function postAction(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/admin/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Update failed');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Pricing, Rules & Add-ons
        </h1>
        <p className="text-sm text-ink-muted">
          All monetary rates are stored in integer paise. Existing quotes remain locked until
          expiry.
        </p>
      </div>

      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-sm text-stop-600">
          {error}
        </p>
      )}

      <section className="space-y-3 rounded-m border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Rate plans</h2>
        <div className="divide-y divide-line">
          {ratePlans.map((rp) => (
            <div
              key={rp.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium text-ink">{rp.name}</div>
                <div className="text-xs text-ink-muted">Base daily rate</div>
              </div>
              <div className="flex items-center gap-3">
                <MoneyText amountMinor={rp.base_daily_minor} className="font-semibold" />
                <StatusBadge status={rp.is_active ? 'active' : 'paused'} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-m border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Calendar & weekend rules</h2>
        <div className="divide-y divide-line">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <div className="font-medium text-ink">{r.label}</div>
                <div className="text-xs text-ink-muted">
                  {r.kind.replaceAll('_', ' ')} ·{' '}
                  {r.multiplier_bp
                    ? `${(r.multiplier_bp / 100).toFixed(0)}% of base`
                    : `+${r.flat_add_minor ?? 0} paise`}
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void postAction({ action: 'toggle_rule', id: r.id, isActive: !r.is_active })
                  }
                >
                  {r.is_active ? 'Disable' : 'Enable'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-m border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Optional add-ons</h2>
        <div className="divide-y divide-line">
          {addons.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div>
                <div className="font-medium text-ink">{a.name}</div>
                <div className="text-xs text-ink-muted">
                  <MoneyText amountMinor={a.price_minor} /> (
                  {a.price_type === 'per_day' ? 'per day' : 'flat per trip'})
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void postAction({ action: 'toggle_addon', id: a.id, isActive: !a.is_active })
                  }
                >
                  {a.is_active ? 'Active' : 'Disabled'}
                </Button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void postAction({
                action: 'create_addon',
                name: addonForm.name,
                description: null,
                priceType: addonForm.priceType,
                priceMinor: Number(addonForm.priceMinor),
                maxQty: 1,
              }).then(() => setAddonForm({ name: '', priceType: 'per_day', priceMinor: '35000' }));
            }}
            className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <input
              required
              placeholder="New add-on name"
              value={addonForm.name}
              onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
              className="h-9 rounded-s border border-line bg-surface-subtle px-3 text-sm"
            />
            <select
              value={addonForm.priceType}
              onChange={(e) => setAddonForm({ ...addonForm, priceType: e.target.value })}
              className="h-9 rounded-s border border-line bg-surface-subtle px-2.5 text-sm"
            >
              <option value="per_day">Per day</option>
              <option value="flat">Flat</option>
            </select>
            <input
              type="number"
              required
              value={addonForm.priceMinor}
              onChange={(e) => setAddonForm({ ...addonForm, priceMinor: e.target.value })}
              className="h-9 w-32 rounded-s border border-line bg-surface-subtle px-2.5 text-sm tabular-nums"
            />
            <Button type="submit" size="sm">
              Add
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-4 rounded-m border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Promo codes</h2>
        <div className="divide-y divide-line">
          {promoCodes.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono font-semibold text-ink">{p.code}</span>
                <span className="text-xs text-ink-muted">
                  {p.kind === 'percent'
                    ? `${(p.value / 100).toFixed(0)}% off`
                    : `${p.value / 100} INR flat`}
                </span>
                <span className="text-xs text-ink-muted">Min {p.min_days} days</span>
                <span className="text-xs text-ink-muted">Used {p.used_count}</span>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    void postAction({ action: 'toggle_promo', id: p.id, isActive: !p.is_active })
                  }
                >
                  {p.is_active ? 'Active' : 'Inactive'}
                </Button>
              )}
            </div>
          ))}
        </div>
        {canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void postAction({
                action: 'create_promo',
                code: promoForm.code,
                kind: promoForm.kind,
                value: Number(promoForm.value),
                minDays: Number(promoForm.minDays),
                appliesTo: 'base',
                maxUses: null,
              }).then(() =>
                setPromoForm({ code: '', kind: 'percent', value: '1000', minDays: '2' }),
              );
            }}
            className="grid gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
          >
            <input
              required
              placeholder="PROMO CODE"
              value={promoForm.code}
              onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
              className="h-9 rounded-s border border-line bg-surface-subtle px-3 font-mono text-sm"
            />
            <select
              value={promoForm.kind}
              onChange={(e) => setPromoForm({ ...promoForm, kind: e.target.value })}
              className="h-9 rounded-s border border-line bg-surface-subtle px-2.5 text-sm"
            >
              <option value="percent">Percent (bp)</option>
              <option value="flat">Flat (paise)</option>
            </select>
            <input
              type="number"
              required
              value={promoForm.value}
              onChange={(e) => setPromoForm({ ...promoForm, value: e.target.value })}
              className="h-9 w-28 rounded-s border border-line bg-surface-subtle px-2.5 text-sm tabular-nums"
            />
            <input
              type="number"
              required
              value={promoForm.minDays}
              onChange={(e) => setPromoForm({ ...promoForm, minDays: e.target.value })}
              className="h-9 w-20 rounded-s border border-line bg-surface-subtle px-2.5 text-sm tabular-nums"
            />
            <Button type="submit" size="sm">
              Create code
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
