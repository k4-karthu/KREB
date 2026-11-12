'use client';

import { ArrowLeft, FilePlus, FloppyDisk, Trash } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ImageManager, type VehicleImageRow } from '@/ui/components/ImageManager';
import { Plate } from '@/ui/data/Plate';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Button } from '@/ui/primitives/Button';
import { Select, type SelectOption } from '@/ui/primitives/Select';
import { TextField } from '@/ui/primitives/TextField';

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

const LIFECYCLE_OPTIONS: SelectOption[] = [
  { id: 'draft', label: 'Draft (Hidden from catalog)' },
  { id: 'active', label: 'Active (Bookable)' },
  { id: 'maintenance', label: 'Maintenance Hold' },
  { id: 'retired', label: 'Retired (Archived)' },
];

const OPS_STATE_OPTIONS: SelectOption[] = [
  { id: 'ready', label: 'Ready for handover' },
  { id: 'cleaning', label: 'Cleaning & Detailing' },
  { id: 'inspection', label: 'Return Inspection' },
  { id: 'hold', label: 'Operations Hold' },
];

const CATEGORY_OPTIONS: SelectOption[] = [
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'ev', label: 'EV' },
];

const TRANSMISSION_OPTIONS: SelectOption[] = [
  { id: 'automatic', label: 'Automatic' },
  { id: 'manual', label: 'Manual' },
];

const FUEL_OPTIONS: SelectOption[] = [
  { id: 'petrol', label: 'Petrol' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'electric', label: 'Electric' },
  { id: 'hybrid', label: 'Hybrid' },
];

