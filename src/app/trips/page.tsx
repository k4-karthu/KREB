import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { EmptyState } from '@/ui/data/EmptyState';
import { TripTicket } from '@/ui/data/TripTicket';

interface TripRow {
  code: string;
  status: string;
  start_at: number;
  end_at: number;
  actual_start_at: number | null;
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
  return_branch_name: string;
  image_key: string | null;
  invoice_series: string | null;
  invoice_year: number | null;
  invoice_number: number | null;
  line_count: number;
}

export const dynamic = 'force-dynamic';

export default async function MyTripsPage() {
  const actor = await getServerActor();
  if (!actor) {
    redirect('/login?next=/trips');
  }

  const now = Date.now();
  const { sqlite } = getReadConnection();
  const trips = sqlite
    .prepare(
      `
    SELECT b.code, b.status, b.start_at, b.end_at, b.actual_start_at, b.total_minor, b.deposit_minor,
           v.make, v.model, v.variant, v.year, v.plate, v.paint_hex, v.category, v.transmission, v.fuel_type,
           pbr.name AS pickup_branch_name, rbr.name AS return_branch_name,
           (SELECT vi.file_key FROM vehicle_images vi WHERE vi.vehicle_id = v.id ORDER BY vi.is_primary DESC, vi.sort_order ASC LIMIT 1) AS image_key,
           inv.series AS invoice_series, inv.fiscal_year AS invoice_year, inv.number AS invoice_number,
           (SELECT COUNT(*) FROM booking_line_items bli WHERE bli.booking_id = b.id) AS line_count
    FROM bookings b
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches pbr ON pbr.id = b.pickup_branch_id
    JOIN branches rbr ON rbr.id = b.return_branch_id
    LEFT JOIN invoices inv ON inv.booking_id = b.id AND inv.kind = 'invoice'
    WHERE b.user_id = ?
    ORDER BY b.start_at DESC
  `,
    )
    .all(actor.id) as TripRow[];

  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });

  const resolveTripBadge = (t: TripRow): string => {
    if (t.status === 'active') {
      return t.end_at < now ? 'overdue' : 'active';
    }
    return t.status;
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-6">
          <div>
            <h1 className="font-display text-h2 font-bold tracking-tight text-text-1">My trips</h1>
            <p className="mt-1 text-body-s text-text-2">
              Active rentals on route, upcoming pick-ups, approval requests, and official slips.
            </p>
          </div>
          <Link
            href="/cars"
            className="inline-flex h-10 items-center justify-center rounded-s bg-accent px-5 text-label-s font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
          >
            Book a vehicle
          </Link>
        </div>

        {trips.length === 0 ? (
          <EmptyState
            iconName="car"
            heading="No trips booked yet"
            description="You have no active or completed rentals. Explore our verified vehicle catalog to reserve your first ride."
            action={
              <Link
                href="/cars"
                className="inline-flex h-10 items-center justify-center rounded-s bg-accent px-5 text-label-s font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
              >
                Browse available fleet
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-label-s text-text-3">
              <span>
                {trips.length} {trips.length === 1 ? 'reservation' : 'reservations'} recorded
              </span>
              <span>Sorted by start date</span>
            </div>

            <div className="grid gap-4">
              {trips.map((t) => {
                const isOneWay = t.pickup_branch_name !== t.return_branch_name;
                const branchDisplay = isOneWay
                  ? `${t.pickup_branch_name} to ${t.return_branch_name}`
                  : t.pickup_branch_name;

                return (
                  <TripTicket
                    key={t.code}
                    trip={{
                      code: t.code,
                      vehicleTitle: `${t.year} ${t.make} ${t.model}${t.variant ? ` ${t.variant}` : ''}`,
                      vehiclePlate: t.plate,
                      imageSrc: t.image_key
                        ? `/api/uploads/public/${t.image_key}-640.webp`
                        : undefined,
                      pickupLabel: fmt(t.start_at),
                      returnLabel: fmt(t.end_at),
                      branchName: branchDisplay,
                      status: resolveTripBadge(t),
                      totalMinor: t.total_minor,
                    }}
                    href={`/trips/${t.code}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
