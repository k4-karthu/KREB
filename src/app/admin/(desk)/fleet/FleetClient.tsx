'use client';

import { Plus } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CarStudioImage } from '@/ui/components/CarStudioImage';
import { Plate } from '@/ui/data/Plate';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { createAppColumnHelper, Table } from '@/ui/data/Table';
import { Dialog } from '@/ui/overlays/Dialog';
import { Button } from '@/ui/primitives/Button';
import { Dropzone } from '@/ui/primitives/Dropzone';
import { Select, type SelectOption } from '@/ui/primitives/Select';
import { TextField } from '@/ui/primitives/TextField';

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

const CATEGORY_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Categories' },
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'ev', label: 'EV' },
];

const LIFECYCLE_OPTIONS: SelectOption[] = [
  { id: 'all', label: 'All Lifecycles' },
  { id: 'active', label: 'Active' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'retired', label: 'Retired' },
];

const CREATE_CATEGORIES: SelectOption[] = [
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'suv', label: 'SUV' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'ev', label: 'EV' },
];

const CREATE_TRANSMISSIONS: SelectOption[] = [
  { id: 'automatic', label: 'Automatic' },
  { id: 'manual', label: 'Manual' },
];

const CREATE_FUELS: SelectOption[] = [
  { id: 'petrol', label: 'Petrol' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'electric', label: 'Electric' },
  { id: 'hybrid', label: 'Hybrid' },
];

