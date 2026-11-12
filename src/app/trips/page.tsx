import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

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
      return t.end_at < now ? 'overdue' : 'on_route';
    }
    return t.status;
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">My trips</h1>
            <p className="text-sm text-ink-muted">
              Active rentals on route, upcoming pick-ups, approval requests, and itemized receipts.
            </p>
          </div>
          <Link
            href="/cars"
            className="inline-flex h-10 items-center rounded-s bg-ink px-4 text-xs font-medium text-surface"
          >
            Book another car
          </Link>
        </div>

        {trips.length === 0 ? (
          <div className="rounded-m border border-line bg-surface p-8 text-center text-sm text-ink-muted">
            You have no trips yet. Pick your dates in the fleet catalog to reserve a car.
          </div>
        ) : (
          <div className="grid gap-4">
            {trips.map((t) => {
              const isOneWay = t.pickup_branch_name !== t.return_branch_name;
              const invoiceCode =
                t.invoice_series && t.invoice_year && t.invoice_number
                  ? `${t.invoice_series}-${t.invoice_year}-${String(t.invoice_number).padStart(4, '0')}`
                  : null;
              return (
                <Link
                  key={t.code}
                  href={`/trips/${t.code}`}
                  className="group grid gap-4 rounded-m border border-line bg-surface p-4 transition-colors hover:border-petrol-600 sm:grid-cols-12 sm:items-center"
                >
                  <div className="aspect-3/2 overflow-hidden rounded-s border border-line bg-surface-subtle sm:col-span-3">
                    {t.image_key ? (
                      <img
                        src={`/api/uploads/public/${t.image_key}-640.webp`}
                        alt={`${t.year} ${t.make} ${t.model}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-end p-2 text-xs font-semibold text-surface"
                        style={{ backgroundColor: t.paint_hex }}
                      >
                        {t.make} {t.model}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Plate code={t.code} paintHex={t.paint_hex} size="sm" />
                      <StatusBadge status={resolveTripBadge(t)} />
                      {invoiceCode && (
                        <span className="rounded-s border border-line bg-surface-subtle px-2 py-0.5 font-mono text-xs text-ink-muted">
                          Receipt {invoiceCode}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-display text-lg font-bold text-ink">
                        {t.year} {t.make} {t.model}{' '}
                        {t.variant ? (
                          <span className="text-sm font-normal text-ink-muted">{t.variant}</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-ink-muted capitalize">
                        {t.category}, {t.transmission}, {t.fuel_type} (Plate {t.plate})
                      </div>
                    </div>

                    <div className="text-xs text-ink-muted">
                      <span className="font-medium text-ink">
                        {fmt(t.start_at)} to {fmt(t.end_at)}
                      </span>{' '}
                      at{' '}
                      {isOneWay
                        ? `${t.pickup_branch_name} → ${t.return_branch_name} (One-way)`
                        : `${t.pickup_branch_name} (Round trip)`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-line pt-3 sm:col-span-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-ink-muted">
                        Total ({t.line_count} {t.line_count === 1 ? 'item' : 'items'})
                      </div>
                      <MoneyText
                        amountMinor={t.total_minor}
                        className="text-lg font-bold text-ink"
                      />
                    </div>
                    <span className="inline-flex h-8 items-center rounded-s border border-line bg-surface-subtle px-3 text-xs font-medium text-petrol-700 group-hover:border-petrol-600">
                      Open ticket & receipt
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
