import { CalendarPlus, CheckCircle2, FileText } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { PlateStamp } from '@/ui/motion/PlateStamp';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

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
    SELECT b.*, v.make, v.model, v.year, v.plate, v.paint_hex, br.name AS branch_name, br.address AS branch_address
    FROM bookings b
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches br ON br.id = b.pickup_branch_id
    WHERE b.code = ?
  `,
    )
    .get(code) as
    | {
        code: string;
        status: string;
        start_at: number;
        end_at: number;
        total_minor: number;
        deposit_minor: number;
        make: string;
        model: string;
        year: number;
        plate: string;
        paint_hex: string;
        branch_name: string;
        branch_address: string;
      }
    | undefined;

  if (!booking) {
    notFound();
  }

  const fmt = (ms: number) =>
    new Date(ms).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <div className="space-y-6 rounded-m border border-line bg-surface p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-go-600">
                <CheckCircle2 className="h-4 w-4" /> Reservation recorded
              </div>
              <h1 className="font-display text-2xl font-bold text-ink">
                {booking.year} {booking.make} {booking.model}
              </h1>
            </div>
            <PlateStamp>
              <Plate code={booking.code} paintHex={booking.paint_hex} />
            </PlateStamp>
          </div>

          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs text-ink-muted">Pick-up</div>
              <div className="font-semibold text-ink">{fmt(booking.start_at)}</div>
              <div className="text-xs text-ink-muted">{booking.branch_name}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Return</div>
              <div className="font-semibold text-ink">{fmt(booking.end_at)}</div>
              <div className="text-xs text-ink-muted">{booking.branch_address}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-s border border-line bg-surface-subtle p-4 text-sm">
            <div>
              <div className="text-xs text-ink-muted">Paid total (incl. GST)</div>
              <MoneyText amountMinor={booking.total_minor} className="text-lg font-bold text-ink" />
            </div>
            <StatusBadge status={booking.status} />
          </div>

          {booking.status === 'pending_approval' && (
            <div className="rounded-s border border-amber-600 bg-amber-100 p-4 text-xs text-petrol-950">
              Your driving licence still needs quick verification before pick-up.{' '}
              <Link href="/account/licence" className="font-semibold underline">
                Upload your licence now
              </Link>{' '}
              so our desk can approve it ahead of your arrival.
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href={`/api/ics/${booking.code}`}
              className="inline-flex h-10 items-center gap-2 rounded-s border border-line bg-surface px-4 text-xs font-medium text-ink hover:bg-surface-subtle"
            >
              <CalendarPlus className="h-4 w-4" /> Add to calendar (.ics)
            </a>
            <Link
              href={`/trips/${booking.code}`}
              className="inline-flex h-10 items-center gap-2 rounded-s bg-ink px-4 text-xs font-medium text-surface"
            >
              <FileText className="h-4 w-4" /> Manage trip & receipt
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