const columnHelper = createAppColumnHelper<FleetRow>();

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
    year: '2025',
    plate: '',
    homeBranchId: branches[0]?.id ? String(branches[0].id) : '1',
    category: 'hatchback',
    transmission: 'automatic',
    fuelType: 'petrol',
    seats: '5',
    paintName: 'Arctic White',
    paintHex: 'var(--surface-sunken)',
    ratePlanId: ratePlans[0]?.id ? String(ratePlans[0].id) : '1',
    depositMinor: '5000',
    kmPerDay: '250',
    extraKmMinor: '12',
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

  // TanStack columns
  const columns = useMemo(
    () => [
      columnHelper.accessor('primary_file_key', {
        header: 'Vehicle',
        enableSorting: false,
        cell: (info) => {
          const row = info.row.original;
          const imageUrl = row.primary_file_key
            ? `/api/uploads/public/${row.primary_file_key}-640.webp`
            : null;
          return (
            <div className="flex items-center gap-3">
              <div className="w-16 h-11 shrink-0 overflow-hidden rounded-xs border border-border-subtle bg-plate">
                {imageUrl ? (
                  <CarStudioImage
                    src={imageUrl}
                    alt={`${row.make} ${row.model}`}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-label-s text-text-3">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/admin/fleet/${row.id}`}
                  className="font-semibold text-text-1 hover:text-accent hover:underline transition-colors truncate block"
                >
                  {row.make} {row.model}
                </Link>
                <div className="text-caption text-text-3 truncate">
                  {row.year} · {row.category} {row.variant ? `· ${row.variant}` : ''}
                </div>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('plate', {
        header: 'Registration',
        cell: (info) => <Plate code={info.getValue()} size="sm" />,
      }),
      columnHelper.accessor('base_daily_minor', {
        header: 'Daily Rate',
        cell: (info) => (
          <div className="font-semibold text-text-1">
            ₹{Math.round(info.getValue() / 100).toLocaleString('en-IN')}{' '}
            <span className="text-caption text-text-3 font-normal">/day</span>
          </div>
        ),
      }),
      columnHelper.accessor('home_branch_name', {
        header: 'Home Branch',
        cell: (info) => <span className="text-text-2">{info.getValue()}</span>,
      }),
      columnHelper.accessor('lifecycle', {
        header: 'Lifecycle',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor('ops_state', {
        header: 'Bay Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        cell: (info) => (
          <Link
            href={`/admin/fleet/${info.row.original.id}`}
            className="inline-flex items-center justify-center rounded-xs border border-border px-2.5 py-1 text-label-s font-medium text-text-2 hover:bg-surface-sunken hover:text-text-1 transition-colors"
          >
            Configure
          </Link>
        ),
      }),
    ],
    [],
  );

  const branchSelectOptions: SelectOption[] = useMemo(
    () => branches.map((b) => ({ id: String(b.id), label: b.name })),
    [branches],
  );

  const ratePlanSelectOptions: SelectOption[] = useMemo(
    () =>
      ratePlans.map((rp) => ({
        id: String(rp.id),
        label: `${rp.name} (₹${Math.round(rp.base_daily_minor / 100)}/d)`,
      })),
    [ratePlans],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          make: form.make.trim(),
          model: form.model.trim(),
          variant: form.variant.trim() || undefined,
          year: Number(form.year),
          plate: form.plate.trim().toUpperCase(),
          homeBranchId: Number(form.homeBranchId),
          category: form.category,
          transmission: form.transmission,
          fuelType: form.fuelType,
          seats: Number(form.seats),
          paintName: form.paintName.trim(),
          paintHex: form.paintHex,
          ratePlanId: Number(form.ratePlanId),
          depositMinor: Math.round(Number(form.depositMinor) * 100),
          kmPerDay: Number(form.kmPerDay) || null,
          extraKmMinor: Math.round(Number(form.extraKmMinor) * 100),
          lifecycle: form.lifecycle,
          description: form.description.trim() || undefined,
        }),
      });

      const data = (await res.json()) as { vehicleId?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Failed to add vehicle');
        setSubmitting(false);
        return;
      }

      setCreateOpen(false);
      setSubmitting(false);
      if (data.vehicleId) {
        router.push(`/admin/fleet/${data.vehicleId}`);
      } else {
        router.refresh();
      }
    } catch {
      setError('An unexpected network error occurred.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h3 font-bold text-text-1">Fleet Inventory</h1>
          <p className="text-body-s text-text-3">
            {vehicles.length} total vehicles registered across active branches.
          </p>
        </div>
        {canEdit && (
          <Button type="button" onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus size={16} weight="bold" />
            <span>Add Vehicle</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-72">
          <TextField
            placeholder="Search make, model, plate..."
            value={query}
            onChange={setQuery}
            aria-label="Search fleet"
          />
        </div>

        <div className="w-44">
          <Select
            selectedKey={categoryFilter}
            onSelectionChange={(key) => setCategoryFilter(String(key))}
            options={CATEGORY_OPTIONS}
            aria-label="Filter category"
          />
        </div>

        <div className="w-44">
          <Select
            selectedKey={lifecycleFilter}
            onSelectionChange={(key) => setLifecycleFilter(String(key))}
            options={LIFECYCLE_OPTIONS}
            aria-label="Filter lifecycle"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xs border border-danger/30 bg-danger-subtle p-3 text-body-s text-danger">
          {error}
        </div>
      )}

      {/* TanStack Table */}
      <Table data={filtered} columns={columns} pageSize={15} />

      {/* Create Vehicle Dialog with Custom Form Controls */}
      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Register New Fleet Vehicle"
        description="Enter vehicle specifications. Plate numbers are strictly formatted according to Indian transport standards."
        className="max-w-2xl max-h-full overflow-y-auto"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          {form.plate && (
            <div className="flex items-center justify-between p-3 rounded-xs border border-border bg-surface-sunken">
              <span className="text-body-s text-text-2">Registration Plate Preview:</span>
              <Plate code={form.plate.toUpperCase()} size="md" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Make"
              placeholder="e.g. Hyundai, Tata, Mahindra"
              value={form.make}
              onChange={(val) => setForm((prev) => ({ ...prev, make: val }))}
              required
            />
            <TextField
              label="Model"
              placeholder="e.g. Creta, Nexon, Thar"
              value={form.model}
              onChange={(val) => setForm((prev) => ({ ...prev, model: val }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField
              label="Variant / Trim"
              placeholder="e.g. SX (O), Fearless+"
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
              label="Plate Number"
              placeholder="e.g. KA01MH1234"
              value={form.plate}
              onChange={(val) => setForm((prev) => ({ ...prev, plate: val.toUpperCase() }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              selectedKey={form.category}
              onSelectionChange={(key) => setForm((prev) => ({ ...prev, category: String(key) }))}
              options={CREATE_CATEGORIES}
            />
            <Select
              label="Transmission"
              selectedKey={form.transmission}
              onSelectionChange={(key) =>
                setForm((prev) => ({ ...prev, transmission: String(key) }))
              }
              options={CREATE_TRANSMISSIONS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Fuel Type"
              selectedKey={form.fuelType}
              onSelectionChange={(key) => setForm((prev) => ({ ...prev, fuelType: String(key) }))}
              options={CREATE_FUELS}
            />
            <TextField
              label="Seats"
              type="number"
              value={form.seats}
              onChange={(val) => setForm((prev) => ({ ...prev, seats: val }))}
              required
            />
            <TextField
              label="Paint Name"
              placeholder="e.g. Polar White"
              value={form.paintName}
              onChange={(val) => setForm((prev) => ({ ...prev, paintName: val }))}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Home Branch"
              selectedKey={form.homeBranchId}
              onSelectionChange={(key) =>
                setForm((prev) => ({ ...prev, homeBranchId: String(key) }))
              }
              options={branchSelectOptions}
            />
            <Select
              label="Rate Plan"
              selectedKey={form.ratePlanId}
              onSelectionChange={(key) => setForm((prev) => ({ ...prev, ratePlanId: String(key) }))}
              options={ratePlanSelectOptions}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <TextField
              label="Security Deposit (₹)"
              type="number"
              value={form.depositMinor}
              onChange={(val) => setForm((prev) => ({ ...prev, depositMinor: val }))}
              required
            />
            <TextField
              label="Daily Included Km"
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
          </div>

          <div>
            <span className="text-caption font-medium text-text-2 mb-1.5 block">
              Vehicle Studio Image / Documentation
            </span>
            <Dropzone
              title="Upload studio vehicle photograph"
              description="Supports high-res JPEG, PNG, WebP up to 10MB"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating vehicle...' : 'Create Vehicle'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
