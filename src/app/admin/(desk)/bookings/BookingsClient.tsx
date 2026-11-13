'use client';

import {
  ArrowSquareOut,
  CheckCircle,
  FileText,
  Plus,
  Printer,
  Receipt,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { MinorUnits } from '@/domain/shared/money';
import { ReceiptPaper } from '@/ui/components/receipt/receipt-paper';
import type { SlipData } from '@/ui/components/receipt/types';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Dialog } from '@/ui/overlays/Dialog';
import { Drawer } from '@/ui/overlays/Drawer';
import { Button } from '@/ui/primitives/Button';
import { Select, type SelectOption } from '@/ui/primitives/Select';
import { TextField } from '@/ui/primitives/TextField';

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
  const [query, setQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'details' | 'invoice'>('details');

  const [walkinOpen, setWalkinOpen] = useState(false);
  const [walkin, setWalkin] = useState({
    userId: customers[0]?.id ?? '',
    vehicleId: vehicles[0]?.id ? String(vehicles[0].id) : '1',
    hours: '48',
  });
  const [submittingWalkin, setSubmittingWalkin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const getLifecycleBadge = (b: BookingRow) => {
    if (b.status === 'active') {
      return b.end_at < now ? 'overdue' : 'active';
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (!matchesFilter(b, statusFilter)) return false;
      if (!q) return true;
      return (
        b.code.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_email.toLowerCase().includes(q) ||
        b.plate.toLowerCase().includes(q) ||
        `${b.make} ${b.model}`.toLowerCase().includes(q)
      );
    });
  }, [bookings, statusFilter, query]);

  const counts: Record<LifecycleBucket, number> = useMemo(
    () => ({
      all: bookings.length,
      pending_approval: bookings.filter((b) => matchesFilter(b, 'pending_approval')).length,
      confirmed: bookings.filter((b) => matchesFilter(b, 'confirmed')).length,
      on_route: bookings.filter((b) => matchesFilter(b, 'on_route')).length,
      overdue: bookings.filter((b) => matchesFilter(b, 'overdue')).length,
      completed: bookings.filter((b) => matchesFilter(b, 'completed')).length,
      cancelled: bookings.filter((b) => matchesFilter(b, 'cancelled')).length,
    }),
    [bookings],
  );

  const tabs: Array<{ key: LifecycleBucket; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending_approval', label: 'Requested' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'on_route', label: 'On Route' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
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
    setDrawerOpen(false);
    router.refresh();
  }

  async function createWalkin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmittingWalkin(true);
    const startAt = Date.now() + 3_600_000;
    const endAt = startAt + Number(walkin.hours) * 3_600_000;
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
    setSubmittingWalkin(false);
    if (!res.ok) {
      setError(data.error ?? 'Walk-in failed');
      return;
    }
    setWalkinOpen(false);
    router.refresh();
  }

  const fmt = (ms: number) =>
    new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date(ms));

  // Generate Thermal Invoice SlipData
  const invoiceSlip: SlipData | null = useMemo(() => {
    if (!selectedBooking) return null;
    const b = selectedBooking;
    const days = Math.max(1, Math.ceil((b.end_at - b.start_at) / 86_400_000));
    const subtotal = Math.round(b.total_minor * 0.82) as MinorUnits;
    const tax = Math.round(b.total_minor * 0.18) as MinorUnits;

    return {
      kind: 'invoice',
      title: 'TAX INVOICE',
      referenceCode: b.code,
      issuedAt: Date.now(),
      currency: 'INR',
      vehicleName: `${b.make} ${b.model}`,
      vehiclePlate: b.plate,
      branchPickup: b.branch_name,
      branchReturn: b.return_branch_name,
      startAt: b.start_at,
      endAt: b.end_at,
      billableDays: days,
      customerName: b.customer_name,
      lines: [
        {
          kind: 'base',
          label: `Vehicle Rental (${days} day${days > 1 ? 's' : ''})`,
          amountMinor: subtotal,
        },
        {
          kind: 'tax',
          label: 'Statutory GST (18%)',
          amountMinor: tax,
        },
      ],
      subtotalMinor: subtotal,
      taxMinor: tax,
      totalMinor: b.total_minor as MinorUnits,
      depositMinor: 500000 as MinorUnits,
      paymentSummary: 'Paid via Card / UPI Gateway',
      meta: [
        { label: 'GSTIN', value: '29AABCK8844D1Z2' },
        { label: 'Invoice No.', value: `INV-${b.code}` },
        { label: 'SAC Code', value: '996601 (Passenger Transport)' },
        { label: 'Place of Supply', value: 'Karnataka (KA)' },
      ],
      barcodeSeed: b.code,
      statusLabel: 'ORIGINAL FOR RECIPIENT · PAID',
    };
  }, [selectedBooking]);

  const customerSelectOptions: SelectOption[] = useMemo(
    () => customers.map((c) => ({ id: c.id, label: `${c.name} (${c.email})` })),
    [customers],
  );

  const vehicleSelectOptions: SelectOption[] = useMemo(
    () =>
      vehicles.map((v) => ({
        id: String(v.id),
        label: `${v.make} ${v.model} (${v.plate})`,
      })),
    [vehicles],
  );

  return (
    <div className="space-y-6">
      {/* Header & Walkin Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h3 font-bold text-text-1">Bookings Desk</h1>
          <p className="text-body-s text-text-3">
            Operational booking manifests, counter walk-ins, and thermal tax invoices.
          </p>
        </div>
        {canManage && (
          <Button type="button" onClick={() => setWalkinOpen(true)} className="gap-2">
            <Plus size={16} weight="bold" />
            <span>Counter Walk-in</span>
          </Button>
        )}
      </div>

      {/* Search & Lifecycle Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-2 rounded-xs border px-3 py-1.5 text-body-s font-medium transition-colors cursor-pointer ${
                  active
                    ? 'border-accent bg-accent-subtle text-accent font-semibold'
                    : 'border-border bg-surface text-text-2 hover:bg-surface-sunken hover:text-text-1'
                }`}
              >
                <span>{tab.label}</span>
                <span className="rounded-2xs bg-surface-sunken px-1.5 py-0.2 tabular-nums text-label-s tabular-nums text-text-3 border border-border-subtle">
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-64">
          <TextField
            placeholder="Search code, driver, plate..."
            value={query}
            onChange={setQuery}
            aria-label="Search bookings"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xs border border-danger/30 bg-danger-subtle p-3 text-body-s text-danger">
          {error}
        </div>
      )}

      {/* Operational Booking Table */}
      <div className="rounded-m border border-border bg-surface overflow-hidden shadow-e0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-body-s">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/60 text-label-s font-semibold text-text-2 select-none">
                <th className="px-4 py-3">Booking Code</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Route & Window</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Operational Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-body-s text-text-3">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const isOneWay = b.branch_name !== b.return_branch_name;
                  return (
                    <tr
                      key={b.id}
                      onClick={() => {
                        setSelectedBooking(b);
                        setDrawerTab('details');
                        setDrawerOpen(true);
                      }}
                      className="cursor-pointer transition-colors hover:bg-surface-sunken/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap font-technical">
                        <Plate code={b.code} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text-1">{b.customer_name}</div>
                        <div className="text-caption text-text-3">{b.customer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text-1">
                          {b.make} {b.model}
                        </div>
                        <div className="tabular-nums text-caption text-text-3">{b.plate}</div>
                      </td>
                      <td className="px-4 py-3 text-caption text-text-3">
                        <div className="font-semibold text-text-1">
                          {isOneWay ? `${b.branch_name} → ${b.return_branch_name}` : b.branch_name}
                        </div>
                        <div>
                          {fmt(b.start_at)} — {fmt(b.end_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Price amountMinor={b.total_minor} className="font-semibold text-text-1" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={getLifecycleBadge(b)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBooking(b);
                              setDrawerTab('invoice');
                              setDrawerOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xs border border-border px-2.5 py-1 text-label-s font-medium text-text-2 hover:bg-surface-sunken hover:text-text-1 cursor-pointer transition-colors"
                          >
                            <Receipt size={14} weight="bold" />
                            <span>Invoice</span>
                          </button>

                          {b.status === 'confirmed' && (
                            <Link
                              href={`/staff/handover/${b.code}/out`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-xs bg-accent px-2.5 py-1 text-label-s font-medium text-on-accent hover:opacity-90 transition-opacity"
                            >
                              <span>Check out</span>
                            </Link>
                          )}

                          {b.status === 'active' && (
                            <Link
                              href={`/staff/handover/${b.code}/in`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-xs bg-accent px-2.5 py-1 text-label-s font-medium text-on-accent hover:opacity-90 transition-opacity"
                            >
                              <span>Check in</span>
                            </Link>
                          )}

                          {b.status === 'pending_approval' && canManage && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                void runAction(b.code, { action: 'approve_kyc_booking' });
                              }}
                            >
                              Approve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Action Drawer with Thermal Invoice Generator */}
      <Drawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={
          selectedBooking && (
            <div className="flex items-center gap-2.5">
              <span>Booking #{selectedBooking.code}</span>
              <StatusBadge status={getLifecycleBadge(selectedBooking)} />
            </div>
          )
        }
        description={
          selectedBooking
            ? `${selectedBooking.customer_name} · ${selectedBooking.make} ${selectedBooking.model}`
            : ''
        }
        direction="responsive"
        className="max-w-xl"
      >
        {selectedBooking && (
          <div className="space-y-6 pt-2">
            {/* Drawer Tab Switch */}
            <div className="flex rounded-xs border border-border bg-surface-sunken p-1">
              <button
                type="button"
                onClick={() => setDrawerTab('details')}
                className={`flex-1 rounded-2xs py-1.5 text-body-s font-medium transition-colors cursor-pointer ${
                  drawerTab === 'details'
                    ? 'bg-surface text-text-1 shadow-e0 font-semibold'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                Booking Details
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('invoice')}
                className={`flex-1 rounded-2xs py-1.5 text-body-s font-medium transition-colors cursor-pointer ${
                  drawerTab === 'invoice'
                    ? 'bg-surface text-text-1 shadow-e0 font-semibold'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                Thermal Invoice Slip
              </button>
            </div>

            {drawerTab === 'details' ? (
              <div className="space-y-5">
                {/* Driver & Vehicle Summary */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xs border border-border bg-surface-sunken">
                  <div>
                    <span className="text-caption text-text-3 block">Driver</span>
                    <span className="font-semibold text-text-1">
                      {selectedBooking.customer_name}
                    </span>
                    <span className="text-caption text-text-3 block truncate">
                      {selectedBooking.customer_email}
                    </span>
                  </div>
                  <div>
                    <span className="text-caption text-text-3 block">Vehicle</span>
                    <span className="font-semibold text-text-1">
                      {selectedBooking.make} {selectedBooking.model}
                    </span>
                    <div className="mt-1">
                      <Plate code={selectedBooking.plate} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Rental Window */}
                <div className="space-y-2 p-4 rounded-xs border border-border bg-surface-sunken">
                  <span className="text-caption text-text-3 block">Rental Window</span>
                  <div className="flex items-center justify-between text-body-s">
                    <span className="text-text-2">Pickup ({selectedBooking.branch_name}):</span>
                    <span className="font-semibold text-text-1">
                      {fmt(selectedBooking.start_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-s">
                    <span className="text-text-2">
                      Return ({selectedBooking.return_branch_name}):
                    </span>
                    <span className="font-semibold text-text-1">{fmt(selectedBooking.end_at)}</span>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="space-y-2 p-4 rounded-xs border border-border bg-surface-sunken">
                  <span className="text-caption text-text-3 block">Total Cost</span>
                  <div className="flex items-center justify-between">
                    <span className="text-body-s text-text-2">Paid Total</span>
                    <Price
                      amountMinor={selectedBooking.total_minor}
                      className="text-h4 font-bold text-text-1"
                    />
                  </div>
                </div>

                {/* Quick Operations Actions */}
                <div className="space-y-2 pt-2">
                  <span className="text-caption font-semibold  text-text-3 block">
                    Operational Actions
                  </span>
                  <div className="flex flex-col gap-2">
                    {selectedBooking.status === 'confirmed' && (
                      <Link
                        href={`/staff/handover/${selectedBooking.code}/out`}
                        className="flex items-center justify-center gap-2 rounded-xs bg-accent px-4 py-2.5 text-body-s font-semibold text-on-accent hover:opacity-90 transition-opacity"
                      >
                        <ArrowSquareOut size={18} weight="bold" />
                        <span>Proceed to Vehicle Handover (Check out)</span>
                      </Link>
                    )}

                    {selectedBooking.status === 'active' && (
                      <Link
                        href={`/staff/handover/${selectedBooking.code}/in`}
                        className="flex items-center justify-center gap-2 rounded-xs bg-accent px-4 py-2.5 text-body-s font-semibold text-on-accent hover:opacity-90 transition-opacity"
                      >
                        <ArrowSquareOut size={18} weight="bold" />
                        <span>Perform Return Inspection (Check in)</span>
                      </Link>
                    )}

                    {selectedBooking.status === 'pending_approval' && canManage && (
                      <Button
                        type="button"
                        onClick={() =>
                          void runAction(selectedBooking.code, { action: 'approve_kyc_booking' })
                        }
                        className="w-full gap-2"
                      >
                        <CheckCircle size={18} weight="bold" />
                        <span>Approve Customer KYC & Confirm Booking</span>
                      </Button>
                    )}

                    <Link
                      href={`/trips/${selectedBooking.code}`}
                      className="flex items-center justify-center gap-2 rounded-xs border border-border bg-surface px-4 py-2.5 text-body-s font-medium text-text-2 hover:bg-surface-sunken hover:text-text-1 transition-colors"
                    >
                      <FileText size={18} weight="bold" />
                      <span>View Customer Trip Portal</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* Thermal Tax Invoice Generator View */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-body font-semibold text-text-1">
                      Official Thermal Invoice
                    </h3>
                    <p className="text-caption text-text-3">
                      58mm thermal receipt paper standard with GST tax breakdown.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => window.print()}
                    className="gap-1.5"
                  >
                    <Printer size={16} weight="bold" />
                    <span>Print Slip</span>
                  </Button>
                </div>

                {invoiceSlip && (
                  <div className="flex justify-center p-4 rounded-xs border border-border bg-surface-sunken overflow-x-auto">
                    <ReceiptPaper slip={invoiceSlip} tornTop tornBottom className="shadow-e2" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Counter Walkin Booking Modal */}
      <Dialog
        open={walkinOpen}
        onOpenChange={setWalkinOpen}
        title="Counter Walk-in Booking"
        description="Instant reservation with in-person identity verification and counter payment collection."
        className="max-w-md"
      >
        <form onSubmit={createWalkin} className="space-y-4 pt-2">
          <Select
            label="Customer"
            selectedKey={walkin.userId}
            onSelectionChange={(key) => setWalkin((prev) => ({ ...prev, userId: String(key) }))}
            options={customerSelectOptions}
          />

          <Select
            label="Assigned Vehicle"
            selectedKey={walkin.vehicleId}
            onSelectionChange={(key) => setWalkin((prev) => ({ ...prev, vehicleId: String(key) }))}
            options={vehicleSelectOptions}
          />

          <TextField
            label="Rental Duration (Hours)"
            type="number"
            value={walkin.hours}
            onChange={(val) => setWalkin((prev) => ({ ...prev, hours: val }))}
            required
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setWalkinOpen(false)}
              disabled={submittingWalkin}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submittingWalkin}>
              {submittingWalkin ? 'Creating...' : 'Create Walk-in'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