const DOC_TYPE_OPTIONS: SelectOption[] = [
  { id: 'registration', label: 'Registration (RC)' },
  { id: 'insurance', label: 'Insurance Policy' },
  { id: 'road_tax', label: 'Road Tax Certificate' },
  { id: 'emissions', label: 'Pollution Under Control (PUC)' },
  { id: 'permit', label: 'All India Tourist Permit' },
];

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
    year: String(vehicle.year),
    plate: vehicle.plate,
    homeBranchId: String(vehicle.home_branch_id),
    currentBranchId: String(vehicle.current_branch_id),
    category: vehicle.category,
    transmission: vehicle.transmission,
    fuelType: vehicle.fuel_type,
    seats: String(vehicle.seats),
    luggageLiters: String(vehicle.luggage_liters ?? 300),
    paintName: vehicle.paint_name,
    paintHex: vehicle.paint_hex,
    ratePlanId: String(vehicle.rate_plan_id),
    depositMinor: String(Math.round(vehicle.deposit_minor / 100)),
    kmPerDay: String(vehicle.km_per_day ?? 0),
    extraKmMinor: String(Math.round(vehicle.extra_km_minor / 100)),
    odometerKm: String(vehicle.odometer_km),
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

  const branchOptions: SelectOption[] = useMemo(
    () => branches.map((b) => ({ id: String(b.id), label: b.name })),
    [branches],
  );

  const ratePlanOptions: SelectOption[] = useMemo(
    () => ratePlans.map((rp) => ({ id: String(rp.id), label: rp.name })),
    [ratePlans],
  );

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
          make: form.make.trim(),
          model: form.model.trim(),
          variant: form.variant.trim() || undefined,
          year: Number(form.year),
          plate: form.plate.trim().toUpperCase(),
          homeBranchId: Number(form.homeBranchId),
          currentBranchId: Number(form.currentBranchId),
          category: form.category,
          transmission: form.transmission,
          fuelType: form.fuelType,
          seats: Number(form.seats),
          luggageLiters: Number(form.luggageLiters) || null,
          paintName: form.paintName.trim(),
          paintHex: form.paintHex,
          ratePlanId: Number(form.ratePlanId),
          depositMinor: Math.round(Number(form.depositMinor) * 100),
          kmPerDay: Number(form.kmPerDay) > 0 ? Number(form.kmPerDay) : null,
          extraKmMinor: Math.round(Number(form.extraKmMinor) * 100),
          odometerKm: Number(form.odometerKm),
          lifecycle: form.lifecycle,
          opsState: form.opsState,
          description: form.description.trim() || undefined,
          featureIds,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save vehicle');
      setMessage('Vehicle specifications successfully updated.');
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
        referenceNo: newDoc.referenceNo.trim() || null,
        expiresOn: newDoc.expiresOn || null,
      }),
    });
    const data = (await res.json()) as { id?: number; error?: string };
    if (!res.ok || !data.id) {
      setError(data.error ?? 'Could not add compliance document');
      return;
    }
    setDocs((prev) => [
      {
        id: data.id as number,
        kind: newDoc.kind,
        reference_no: newDoc.referenceNo.trim() || null,
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
    if (!confirm('Are you sure you want to archive this vehicle from the fleet?')) return;
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/admin/fleet"
            className="inline-flex items-center gap-1.5 text-body-s font-medium text-text-3 hover:text-text-1 transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to Fleet Inventory</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-h3 font-bold text-text-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <Plate code={vehicle.plate} size="md" />
            <StatusBadge status={vehicle.lifecycle} />
            <StatusBadge status={vehicle.ops_state} />
          </div>
        </div>

        {canArchive && (
          <Button type="button" variant="danger" size="sm" onClick={() => void handleArchive()}>
            <Trash size={16} weight="bold" />
            <span>Archive Vehicle</span>
          </Button>
        )}
      </div>

      {message && (
        <div className="rounded-xs border border-success/30 bg-surface p-3 text-body-s text-text-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xs border border-danger/30 bg-danger-subtle p-3 text-body-s text-danger">
          {error}
        </div>
      )}

      {/* Studio Image & Asset Gallery */}
      <section className="rounded-m border border-border bg-surface p-5 space-y-4 shadow-e0">
        <div>
          <h2 className="text-h4 font-display font-semibold text-text-1">
            Studio Frames & Asset Gallery
          </h2>
          <p className="text-body-s text-text-3">
            Pure white studio plates and angle views. First image is used as the primary showroom
            card.
          </p>
        </div>
        <ImageManager vehicleId={vehicle.id} initialImages={images} />
      </section>

      {/* Specifications & Pricing Configuration */}
      <form
        onSubmit={handleSave}
        className="space-y-6 rounded-m border border-border bg-surface p-5 shadow-e0"
      >
        <div className="border-b border-border pb-3">
          <h2 className="text-h4 font-display font-semibold text-text-1">
            Vehicle Specifications & Pricing
          </h2>
          <p className="text-body-s text-text-3">
            Hardware details, daily rate schedule, and branch assignment.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <TextField
            label="Make"
            value={form.make}
            onChange={(val) => setForm((prev) => ({ ...prev, make: val }))}
            required
          />
          <TextField
            label="Model"
            value={form.model}
            onChange={(val) => setForm((prev) => ({ ...prev, model: val }))}
            required
          />
          <TextField
            label="Variant"
            value={form.variant}
            onChange={(val) => setForm((prev) => ({ ...prev, variant: val }))}
          />
          <TextField
            label="Model Year"
            type="number"
            value={form.year}
            onChange={(val) => setForm((prev) => ({ ...prev, year: val }))}
            required
          />
          <TextField
            label="Registration Plate"
            value={form.plate}
            onChange={(val) => setForm((prev) => ({ ...prev, plate: val.toUpperCase() }))}
            required
          />
          <Select
            label="Category"
            selectedKey={form.category}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, category: String(key) }))}
            options={CATEGORY_OPTIONS}
          />
          <Select
            label="Transmission"
            selectedKey={form.transmission}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, transmission: String(key) }))}
            options={TRANSMISSION_OPTIONS}
          />
          <Select
            label="Fuel Type"
            selectedKey={form.fuelType}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, fuelType: String(key) }))}
            options={FUEL_OPTIONS}
          />
          <TextField
            label="Seating Capacity"
            type="number"
            value={form.seats}
            onChange={(val) => setForm((prev) => ({ ...prev, seats: val }))}
            required
          />
          <TextField
            label="Luggage Capacity (Liters)"
            type="number"
            value={form.luggageLiters}
            onChange={(val) => setForm((prev) => ({ ...prev, luggageLiters: val }))}
          />
          <Select
            label="Home Branch"
            selectedKey={form.homeBranchId}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, homeBranchId: String(key) }))}
            options={branchOptions}
          />
          <Select
            label="Current Location Branch"
            selectedKey={form.currentBranchId}
            onSelectionChange={(key) =>
              setForm((prev) => ({ ...prev, currentBranchId: String(key) }))
            }
            options={branchOptions}
          />
          <Select
            label="Rate Plan"
            selectedKey={form.ratePlanId}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, ratePlanId: String(key) }))}
            options={ratePlanOptions}
          />
          <Select
            label="Lifecycle State"
            selectedKey={form.lifecycle}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, lifecycle: String(key) }))}
            options={LIFECYCLE_OPTIONS}
          />
          <Select
            label="Operational Readiness"
            selectedKey={form.opsState}
            onSelectionChange={(key) => setForm((prev) => ({ ...prev, opsState: String(key) }))}
            options={OPS_STATE_OPTIONS}
          />
          <TextField
            label="Odometer (km)"
            type="number"
            value={form.odometerKm}
            onChange={(val) => setForm((prev) => ({ ...prev, odometerKm: val }))}
            required
          />
          <TextField
            label="Security Deposit (₹)"
            type="number"
            value={form.depositMinor}
            onChange={(val) => setForm((prev) => ({ ...prev, depositMinor: val }))}
            required
          />
          <TextField
            label="Daily Included Km (0 = unlimited)"
            type="number"
            value={form.kmPerDay}
            onChange={(val) => setForm((prev) => ({ ...prev, kmPerDay: val }))}
            required
          />
          <TextField
            label="Extra Km Rate (₹)"
            type="number"
            value={form.extraKmMinor}
            onChange={(val) => setForm((prev) => ({ ...prev, extraKmMinor: val }))}
            required
          />
          <TextField
            label="Paint Finish Name"
            value={form.paintName}
            onChange={(val) => setForm((prev) => ({ ...prev, paintName: val }))}
            required
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-2">Paint Color Swatch</span>
            <div className="flex items-center gap-3 h-10">
              <input
                type="color"
                value={form.paintHex}
                onChange={(e) => setForm((prev) => ({ ...prev, paintHex: e.target.value }))}
                className="h-10 w-16 rounded-xs border border-border bg-surface p-1 cursor-pointer"
              />
              <span className="text-body-s tabular-nums text-text-2">{form.paintHex}</span>
            </div>
          </div>
        </div>

        <div>
          <TextField
            label="Customer-Facing Notes / Highlights"
            value={form.description}
            onChange={(val) => setForm((prev) => ({ ...prev, description: val }))}
            placeholder="Key highlights, special package features, or vehicle history..."
          />
        </div>

        {/* Feature Pills */}
        <div className="space-y-2">
          <span className="text-caption font-medium text-text-2 block">
            Standard Equipment & Features
          </span>
          <div className="flex flex-wrap gap-2">
            {allFeatures.map((f) => {
              const active = featureIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFeature(f.id)}
                  className={`rounded-xs border px-3 py-1.5 text-body-s font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-accent bg-accent-subtle text-accent'
                      : 'border-border bg-surface-sunken text-text-2 hover:text-text-1'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-3 border-t border-border">
            <Button type="submit" disabled={saving} className="gap-2">
              <FloppyDisk size={16} weight="bold" />
              <span>{saving ? 'Saving changes...' : 'Save Changes'}</span>
            </Button>
          </div>
        )}
      </form>

      {/* Compliance Documents Desk */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <div>
          <h2 className="text-h4 font-display font-semibold text-text-1">
            Compliance & Statutory Documents
          </h2>
          <p className="text-body-s text-text-3">
            Track RC, Commercial Insurance, Road Tax, and PUC expiries.
          </p>
        </div>

        <form
          onSubmit={handleAddDoc}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-4 rounded-xs border border-border-subtle bg-surface-sunken"
        >
          <Select
            label="Document Type"
            selectedKey={newDoc.kind}
            onSelectionChange={(key) => setNewDoc((prev) => ({ ...prev, kind: String(key) }))}
            options={DOC_TYPE_OPTIONS}
          />
          <TextField
            label="Reference No."
            placeholder="e.g. INS-KA03-998811"
            value={newDoc.referenceNo}
            onChange={(val) => setNewDoc((prev) => ({ ...prev, referenceNo: val }))}
          />
          <TextField
            label="Expires On"
            type="date"
            value={newDoc.expiresOn}
            onChange={(val) => setNewDoc((prev) => ({ ...prev, expiresOn: val }))}
          />
          <Button type="submit" size="sm" className="gap-1.5">
            <FilePlus size={16} weight="bold" />
            <span>Add Record</span>
          </Button>
        </form>

        <div className="divide-y divide-border-subtle rounded-xs border border-border overflow-hidden">
          {docs.length === 0 ? (
            <div className="p-6 text-center text-body-s text-text-3">
              No compliance documents registered for this vehicle.
            </div>
          ) : (
            docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3 text-body-s">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold capitalize text-text-1">
                    {d.kind.replace('_', ' ')}
                  </span>
                  {d.reference_no && (
                    <span className="tabular-nums text-label-s text-text-3 bg-surface-sunken px-2 py-0.5 rounded-2xs border border-border-subtle">
                      {d.reference_no}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-label-s text-text-3">
                    Expires:{' '}
                    <span className="font-semibold text-text-1">{d.expires_on ?? 'N/A'}</span>
                  </span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteDoc(d.id)}
                      className="text-label-s text-danger hover:underline cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
