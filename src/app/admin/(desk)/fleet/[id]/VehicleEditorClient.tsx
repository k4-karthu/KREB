'use client';

import { ArrowLeft, FilePlus2, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ImageManager, type VehicleImageRow } from '@/ui/components/ImageManager';
import { Button } from '@/ui/primitives/Button';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

interface VehicleDetail {
  id: number;
  public_id: string;
  slug: string;
  home_branch_id: number;
  current_branch_id: number;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  plate: string;
  category: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  luggage_liters: number | null;
  paint_name: string;
  paint_hex: string;
  rate_plan_id: number;
  deposit_minor: number;
  km_per_day: number | null;
  extra_km_minor: number;
  odometer_km: number;
  lifecycle: string;
  ops_state: string;
  description: string | null;
}

interface DocRow {
  id: number;
  kind: string;
  reference_no: string | null;
  issued_on: string | null;
  expires_on: string | null;
}

export function VehicleEditorClient({
  vehicle,
  images,
  documents: initialDocs,
  branches,
  ratePlans,
  allFeatures,
  selectedFeatureIds: initialFeatureIds,
  canEdit,
  canArchive,
}: {
  vehicle: VehicleDetail;
  images: VehicleImageRow[];
  documents: DocRow[];
  branches: Array<{ id: number; name: string }>;
  ratePlans: Array<{ id: number; name: string }>;
  allFeatures: Array<{ id: number; label: string }>;
  selectedFeatureIds: number[];
  canEdit: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant ?? '',
    year: vehicle.year,
    plate: vehicle.plate,
    homeBranchId: vehicle.home_branch_id,
    currentBranchId: vehicle.current_branch_id,
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuel_type,
    seats: vehicle.seats,
    luggageLiters: vehicle.luggage_liters ?? 300,
    paintName: vehicle.paint_name,
    paintHex: vehicle.paint_hex,
    ratePlanId: vehicle.rate_plan_id,
    depositMinor: vehicle.deposit_minor,
    kmPerDay: vehicle.km_per_day ?? 0,
    extraKmMinor: vehicle.extra_km_minor,
    odometerKm: vehicle.odometer_km,
    lifecycle: vehicle.lifecycle,
    opsState: vehicle.ops_state,
    description: vehicle.description ?? '',
  });
  const [featureIds, setFeatureIds] = useState<number[]>(initialFeatureIds);
  const [docs, setDocs] = useState<DocRow[]>(initialDocs);
  const [newDoc, setNewDoc] = useState({
    kind: 'insurance',
    referenceNo: '',
    expiresOn: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleFeature(id: number) {
    setFeatureIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kmPerDay: Number(form.kmPerDay) > 0 ? Number(form.kmPerDay) : null,
          featureIds,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save vehicle');
      setMessage('Vehicle details updated.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch(`/api/admin/vehicles/${vehicle.id}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: newDoc.kind,
        referenceNo: newDoc.referenceNo || null,
        expiresOn: newDoc.expiresOn || null,
      }),
    });
    const data = (await res.json()) as { id?: number; error?: string };
    if (!res.ok || !data.id) {
      setError(data.error ?? 'Could not add document');
      return;
    }
    setDocs((prev) => [
      {
        id: data.id as number,
        kind: newDoc.kind,
        reference_no: newDoc.referenceNo || null,
        issued_on: null,
        expires_on: newDoc.expiresOn || null,
      },
      ...prev,
    ]);
    setNewDoc({ kind: 'insurance', referenceNo: '', expiresOn: '' });
  }

  async function handleDeleteDoc(docId: number) {
    const res = await fetch(`/api/admin/vehicles/${vehicle.id}/documents?docId=${docId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    }
  }

  async function handleArchive() {
    const res = await fetch(`/api/admin/vehicles/${vehicle.id}`, { method: 'DELETE' });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Cannot archive vehicle');
      return;
    }
    router.push('/admin/fleet');
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/fleet"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to fleet
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <Plate code={vehicle.plate} paintHex={vehicle.paint_hex} />
            <StatusBadge status={vehicle.lifecycle} />
          </div>
        </div>
        {canArchive && (
          <Button type="button" variant="danger" size="sm" onClick={() => void handleArchive()}>
            <Trash2 className="h-4 w-4" /> Archive vehicle
          </Button>
        )}
      </div>

      {message && (
        <p className="rounded-s border border-go-600 bg-go-100 px-3 py-2 text-sm text-petrol-800">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-sm text-stop-600">
          {error}
        </p>
      )}

      <section className="rounded-m border border-line bg-surface p-5">
        <ImageManager vehicleId={vehicle.id} initialImages={images} />
      </section>

      <form onSubmit={handleSave} className="space-y-5 rounded-m border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Vehicle specifications & pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Make</span>
            <input
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Model</span>
            <input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Variant</span>
            <input
              value={form.variant}
              onChange={(e) => setForm({ ...form, variant: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Plate</span>
            <input
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 font-mono text-sm"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Current branch</span>
            <select
              value={form.currentBranchId}
              onChange={(e) => setForm({ ...form, currentBranchId: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Rate plan</span>
            <select
              value={form.ratePlanId}
              onChange={(e) => setForm({ ...form, ratePlanId: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            >
              {ratePlans.map((rp) => (
                <option key={rp.id} value={rp.id}>
                  {rp.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Lifecycle</span>
            <select
              value={form.lifecycle}
              onChange={(e) => setForm({ ...form, lifecycle: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            >
              <option value="draft">Draft (hidden)</option>
              <option value="active">Active (bookable)</option>
              <option value="retired">Retired</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Ops readiness</span>
            <select
              value={form.opsState}
              onChange={(e) => setForm({ ...form, opsState: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
            >
              <option value="ready">Ready</option>
              <option value="cleaning">Cleaning</option>
              <option value="inspection">Inspection</option>
              <option value="hold">Hold</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Odometer (km)</span>
            <input
              type="number"
              value={form.odometerKm}
              onChange={(e) => setForm({ ...form, odometerKm: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Deposit (paise)</span>
            <input
              type="number"
              value={form.depositMinor}
              onChange={(e) => setForm({ ...form, depositMinor: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Daily km allowance (0 = unlimited)</span>
            <input
              type="number"
              value={form.kmPerDay}
              onChange={(e) => setForm({ ...form, kmPerDay: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Paint name & hex</span>
            <div className="flex gap-2">
              <input
                value={form.paintName}
                onChange={(e) => setForm({ ...form, paintName: e.target.value })}
                className="h-9 flex-1 rounded-s border border-line bg-surface-subtle px-3 text-sm"
              />
              <input
                type="color"
                value={form.paintHex}
                onChange={(e) => setForm({ ...form, paintHex: e.target.value })}
                className="h-9 w-12 rounded-s border border-line bg-surface p-0.5"
              />
            </div>
          </label>
        </div>

        <label className="block space-y-1 text-xs font-medium text-ink">
          <span>Customer-facing notes</span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-s border border-line bg-surface-subtle p-2.5 text-sm"
          />
        </label>

        <div className="space-y-2">
          <div className="text-xs font-medium text-ink">Features</div>
          <div className="flex flex-wrap gap-2">
            {allFeatures.map((f) => {
              const checked = featureIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFeature(f.id)}
                  className={`rounded-s border px-3 py-1.5 text-xs font-medium ${
                    checked
                      ? 'border-petrol-600 bg-petrol-100 text-petrol-800'
                      : 'border-line bg-surface-subtle text-ink-muted'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </form>

      <section className="space-y-4 rounded-m border border-line bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Compliance documents</h2>
        <form
          onSubmit={handleAddDoc}
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Document type</span>
            <select
              value={newDoc.kind}
              onChange={(e) => setNewDoc({ ...newDoc, kind: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-2.5 text-sm"
            >
              <option value="registration">Registration (RC)</option>
              <option value="insurance">Insurance</option>
              <option value="road_tax">Road tax</option>
              <option value="emissions">Emissions (PUC)</option>
              <option value="permit">Permit</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Reference no.</span>
            <input
              value={newDoc.referenceNo}
              onChange={(e) => setNewDoc({ ...newDoc, referenceNo: e.target.value })}
              placeholder="INS-KA03..."
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-2.5 text-sm"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Expires on</span>
            <input
              type="date"
              value={newDoc.expiresOn}
              onChange={(e) => setNewDoc({ ...newDoc, expiresOn: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-2.5 text-sm"
            />
          </label>
          <Button type="submit" size="sm">
            <FilePlus2 className="h-4 w-4" /> Add record
          </Button>
        </form>

        <div className="divide-y divide-line rounded-s border border-line">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className="font-medium capitalize text-ink">{d.kind.replace('_', ' ')}</span>
                {d.reference_no && (
                  <span className="ml-2 font-mono text-xs text-ink-muted">{d.reference_no}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-ink-muted">
                  Expires: {d.expires_on ?? 'N/A'}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteDoc(d.id)}
                    className="text-xs text-stop-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
