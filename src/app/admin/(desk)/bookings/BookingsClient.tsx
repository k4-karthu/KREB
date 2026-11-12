'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { Dialog } from '@/ui/primitives/Dialog';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

export interface BookingRow {
  id: number;
  code: string;
  status: string;
  start_at: number;
  end_at: number;
  actual_start_at: number | null;
  actual_end_at: number | null;
  total_minor: number;
  source: string;
  customer_name: string;
  customer_email: string;
  make: string;
  model: string;
  plate: string;
  paint_hex: string;
  branch_name: string;
  return_branch_name: string;
}

type LifecycleBucket =
  | 'all'
  | 'pending_approval'
  | 'confirmed'
  | 'on_route'
  | 'overdue'
  | 'completed'
  | 'cancelled';

export function BookingsClient({
  bookings,
  customers,
  vehicles,
  canManage,
}: {
  bookings: BookingRow[];
  customers: Array<{ id: string; name: string; email: string }>;
  vehicles: Array<{ id: number; make: string; model: string; plate: string }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<LifecycleBucket>('all');
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [walkin, setWalkin] = useState({
    userId: customers[0]?.id ?? '',
    vehicleId: vehicles[0]?.id ?? 1,
    hours: 48,
  });
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const getLifecycleBadge = (b: BookingRow) => {
    if (b.status === 'active') {
      return b.end_at < now ? 'overdue' : 'taken';
    }
    return b.status;
  };

  const matchesFilter = (b: BookingRow, filter: LifecycleBucket) => {
    switch (filter) {
      case 'all':
        return true;
      case 'pending_approval':
        return b.status === 'pending_approval';
      case 'confirmed':
        return b.status === 'confirmed';
      case 'on_route':
        return b.status === 'active' && b.end_at >= now;
      case 'overdue':
        return b.status === 'active' && b.end_at < now;
      case 'completed':
        return b.status === 'completed' || b.status === 'returned';
      case 'cancelled':
        return b.status === 'cancelled' || b.status === 'no_show' || b.status === 'rejected';
    }
  };

  const filtered = bookings.filter((b) => matchesFilter(b, statusFilter));

  const counts: Record<LifecycleBucket, number> = {
    all: bookings.length,
    pending_approval: bookings.filter((b) => matchesFilter(b, 'pending_approval')).length,
    confirmed: bookings.filter((b) => matchesFilter(b, 'confirmed')).length,
    on_route: bookings.filter((b) => matchesFilter(b, 'on_route')).length,
    overdue: bookings.filter((b) => matchesFilter(b, 'overdue')).length,
    completed: bookings.filter((b) => matchesFilter(b, 'completed')).length,
    cancelled: bookings.filter((b) => matchesFilter(b, 'cancelled')).length,
  };

  const tabs: Array<{ key: LifecycleBucket; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending_approval', label: 'Requested' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'on_route', label: 'Taken · On route' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled / No-show' },
  ];

  async function runAction(code: string, payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/bookings/${code}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? 'Action failed');
      return;
    }
    router.refresh();
  }

  async function createWalkin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const startAt = Date.now() + 3_600_000;
    const endAt = startAt + walkin.hours * 3_600_000;
    const res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: walkin.userId,
        vehicleId: Number(walkin.vehicleId),
        startAt,
        endAt,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? 'Walk-in failed');
      return;
    }
    setWalkinOpen(false);
    router.refresh();
  }

  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Bookings desk</h1>
          <p className="text-sm text-ink-muted">
            Track requested approvals, confirmed pickups, vehicles currently taken on route, and
            returns.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LifecycleBucket)}
            aria-label="Filter bookings"
            className="h-10 rounded-s border border-line bg-surface px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending_approval">Requested (Approval)</option>
            <option value="confirmed">Confirmed</option>
            <option value="on_route">Taken · On route</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled / No-show</option>
          </select>
          {canManage && (
            <Button type="button" onClick={() => setWalkinOpen(true)}>
              <Plus className="h-4 w-4" /> Walk-in booking
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle quick-filter strip */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-s border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-petrol-600 bg-petrol-100 text-petrol-900'
                  : 'border-line bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              <span>{tab.label}</span>
              <span className="rounded-s bg-surface-subtle px-1.5 py-0.5 font-mono text-xs tabular-nums text-ink">
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-m border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Route & Window</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Lifecycle</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((b) => {
              const isOneWay = b.branch_name !== b.return_branch_name;
              return (
                <tr key={b.id} className="hover:bg-surface-subtle/60">
                  <td className="px-4 py-3">
                    <Plate code={b.code} paintHex={b.paint_hex} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{b.customer_name}</div>
                    <div className="text-xs text-ink-muted">{b.customer_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink">
                      {b.make} {b.model}
                    </div>
                    <div className="font-mono text-xs text-ink-muted">{b.plate}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">
                    <div className="font-medium text-ink">
                      {isOneWay ? `${b.branch_name} → ${b.return_branch_name}` : b.branch_name}
                    </div>
                    <div>
                      {fmt(b.start_at)} to {fmt(b.end_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <MoneyText amountMinor={b.total_minor} className="font-medium" />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={getLifecycleBadge(b)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Link
                        href={`/trips/${b.code}`}
                        className="rounded-s border border-line px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        Receipt
                      </Link>
                      {b.status === 'confirmed' && (
                        <Link
                          href={`/staff/handover/${b.code}/out`}
                          className="rounded-s border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-subtle"
                        >
                          Check out
                        </Link>
                      )}
                      {b.status === 'active' && (
                        <Link
                          href={`/staff/handover/${b.code}/in`}
                          className="rounded-s border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-surface-subtle"
                        >
                          Check in
                        </Link>
                      )}
                      {b.status === 'pending_approval' && canManage && (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void runAction(b.code, { action: 'approve_kyc_booking' })}
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={walkinOpen}
        onOpenChange={setWalkinOpen}
        title="New counter walk-in booking"
        description="Creates an immediately confirmed booking and marks payment collected at counter."
      >
        <form onSubmit={createWalkin} className="space-y-3">
          <label className="block space-y-1 text-xs font-medium text-ink">
            <span>Customer</span>
            <select
              value={walkin.userId}
              onChange={(e) => setWalkin({ ...walkin, userId: e.target.value })}
              className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-ink">
            <span>Vehicle</span>
            <select
              value={walkin.vehicleId}
              onChange={(e) => setWalkin({ ...walkin, vehicleId: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.plate})
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-xs font-medium text-ink">
            <span>Duration (hours)</span>
            <input
              type="number"
              min={4}
              max={720}
              value={walkin.hours}
              onChange={(e) => setWalkin({ ...walkin, hours: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface px-2.5 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="tertiary" onClick={() => setWalkinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create walk-in</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
