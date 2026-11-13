import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';
import { HandoverClient } from './HandoverClient';

export default async function StaffHandoverPage({
  params,
}: {
  params: Promise<{ code: string; mode: string }>;
}) {
  await requireStaffPage('handover.perform');
  const { code, mode } = await params;
  if (mode !== 'out' && mode !== 'in') {
    notFound();
  }

  const { sqlite } = getReadConnection();
  const booking = sqlite
    .prepare(
      `
    SELECT b.id, b.code, u.name AS customer_name, v.make, v.model, v.plate, v.paint_hex, v.odometer_km
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.code = ?
  `,
    )
    .get(code) as
    | {
        id: number;
        code: string;
        customer_name: string;
        make: string;
        model: string;
        plate: string;
        paint_hex: string;
        odometer_km: number;
      }
    | undefined;

  if (!booking) {
    notFound();
  }

  const checkoutInsp = sqlite
    .prepare(
      "SELECT fuel_level FROM inspections WHERE booking_id = ? AND type = 'checkout' ORDER BY id DESC LIMIT 1",
    )
    .get(booking.id) as { fuel_level: number } | undefined;

  return (
    <div className="min-h-screen bg-canvas text-text-1">
      <header className="border-b border-border bg-surface px-4 py-4 shadow-e1">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/staff" className="text-caption font-medium text-text-2 hover:text-text-1">
            Back to bay queue
          </Link>
          <Plate code={booking.code} paintHex={booking.paint_hex} size="sm" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <div>
          <h1 className="font-display text-h1 font-bold text-text-1">
            {mode === 'out' ? 'Pick-up check-out' : 'Return check-in'}
          </h1>
          <p className="text-body-s text-text-2">
            {booking.make} {booking.model} ({booking.plate}) — Driver: {booking.customer_name}
          </p>
        </div>

        <HandoverClient
          code={booking.code}
          mode={mode === 'out' ? 'checkout' : 'checkin'}
          defaultOdometerKm={booking.odometer_km}
          defaultFuelLevel={checkoutInsp?.fuel_level ?? 8}
        />
      </main>
    </div>
  );
}
