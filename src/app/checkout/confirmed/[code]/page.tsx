import { notFound } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { slipFromBooking } from '@/ui/components/receipt/adapters';
import type { SlipLineKind } from '@/ui/components/receipt/types';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { BookingConfirmedClient } from './BookingConfirmedClient';

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

export const dynamic = 'force-dynamic';

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { sqlite } = getReadConnection();

  const booking = sqlite
    .prepare(
      `
    SELECT b.*,
           v.make, v.model, v.year, v.plate, v.paint_hex, v.category,
           br.name AS branch_name, br.address AS branch_address,
           u.name AS driver_name, u.email AS driver_email
    FROM bookings b
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches br ON br.id = b.pickup_branch_id
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
        subtotal_minor: number;
        tax_minor: number;
        total_minor: number;
        deposit_minor: number;
        created_at: number;
        make: string;
        model: string;
        year: number;
        plate: string;
        paint_hex: string;
        category: string;
        branch_name: string;
        branch_address: string;
        driver_name: string;
        driver_email: string;
      }
    | undefined;

  if (!booking) {
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

  const licence = sqlite
    .prepare('SELECT status FROM driver_licences WHERE user_id = ? ORDER BY id DESC LIMIT 1')
    .get(booking.user_id) as { status: string } | undefined;

  const billableDays = Math.max(
    1,
    Math.round((booking.end_at - booking.start_at) / (24 * 3600 * 1000)),
  );

  const slip = slipFromBooking({
    code: booking.code,
    status: booking.status,
    currency: 'INR',
    vehicleName: `${booking.year} ${booking.make} ${booking.model}`,
    vehiclePlate: booking.plate,
    vehicleCategory: booking.category,
    branchPickup: booking.branch_name,
    branchReturn: booking.branch_name,
    startAt: booking.start_at,
    endAt: booking.end_at,
    billableDays,
    customerName: booking.driver_name,
    lines: lineItems.map((li, idx) => ({
      id: `bl-${idx}`,
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

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="flex-1">
        <BookingConfirmedClient
          booking={{
            code: booking.code,
            status: booking.status,
            startAt: booking.start_at,
            endAt: booking.end_at,
            totalMinor: booking.total_minor,
            depositMinor: booking.deposit_minor,
            year: booking.year,
            make: booking.make,
            model: booking.model,
            plate: booking.plate,
            category: booking.category,
            branchName: booking.branch_name,
            branchAddress: booking.branch_address,
            driverName: booking.driver_name,
            driverEmail: booking.driver_email,
          }}
          licenceStatus={licence?.status ?? null}
          slip={slip}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
