'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { Dialog } from '@/ui/primitives/Dialog';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

export interface FleetRow {
  id: number;
  public_id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  plate: string;
  category: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  paint_name: string;
  paint_hex: string;
  lifecycle: string;
  ops_state: string;
  odometer_km: number;
  home_branch_name: string;
  rate_plan_name: string;
  base_daily_minor: number;
  primary_file_key: string | null;
  image_count: number;
  next_doc_expiry: string | null;
}

interface BranchOption {
  id: number;
  name: string;
}

interface RatePlanOption {
  id: number;
  name: string;
  base_daily_minor: number;
}

export function FleetClient({
  vehicles,
  branches,
  ratePlans,
  canEdit,
}: {
  vehicles: FleetRow[];
  branches: BranchOption[];
  ratePlans: RatePlanOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lifecycleFilter, setLifecycleFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    make: '',
    model: '',
    variant: '',
    year: 2025,
    plate: '',
    homeBranchId: branches[0]?.id ?? 1,
    category: 'hatchback',
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: 5,
    paintName: 'Arctic White',
    paintHex: '#EAECEF',
    ratePlanId: ratePlans[0]?.id ?? 1,
    depositMinor: 500000,
    kmPerDay: 250,
    extraKmMinor: 1200,
    lifecycle: 'active',
    description: '',
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;
      if (lifecycleFilter !== 'all' && v.lifecycle !== lifecycleFilter) return false;
      if (!q) return true;
      return `${v.make} ${v.model} ${v.variant ?? ''} ${v.plate} ${v.home_branch_name}`
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, query, categoryFilter, lifecycleFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: Number(form.year),
          seats: Number(form.seats),
          homeBranchId: Number(form.homeBranchId),
          ratePlanId: Number(form.ratePlanId),
          depositMinor: Number(form.depositMinor),
          kmPerDay: Number(form.kmPerDay) || null,
          extraKmMinor: Number(form.extraKmMinor),
        }),
      });
      const data = (await res.json()) as { id?: number; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? 'Could not create vehicle');
      }
      setCreateOpen(false);
      router.push(`/admin/fleet/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Fleet inventory
          </h1>
          <p className="text-sm text-ink-muted">
            {vehicles.length} vehicles registered across {branches.length} branches.
          </p>
        </div>
        {canEdit && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add vehicle
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-m border border-line bg-surface p-3">
        <label className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search make, model, plate, or branch..."
            className="h-10 w-full rounded-s border border-line bg-surface-subtle pl-9 pr-3 text-sm text-ink"
          />
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="h-10 rounded-s border border-line bg-surface-subtle px-3 text-sm text-ink"
        >
          <option value="all">All categories</option>
          <option value="hatchback">Hatchback</option>
          <option value="sedan">Sedan</option>
          <option value="suv">SUV</option>
          <option value="muv">MUV</option>
          <option value="luxury">Luxury</option>
          <option value="ev">EV</option>
          <option value="van">Van</option>
        </select>
        <select
          value={lifecycleFilter}
          onChange={(e) => setLifecycleFilter(e.target.value)}
          aria-label="Filter by lifecycle"
          className="h-10 rounded-s border border-line bg-surface-subtle px-3 text-sm text-ink"
        >
          <option value="all">All states</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-m border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">Daily base</th>
              <th className="px-4 py-3">Photos</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((v) => (
              <tr key={v.id} className="hover:bg-surface-subtle/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-16 shrink-0 overflow-hidden rounded-s border border-line"
                      style={{ backgroundColor: v.paint_hex }}
                    >
                      {v.primary_file_key && (
                        <img
                          src={`/api/uploads/public/${v.primary_file_key}-640.webp`}
                          alt={`${v.make} ${v.model}`}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-ink">
                        {v.make} {v.model}
                      </div>
                      <div className="flex flex-wrap gap-x-2 text-xs text-ink-muted">
                        <span>{v.year}</span>
                        <span>{v.variant ?? v.category}</span>
                        <span>{v.transmission}</span>
                        <span>{v.fuel_type}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Plate code={v.plate} />
                </td>
                <td className="px-4 py-3 text-ink-muted">{v.home_branch_name}</td>
                <td className="px-4 py-3 tabular-nums">
                  <MoneyText amountMinor={v.base_daily_minor} />
                  <span className="text-xs text-ink-muted"> /day</span>
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-muted">
                  {v.image_count} {v.image_count === 1 ? 'photo' : 'photos'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={v.lifecycle} />
                    {v.ops_state !== 'ready' && <StatusBadge status={v.ops_state} />}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/fleet/${v.id}`}
                    className="inline-flex h-8 items-center rounded-s border border-line px-3 text-xs font-medium text-ink hover:bg-surface-subtle"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add a vehicle to the fleet"
        description="Save core specifications first, then upload studio photographs and compliance records."
      >
        <form onSubmit={handleCreate} className="space-y-3">
          {error && (
            <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
              {error}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Make</span>
              <input
                required
                value={form.make}
                onChange={(e) => setForm({ ...form, make: e.target.value })}
                placeholder="Honda"
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Model</span>
              <input
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                placeholder="City"
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Variant</span>
              <input
                value={form.variant}
                onChange={(e) => setForm({ ...form, variant: e.target.value })}
                placeholder="ZX CVT"
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Plate number</span>
              <input
                required
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value })}
                placeholder="KA03NF1024"
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 font-mono text-sm"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              >
                <option value="hatchback">Hatchback</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="muv">MUV</option>
                <option value="luxury">Luxury</option>
                <option value="ev">EV</option>
                <option value="van">Van</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Home branch</span>
              <select
                value={form.homeBranchId}
                onChange={(e) => setForm({ ...form, homeBranchId: Number(e.target.value) })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Transmission</span>
              <select
                value={form.transmission}
                onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Fuel type</span>
              <select
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
                <option value="cng">CNG</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Rate plan</span>
              <select
                value={form.ratePlanId}
                onChange={(e) => setForm({ ...form, ratePlanId: Number(e.target.value) })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              >
                {ratePlans.map((rp) => (
                  <option key={rp.id} value={rp.id}>
                    {rp.name} (INR {Math.round(rp.base_daily_minor / 100)}/day)
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Paint name</span>
              <input
                required
                value={form.paintName}
                onChange={(e) => setForm({ ...form, paintName: e.target.value })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Paint hex</span>
              <input
                required
                type="color"
                value={form.paintHex}
                onChange={(e) => setForm({ ...form, paintHex: e.target.value })}
                className="h-9 w-full rounded-s border border-line bg-surface px-1"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-ink">
              <span>Deposit (paise)</span>
              <input
                type="number"
                required
                value={form.depositMinor}
                onChange={(e) => setForm({ ...form, depositMinor: Number(e.target.value) })}
                className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm tabular-nums"
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs font-medium text-ink">
            <span>Notes for customers</span>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-s border border-line bg-surface p-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="tertiary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Create & upload photos'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
