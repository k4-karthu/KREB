import { ArrowLeft, Clock, GasPump, Gauge, Receipt, Sparkle } from '@phosphor-icons/react/dist/ssr';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { computeCancellationRefund } from '@/domain/booking/cancellation';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { getServerActor } from '@/server/auth';
import { isStaffRole } from '@/server/permissions';
import { slipFromBooking } from '@/ui/components/receipt/adapters';
import { ReceiptPaper } from '@/ui/components/receipt/receipt-paper';
import type { SlipLineKind } from '@/ui/components/receipt/types';

function toSlipLineKind(kind: string): SlipLineKind {
  const allowed: SlipLineKind[] = [
    'base',
    'rule',
    'tier_discount',
    'addon',
    'protection',
    'fee',
    'promo',
    'tax',
    'post_rental',
    'adjustment',
  ];
  return allowed.includes(kind as SlipLineKind) ? (kind as SlipLineKind) : 'addon';
}

import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Timeline, type TimelineEvent } from '@/ui/data/Timeline';
import { ReceiptPrintButton } from './ReceiptPrintButton';
import { TripActionsClient } from './TripActionsClient';

export const dynamic = 'force-dynamic';

export default async function TripDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const actor = await getServerActor();
  if (!actor) {
    redirect('/login');
  }

  const { code } = await params;
  const { sqlite } = getReadConnection();
  const now = Date.now();

  const booking = sqlite
    .prepare(
      `
    SELECT b.*,
           v.make, v.model, v.variant, v.year, v.plate, v.paint_hex, v.category, v.transmission, v.fuel_type,
           pbr.name AS pickup_branch_name, pbr.address AS pickup_branch_address,
           rbr.name AS return_branch_name, rbr.address AS return_branch_address,
           u.name AS driver_name, u.email AS driver_email
    FROM bookings b
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches pbr ON pbr.id = b.pickup_branch_id
    JOIN branches rbr ON rbr.id = b.return_branch_id
    JOIN user u ON u.id = b.user_id
    WHERE b.code = ?
  `,
    )
    .get(code) as
    | {
        id: number;
        code: string;
        user_id: string;
        status: string;
        start_at: number;
        end_at: number;
        actual_start_at: number | null;
        actual_end_at: number | null;
        created_at: number;
        subtotal_minor: number;
        discount_minor: number;
        tax_minor: number;
        total_minor: number;
        deposit_minor: number;
        make: string;
        model: string;
        variant: string | null;
        year: number;
        plate: string;
        paint_hex: string;
        category: string;
        transmission: string;
        fuel_type: string;
        pickup_branch_name: string;
        pickup_branch_address: string;
        return_branch_name: string;
        return_branch_address: string;
        driver_name: string;
        driver_email: string;
      }
    | undefined;

  if (!booking) {
    notFound();
  }
  if (!isStaffRole(actor.role) && booking.user_id !== actor.id) {
    notFound();
  }

  const lineItems = sqlite
    .prepare(
      'SELECT kind, label, quantity, unit_minor, amount_minor FROM booking_line_items WHERE booking_id = ? ORDER BY sort_order ASC',
    )
    .all(booking.id) as Array<{
    kind: string;
    label: string;
    quantity: number;
    unit_minor: number;
    amount_minor: number;
  }>;

  const payments = sqlite
    .prepare(
      'SELECT kind, status, amount_minor, method, provider_ref, reason, created_at FROM payments WHERE booking_id = ? ORDER BY id ASC',
    )
    .all(booking.id) as Array<{
    kind: string;
    status: string;
    amount_minor: number;
    method: string | null;
    provider_ref: string | null;
    reason: string | null;
    created_at: number;
  }>;

  const invoice = sqlite
    .prepare(
      "SELECT series, fiscal_year, number, issued_at FROM invoices WHERE booking_id = ? AND kind = 'invoice' ORDER BY id DESC LIMIT 1",
    )
    .get(booking.id) as
    | { series: string; fiscal_year: number; number: number; issued_at: number }
    | undefined;

  const invoiceNumber = invoice
    ? `${invoice.series}-${invoice.fiscal_year}-${String(invoice.number).padStart(4, '0')}`
    : null;

  // Inspections query
  const inspections = sqlite
    .prepare(
      `
    SELECT i.*, u.name AS inspector_name
    FROM inspections i
    LEFT JOIN user u ON u.id = i.inspected_by
    WHERE i.booking_id = ?
    ORDER BY i.inspected_at ASC
  `,
    )
    .all(booking.id) as Array<{
    id: number;
    public_id: string;
    type: 'checkout' | 'checkin';
    odometer_km: number;
    fuel_kind: 'eighths' | 'percent';
    fuel_level: number;
    cleanliness: string | null;
    notes: string | null;
    customer_signed_at: number | null;
    inspector_name: string | null;
    inspected_at: number;
  }>;

  const inspectionMarks =
    inspections.length > 0
      ? (sqlite
          .prepare(
            `SELECT * FROM inspection_marks WHERE inspection_id IN (${inspections.map((i) => i.id).join(',')})`,
          )
          .all() as Array<{
          inspection_id: number;
          zone: string;
          kind: string;
          severity: number;
          note: string | null;
        }>)
      : [];

  const licence = sqlite
    .prepare('SELECT status FROM driver_licences WHERE user_id = ? ORDER BY id DESC LIMIT 1')
    .get(booking.user_id) as { status: string } | undefined;

  const settings = loadRentalSettings(sqlite);
  const refundPreview = computeCancellationRefund({
    totalPaidMinor: booking.total_minor,
    pickupAt: booking.start_at,
    cancelledAt: now,
    tiers: settings.cancellationTiers,
  });

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

  const badgeStatus =
    booking.status === 'active' ? (booking.end_at < now ? 'overdue' : 'active') : booking.status;

  const isOneWay = booking.pickup_branch_name !== booking.return_branch_name;
  const billableDays = Math.max(
    1,
    Math.round((booking.end_at - booking.start_at) / (24 * 3600 * 1000)),
  );

  // Build official SlipData for receipt export
  const slip = slipFromBooking({
    code: booking.code,
    status: booking.status,
    currency: 'INR',
    vehicleName: `${booking.year} ${booking.make} ${booking.model}`,
    vehiclePlate: booking.plate,
    vehicleCategory: booking.category,
    branchPickup: booking.pickup_branch_name,
    branchReturn: booking.return_branch_name,
    startAt: booking.start_at,
    endAt: booking.end_at,
    billableDays,
    customerName: booking.driver_name,
    lines: lineItems.map((li, idx) => ({
      id: `li-${idx}`,
      kind: toSlipLineKind(li.kind),
      label: li.label,
      quantity: li.quantity,
      unitMinor: li.unit_minor,
      amountMinor: li.amount_minor,
      isCredit: li.amount_minor < 0,
    })),
    subtotalMinor: booking.subtotal_minor ?? booking.total_minor,
    taxMinor: booking.tax_minor ?? 0,
    totalMinor: booking.total_minor,
    depositMinor: booking.deposit_minor,
    cancelDeadlineAt: booking.start_at - 24 * 3600 * 1000,
    paymentSummary: 'Paid in full via Autopay',
    issuedAt: booking.created_at ?? Date.now(),
  });

  // Construct Timeline events
  const hasDeparture = inspections.some((i) => i.type === 'checkout');
  const hasReturn = inspections.some((i) => i.type === 'checkin');

  const timelineEvents: TimelineEvent[] = [
    {
      id: 'step-booked',
      time: fmt(booking.created_at || booking.start_at - 86400000),
      title: 'Reservation confirmed & deposit hold authorized',
      description: 'Reservation booked with secured payment and security hold.',
      status: 'completed',
    },
    {
      id: 'step-kyc',
      time: fmt(booking.start_at),
      title: 'Driver KYC verification',
      description:
        licence?.status === 'approved'
          ? 'Driver identity and licence documents approved.'
          : 'Concierge identity verification at check-in.',
      status: licence?.status === 'approved' ? 'completed' : 'active',
    },
    {
      id: 'step-handover',
      time: fmt(booking.actual_start_at ?? booking.start_at),
      title: 'Departure handover inspection',
      description: hasDeparture
        ? 'Pre-trip vehicle inspection recorded with odometer and fuel check.'
        : 'Scheduled joint inspection and key handover at depot.',
      status: hasDeparture ? 'completed' : booking.status === 'active' ? 'active' : 'pending',
    },
    {
      id: 'step-onroad',
      time: fmt(booking.end_at),
      title: 'Rental journey',
      description: booking.actual_end_at
        ? 'Trip safely completed and vehicle returned.'
        : booking.status === 'active'
          ? 'Vehicle currently on route with active road cover.'
          : 'Scheduled rental travel period.',
      status: booking.actual_end_at
        ? 'completed'
        : booking.status === 'active'
          ? 'active'
          : 'pending',
    },
    {
      id: 'step-return',
      time: fmt(booking.actual_end_at ?? booking.end_at),
      title: 'Check-in inspection & deposit settlement',
      description: hasReturn
        ? 'Post-rental return inspection recorded. Security deposit release processed.'
        : 'Inspection of condition, mileage, and prompt release of deposit hold.',
      status: booking.status === 'completed' ? 'completed' : 'pending',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        {/* Navigation & Print Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4 print:hidden">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 text-label-s font-medium text-text-2 hover:text-text-1 transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to My trips</span>
          </Link>
          <ReceiptPrintButton />
        </div>

        {/* Vehicle and Booking Summary Card */}
        <div className="space-y-6 rounded-m border border-border bg-surface p-6 shadow-e1">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-5">
            <div className="space-y-1">
              <div className="text-label-s text-text-3">
                {invoiceNumber ? `Tax Invoice ${invoiceNumber}` : `Booking #${booking.code}`}
                {invoice ? ` · Issued ${fmt(invoice.issued_at)}` : ''}
              </div>
              <h1 className="font-display text-h2 font-bold text-text-1">
                {booking.year} {booking.make} {booking.model}{' '}
                {booking.variant ? (
                  <span className="text-body font-normal text-text-2">{booking.variant}</span>
                ) : null}
              </h1>
              <p className="text-body-s text-text-2 capitalize">
                {booking.category} category, {booking.transmission}, {booking.fuel_type}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Plate code={booking.plate} size="md" />
              <StatusBadge status={badgeStatus} />
            </div>
          </div>

          {/* Stations and Schedule */}
          <div className="grid gap-4 rounded-s border border-border-subtle bg-surface-sunken/40 p-5 sm:grid-cols-2 text-body-s">
            <div className="space-y-1">
              <span className="block text-label-s text-text-3">
                Pick-up {booking.actual_start_at ? '(Completed)' : '(Scheduled)'}
              </span>
              <div className="font-semibold text-text-1">
                {fmt(booking.actual_start_at ?? booking.start_at)}
              </div>
              <div className="font-medium text-text-1">{booking.pickup_branch_name}</div>
              <div className="text-caption text-text-3">{booking.pickup_branch_address}</div>
            </div>

            <div className="space-y-1">
              <span className="block text-label-s text-text-3">
                Return {booking.actual_end_at ? '(Completed)' : '(Scheduled)'} ·{' '}
                {isOneWay ? 'One-way' : 'Round trip'}
              </span>
              <div className="font-semibold text-text-1">
                {fmt(booking.actual_end_at ?? booking.end_at)}
              </div>
              <div className="font-medium text-text-1">{booking.return_branch_name}</div>
              <div className="text-caption text-text-3">{booking.return_branch_address}</div>
            </div>
          </div>

          {/* Lifecycle Timeline */}
          <div className="space-y-4 border-t border-border-subtle pt-6">
            <div className="flex items-center gap-2">
              <Clock size={20} weight="bold" className="text-accent" />
              <h3 className="font-display text-h4 font-semibold text-text-1">Trip lifecycle</h3>
            </div>
            <div className="rounded-s border border-border-subtle bg-surface p-5">
              <Timeline events={timelineEvents} />
            </div>
          </div>

          {/* Inspection Details Section */}
          <div className="space-y-4 border-t border-border-subtle pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge size={20} weight="bold" className="text-accent" />
                <h3 className="font-display text-h4 font-semibold text-text-1">
                  Handover inspections & condition
                </h3>
              </div>
              <span className="text-label-s text-text-3">{inspections.length} recorded</span>
            </div>

            {inspections.length === 0 ? (
              <div className="rounded-s border border-border-subtle bg-surface-sunken/40 p-5 text-center text-body-s text-text-2">
                Handover inspection report will be recorded jointly with your concierge upon vehicle
                pick-up at the depot.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {inspections.map((insp) => {
                  const marks = inspectionMarks.filter((m) => m.inspection_id === insp.id);
                  const isDeparture = insp.type === 'checkout';

                  return (
                    <div
                      key={insp.id}
                      className="space-y-3 rounded-s border border-border-subtle bg-surface p-4 shadow-e0"
                    >
                      <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                        <span className="font-semibold text-text-1">
                          {isDeparture ? 'Departure Inspection' : 'Return Check-in'}
                        </span>
                        <StatusBadge
                          status={isDeparture ? 'ready' : 'completed'}
                          label={isDeparture ? 'Handover out' : 'Returned'}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-body-s">
                        <div className="flex items-center gap-2">
                          <Gauge size={18} className="text-text-3" />
                          <div>
                            <span className="block text-caption text-text-3">Odometer</span>
                            <span className="font-semibold text-text-1 tabular-nums">
                              {insp.odometer_km.toLocaleString('en-IN')} km
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <GasPump size={18} className="text-text-3" />
                          <div>
                            <span className="block text-caption text-text-3">Fuel / Charge</span>
                            <span className="font-semibold text-text-1 tabular-nums">
                              {insp.fuel_kind === 'percent'
                                ? `${insp.fuel_level}%`
                                : `${insp.fuel_level}/8 tank`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {insp.cleanliness && (
                        <div className="flex items-center gap-2 text-caption text-text-2">
                          <Sparkle size={16} className="text-text-3" />
                          <span>Cabin cleanliness: </span>
                          <span className="font-medium capitalize text-text-1">
                            {insp.cleanliness}
                          </span>
                        </div>
                      )}

                      {marks.length > 0 && (
                        <div className="space-y-1.5 border-t border-border-subtle pt-2">
                          <span className="block text-caption font-semibold text-text-3">
                            Logged condition marks ({marks.length}):
                          </span>
                          <div className="space-y-1">
                            {marks.map((m, idx) => (
                              <div
                                key={`${m.zone}-${idx}`}
                                className="text-caption text-text-2 flex items-center justify-between"
                              >
                                <span className="capitalize">
                                  {m.zone}: {m.kind}
                                </span>
                                <span className="text-text-3">Severity {m.severity}/5</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="border-t border-border-subtle pt-2 text-caption text-text-3 flex items-center justify-between">
                        <span>Inspector: {insp.inspector_name || 'Staff concierge'}</span>
                        <span>{fmt(insp.inspected_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Itemized Charges & Financials */}
          <div className="space-y-4 border-t border-border-subtle pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-h4 font-semibold text-text-1">Itemized breakdown</h3>
              <span className="text-label-s text-text-3">Billed to {booking.driver_name}</span>
            </div>

            <div className="overflow-x-auto rounded-s border border-border-subtle">
              <table className="w-full border-collapse text-left text-body-s">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-sunken text-label-s text-text-3">
                    <th className="px-4 py-2.5 font-semibold">Description</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Unit rate</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {lineItems.map((li, i) => (
                    <tr key={`${li.kind}-${i}`}>
                      <td className="px-4 py-2.5 text-text-1">{li.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">
                        {li.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-2">
                        <Price amountMinor={li.unit_minor} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-text-1">
                        <Price amountMinor={li.amount_minor} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 pt-2 text-body-s">
              <div className="flex items-center justify-between text-text-2">
                <span>Taxable subtotal</span>
                <Price amountMinor={booking.subtotal_minor} size="sm" />
              </div>
              {booking.discount_minor > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span>Promotional discount</span>
                  <span>-₹{Math.round(booking.discount_minor / 100).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-text-2">
                <span>GST (18%)</span>
                <Price amountMinor={booking.tax_minor} size="sm" />
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-h4 font-bold text-text-1">
                <span>Total amount paid</span>
                <Price amountMinor={booking.total_minor} size="md" />
              </div>
            </div>
          </div>

          {/* Payment & Deposit Ledger */}
          <div className="space-y-3 border-t border-border-subtle pt-6">
            <h3 className="font-display text-h4 font-semibold text-text-1">
              Payment & deposit transaction ledger
            </h3>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div
                  key={`${p.kind}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border-subtle bg-surface-sunken/30 px-3.5 py-2.5 text-body-s"
                >
                  <span className="text-text-2">
                    <span className="font-medium capitalize text-text-1">
                      {p.kind.replaceAll('_', ' ')}
                    </span>{' '}
                    · {p.reason ?? p.status}
                    {p.method ? ` (${p.method})` : ''}
                    {p.provider_ref ? ` · Ref ${p.provider_ref}` : ''}
                  </span>
                  <Price amountMinor={p.amount_minor} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Thermal Receipt Export Section */}
          <div className="space-y-4 border-t border-border-subtle pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={20} weight="bold" className="text-accent" />
                <h3 className="font-display text-h4 font-semibold text-text-1">
                  Official thermal receipt slip
                </h3>
              </div>
              <ReceiptPrintButton />
            </div>

            <div className="flex justify-center rounded-s border border-border-subtle bg-surface-sunken/40 p-6">
              <ReceiptPaper slip={slip} />
            </div>
          </div>

          {/* Booking Lifecycle Actions (Extend / Cancel) */}
          <div className="border-t border-border-subtle pt-6 print:hidden">
            <TripActionsClient
              code={booking.code}
              status={booking.status}
              endAt={booking.end_at}
              refundPreviewMinor={refundPreview.refundMinor}
              refundRuleLabel={refundPreview.ruleLabel}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
