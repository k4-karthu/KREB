'use client';

import { Plus } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Button } from '@/ui/primitives/Button';
import { Select, type SelectOption } from '@/ui/primitives/Select';
import { TextField } from '@/ui/primitives/TextField';

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

const ADDON_TYPE_OPTIONS: SelectOption[] = [
  { id: 'per_day', label: 'Per Day' },
  { id: 'flat', label: 'Flat per trip' },
];

const PROMO_KIND_OPTIONS: SelectOption[] = [
  { id: 'percent', label: 'Percent (bp, 1000 = 10%)' },
  { id: 'flat', label: 'Flat paise (50000 = ₹500)' },
];

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
        <h1 className="font-display text-h3 font-bold text-text-1">Pricing, Rules & Add-ons</h1>
        <p className="text-body-s text-text-3">
          All monetary rates are strictly maintained in integer paise. Existing bookings and valid
          quotes retain locked rates.
        </p>
      </div>

      {error && (
        <div className="rounded-xs border border-danger/30 bg-danger-subtle p-3 text-body-s text-danger">
          {error}
        </div>
      )}

      {/* Rate Plans Section */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <h2 className="text-h4 font-display font-semibold text-text-1">Base Rate Plans</h2>
        <div className="divide-y divide-border-subtle">
          {ratePlans.map((rp) => (
            <div
              key={rp.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-body-s"
            >
              <div>
                <div className="font-semibold text-text-1">{rp.name}</div>
                <div className="text-caption text-text-3">Base daily rental schedule</div>
              </div>
              <div className="flex items-center gap-4">
                <Price minorUnits={rp.base_daily_minor} className="font-bold text-text-1" />
                <StatusBadge status={rp.is_active ? 'active' : 'paused'} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Surcharges & Calendar Rules */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <h2 className="text-h4 font-display font-semibold text-text-1">
          Seasonal & Calendar Rules
        </h2>
        <div className="divide-y divide-border-subtle">
          {rules.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-body-s"
            >
              <div>
                <div className="font-semibold text-text-1">{r.label}</div>
                <div className="text-caption text-text-3">
                  {r.kind.replaceAll('_', ' ')} ·{' '}
                  {r.multiplier_bp
                    ? `${(r.multiplier_bp / 100).toFixed(0)}% multiplier on base`
                    : `+₹${((r.flat_add_minor ?? 0) / 100).toFixed(0)} flat adjustment`}
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant={r.is_active ? 'secondary' : 'primary'}
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

      {/* Optional Add-ons */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <h2 className="text-h4 font-display font-semibold text-text-1">
          Customer Add-ons & Equipment
        </h2>
        <div className="divide-y divide-border-subtle">
          {addons.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-body-s"
            >
              <div>
                <div className="font-semibold text-text-1">{a.name}</div>
                <div className="text-caption text-text-3">
                  <Price minorUnits={a.price_minor} /> (
                  {a.price_type === 'per_day' ? 'per rental day' : 'flat fee per trip'})
                </div>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant={a.is_active ? 'secondary' : 'primary'}
                  onClick={() =>
                    void postAction({ action: 'toggle_addon', id: a.id, isActive: !a.is_active })
                  }
                >
                  {a.is_active ? 'Deactivate' : 'Activate'}
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
            className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_160px_160px_auto] items-end"
          >
            <TextField
              label="Add-on Name"
              placeholder="e.g. Roof Cargo Box, Child Seat"
              value={addonForm.name}
              onChange={(val) => setAddonForm((prev) => ({ ...prev, name: val }))}
              required
            />
            <Select
              label="Price Model"
              selectedKey={addonForm.priceType}
              onSelectionChange={(key) =>
                setAddonForm((prev) => ({ ...prev, priceType: String(key) }))
              }
              options={ADDON_TYPE_OPTIONS}
            />
            <TextField
              label="Price (Paise)"
              type="number"
              value={addonForm.priceMinor}
              onChange={(val) => setAddonForm((prev) => ({ ...prev, priceMinor: val }))}
              required
            />
            <Button type="submit" size="sm" className="gap-1.5 h-10">
              <Plus size={16} weight="bold" />
              <span>Add</span>
            </Button>
          </form>
        )}
      </section>

      {/* Promotional Codes */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <h2 className="text-h4 font-display font-semibold text-text-1">Promo & Partner Codes</h2>
        <div className="divide-y divide-border-subtle">
          {promoCodes.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-body-s"
            >
              <div className="flex flex-wrap items-center gap-4">
                <span className="tabular-nums font-bold text-text-1  bg-surface-sunken px-2.5 py-1 rounded-xs border border-border-subtle">
                  {p.code}
                </span>
                <span className="text-caption text-text-3">
                  {p.kind === 'percent'
                    ? `${(p.value / 100).toFixed(0)}% discount`
                    : `₹${(p.value / 100).toFixed(0)} flat reduction`}
                </span>
                <span className="text-caption text-text-3">Min {p.min_days} rental days</span>
                <span className="text-caption text-text-3">Redeemed: {p.used_count} times</span>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  size="sm"
                  variant={p.is_active ? 'secondary' : 'primary'}
                  onClick={() =>
                    void postAction({ action: 'toggle_promo', id: p.id, isActive: !p.is_active })
                  }
                >
                  {p.is_active ? 'Deactivate' : 'Activate'}
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
                code: promoForm.code.toUpperCase(),
                kind: promoForm.kind,
                value: Number(promoForm.value),
                minDays: Number(promoForm.minDays),
                appliesTo: 'base',
                maxUses: null,
              }).then(() =>
                setPromoForm({ code: '', kind: 'percent', value: '1000', minDays: '2' }),
              );
            }}
            className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_200px_120px_100px_auto] items-end"
          >
            <TextField
              label="Promo Code"
              placeholder="e.g. MONSOON20"
              value={promoForm.code}
              onChange={(val) => setPromoForm((prev) => ({ ...prev, code: val.toUpperCase() }))}
              required
            />
            <Select
              label="Discount Type"
              selectedKey={promoForm.kind}
              onSelectionChange={(key) => setPromoForm((prev) => ({ ...prev, kind: String(key) }))}
              options={PROMO_KIND_OPTIONS}
            />
            <TextField
              label="Value"
              type="number"
              value={promoForm.value}
              onChange={(val) => setPromoForm((prev) => ({ ...prev, value: val }))}
              required
            />
            <TextField
              label="Min Days"
              type="number"
              value={promoForm.minDays}
              onChange={(val) => setPromoForm((prev) => ({ ...prev, minDays: val }))}
              required
            />
            <Button type="submit" size="sm" className="gap-1.5 h-10">
              <Plus size={16} weight="bold" />
              <span>Create</span>
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
