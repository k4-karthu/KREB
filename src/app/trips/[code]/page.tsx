import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { computeCancellationRefund } from '@/domain/booking/cancellation';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { getServerActor } from '@/server/auth';
import { isStaffRole } from '@/server/permissions';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';
import { ReceiptPrintButton } from './ReceiptPrintButton';
import { TripActionsClient } from './TripActionsClient';

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
    booking.status === 'active' ? (booking.end_at < now ? 'overdue' : 'on_route') : booking.status;

  const isOneWay = booking.pickup_branch_name !== booking.return_branch_name;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/trips"
            className="text-xs font-medium text-ink-muted hover:text-ink print:hidden"
          >
            Back to My trips
          </Link>
          <ReceiptPrintButton />
        </div>

        <div className="space-y-6 rounded-m border border-line bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div className="space-y-1">
              <div className="text-xs font-medium text-ink-muted">
                {invoiceNumber ? `Tax Invoice ${invoiceNumber}` : 'Booking Summary'}
                {invoice ? ` · Issued ${fmt(invoice.issued_at)}` : ''}
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">
                {booking.year} {booking.make} {booking.model}{' '}
                {booking.variant ? (
                  <span className="text-base font-normal text-ink-muted">{booking.variant}</span>
                ) : null}
              </h1>
              <p className="text-xs text-ink-muted capitalize">
                {booking.category}, {booking.transmission}, {booking.fuel_type} — Plate{' '}
                <span className="font-mono text-ink">{booking.plate}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Plate code={booking.code} paintHex={booking.paint_hex} />
              <StatusBadge status={badgeStatus} />
            </div>
          </div>

          <div className="grid gap-4 rounded-s border border-line bg-surface-subtle p-4 text-sm sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-ink-muted">
                Pick-up {booking.actual_start_at ? '(Taken)' : '(Scheduled)'}
              </div>
              <div className="font-semibold text-ink">
                {fmt(booking.actual_start_at ?? booking.start_at)}
              </div>
              <div className="text-xs font-medium text-ink">{booking.pickup_branch_name}</div>
              <div className="text-xs text-ink-muted">{booking.pickup_branch_address}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-ink-muted">
                Return {booking.actual_end_at ? '(Returned)' : '(Scheduled)'} ·{' '}
                {isOneWay ? 'One-way' : 'Round trip'}
              </div>
              <div className="font-semibold text-ink">
                {fmt(booking.actual_end_at ?? booking.end_at)}
              </div>
              <div className="text-xs font-medium text-ink">{booking.return_branch_name}</div>
              <div className="text-xs text-ink-muted">{booking.return_branch_address}</div>
            </div>
          </div>

          <div className="space-y-3 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-ink">Itemized receipt</div>
              <div className="text-xs text-ink-muted">Billed to {booking.driver_name}</div>
            </div>
            <div className="overflow-x-auto rounded-s border border-line">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-line bg-surface-subtle text-ink-muted">
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lineItems.map((li, i) => (
                    <tr key={`${li.kind}-${i}`}>
                      <td className="px-3 py-2 text-ink">{li.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        {li.quantity}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-muted">
                        <MoneyText amountMinor={li.unit_minor} />
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums text-ink">
                        <MoneyText amountMinor={li.amount_minor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between text-ink-muted">
                <span>Taxable subtotal</span>
                <MoneyText amountMinor={booking.subtotal_minor} />
              </div>
              {booking.discount_minor > 0 && (
                <div className="flex items-center justify-between text-go-600">
                  <span>Discounts applied</span>
                  <MoneyText amountMinor={-booking.discount_minor} />
                </div>
              )}
              <div className="flex items-center justify-between text-ink-muted">
                <span>GST (18%)</span>
                <MoneyText amountMinor={booking.tax_minor} />
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-sm font-bold text-ink">
                <span>Total paid</span>
                <MoneyText amountMinor={booking.total_minor} />
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-4 text-sm">
            <div className="font-semibold text-ink">Payment & deposit ledger</div>
            {payments.map((p, i) => (
              <div
                key={`${p.kind}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <span className="text-ink-muted">
                  <span className="font-medium capitalize text-ink">
                    {p.kind.replaceAll('_', ' ')}
                  </span>{' '}
                  · {p.reason ?? p.status}
                  {p.method ? ` (${p.method.toUpperCase()})` : ''}
                  {p.provider_ref ? ` · Ref ${p.provider_ref}` : ''}
                </span>
                <MoneyText amountMinor={p.amount_minor} className="font-medium text-ink" />
              </div>
            ))}
          </div>

          <div className="border-t border-line pt-4 print:hidden">
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
