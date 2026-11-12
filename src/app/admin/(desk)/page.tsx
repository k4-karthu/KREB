import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';

export default async function AdminTodayPage() {
  await requireStaffPage('admin.access');
  const { sqlite } = getReadConnection();
  const now = Date.now();
  const next24h = now + 86_400_000;
  const in14Days = new Date(now + 14 * 86_400_000).toISOString().slice(0, 10);

  const overdue = sqlite
    .prepare(
      `
    SELECT b.code, b.end_at, u.name AS customer_name, v.make, v.model, v.plate, v.paint_hex
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status = 'active' AND b.end_at < ?
    ORDER BY b.end_at ASC
  `,
    )
    .all(now) as Array<{
    code: string;
    end_at: number;
    customer_name: string;
    make: string;
    model: string;
    plate: string;
    paint_hex: string;
  }>;

  const onRoute = sqlite
    .prepare(
      `
    SELECT b.code, b.start_at, b.end_at, b.actual_start_at,
           u.name AS customer_name, v.make, v.model, v.plate, v.paint_hex,
           pbr.name AS pickup_branch_name, rbr.name AS return_branch_name
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches pbr ON pbr.id = b.pickup_branch_id
    JOIN branches rbr ON rbr.id = b.return_branch_id
    WHERE b.status = 'active' AND b.end_at >= ?
    ORDER BY b.end_at ASC
  `,
    )
    .all(now) as Array<{
    code: string;
    start_at: number;
    end_at: number;
    actual_start_at: number | null;
    customer_name: string;
    make: string;
    model: string;
    plate: string;
    paint_hex: string;
    pickup_branch_name: string;
    return_branch_name: string;
  }>;

  const pendingKycCount = (
    sqlite
      .prepare("SELECT COUNT(*) AS cnt FROM driver_licences WHERE status = 'pending'")
      .get() as { cnt: number }
  ).cnt;

  const expiringDocs = sqlite
    .prepare(
      `
    SELECT vd.kind, vd.expires_on, v.id AS vehicle_id, v.make, v.model, v.plate
    FROM vehicle_documents vd
    JOIN vehicles v ON v.id = vd.vehicle_id
    WHERE v.deleted_at IS NULL AND vd.expires_on IS NOT NULL AND vd.expires_on <= ?
    ORDER BY vd.expires_on ASC
    LIMIT 8
  `,
    )
    .all(in14Days) as Array<{
    kind: string;
    expires_on: string;
    vehicle_id: number;
    make: string;
    model: string;
    plate: string;
  }>;

  const upcomingPickups = sqlite
    .prepare(
      `
    SELECT b.code, b.start_at, b.status, u.name AS customer_name, v.make, v.model, v.plate, v.paint_hex
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status IN ('confirmed', 'pending_approval') AND b.start_at <= ?
    ORDER BY b.start_at ASC
    LIMIT 10
  `,
    )
    .all(next24h) as Array<{
    code: string;
    start_at: number;
    status: string;
    customer_name: string;
    make: string;
    model: string;
    plate: string;
    paint_hex: string;
  }>;

  const stats = sqlite
    .prepare(
      `
    SELECT
      (SELECT COUNT(*) FROM vehicles WHERE lifecycle = 'active' AND deleted_at IS NULL) AS active_fleet,
      (SELECT COUNT(*) FROM bookings WHERE status = 'active') AS on_road,
      (SELECT COALESCE(SUM(amount_minor), 0) FROM payments WHERE kind = 'charge' AND status = 'succeeded') AS gross_revenue,
      (SELECT COUNT(*) FROM vehicles WHERE ops_state != 'ready' AND deleted_at IS NULL) AS turnaround_queue
  `,
    )
    .get() as {
    active_fleet: number;
    on_road: number;
    gross_revenue: number;
    turnaround_queue: number;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h3 font-bold text-text-1">Today operations desk</h1>
          <p className="text-body-s text-text-3">
            Real-time telemetry, bay readiness, and operational exception flags.
          </p>
        </div>
        <Link
          href="/staff"
          className="inline-flex h-10 items-center justify-center rounded-xs bg-accent px-4 text-body-s font-semibold text-on-accent hover:opacity-90 transition-opacity shadow-e0"
        >
          Open Bay Handover Mode
        </Link>
      </div>

      {/* 4 Elevated Metric Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-m border border-border bg-surface p-5 shadow-e0">
          <div className="text-caption font-medium  text-text-3">Active Fleet</div>
          <div className="mt-2 font-display text-h2 font-bold tabular-nums text-text-1">
            {stats.active_fleet}
          </div>
          <div className="mt-1 text-label-s text-text-3">Vehicles registered in service</div>
        </div>

        <div className="rounded-m border border-border bg-surface p-5 shadow-e0">
          <div className="text-caption font-medium  text-text-3">Currently On Road</div>
          <div className="mt-2 font-display text-h2 font-bold tabular-nums text-accent">
            {stats.on_road}
          </div>
          <div className="mt-1 text-label-s text-text-3">Live customer rentals</div>
        </div>

        <div className="rounded-m border border-border bg-surface p-5 shadow-e0">
          <div className="text-caption font-medium  text-text-3">Turnaround Bay</div>
          <div className="mt-2 font-display text-h2 font-bold tabular-nums text-text-1">
            {stats.turnaround_queue}
          </div>
          <div className="mt-1 text-label-s text-text-3">Cleaning & return inspection</div>
        </div>

        <div className="rounded-m border border-border bg-surface p-5 shadow-e0">
          <div className="text-caption font-medium  text-text-3">Collected Revenue</div>
          <div className="mt-2">
            <Price minorUnits={stats.gross_revenue} className="text-h2 font-bold text-text-1" />
          </div>
          <div className="mt-1 text-label-s text-text-3">Settled gateway transactions</div>
        </div>
      </div>

      {/* Exceptions First */}
      <section className="space-y-4">
        <h2 className="text-h4 font-display font-semibold text-text-1">
          Immediate Operational Flags
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Overdue Returns */}
          <div className="rounded-m border border-border bg-surface p-5 space-y-3 shadow-e0">
            <div className="flex items-center justify-between">
              <span className="text-body font-semibold text-text-1">Overdue Returns</span>
              <StatusBadge status={overdue.length > 0 ? 'overdue' : 'ready'} />
            </div>
            {overdue.length === 0 ? (
              <p className="text-body-s text-text-3">Zero overdue vehicles currently on road.</p>
            ) : (
              <ul className="space-y-2.5 text-body-s divide-y divide-border-subtle">
                {overdue.map((o) => (
                  <li key={o.code} className="flex items-center justify-between pt-2.5">
                    <div>
                      <div className="font-semibold text-text-1">{o.customer_name}</div>
                      <div className="text-caption text-text-3">
                        {o.make} {o.model} · <span className="tabular-nums">{o.plate}</span>
                      </div>
                    </div>
                    <Link
                      href={`/staff/handover/${o.code}/in`}
                      className="text-label-s font-semibold text-danger hover:underline"
                    >
                      Process Check In
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending KYC Review */}
          <div className="rounded-m border border-border bg-surface p-5 space-y-3 shadow-e0">
            <div className="flex items-center justify-between">
              <span className="text-body font-semibold text-text-1">Pending KYC Queue</span>
              <StatusBadge status={pendingKycCount > 0 ? 'pending' : 'verified'} />
            </div>
            <p className="text-body-s text-text-3">
              {pendingKycCount} driving {pendingKycCount === 1 ? 'licence' : 'licences'} waiting for
              staff verification.
            </p>
            <div className="pt-2">
              <Link
                href="/admin/kyc"
                className="inline-flex items-center text-body-s font-medium text-accent hover:underline"
              >
                Inspect KYC Queue →
              </Link>
            </div>
          </div>

          {/* Expiring Compliance Documents */}
          <div className="rounded-m border border-border bg-surface p-5 space-y-3 shadow-e0">
            <div className="flex items-center justify-between">
              <span className="text-body font-semibold text-text-1">Expiring Statutory Docs</span>
              <StatusBadge status={expiringDocs.length > 0 ? 'pending' : 'ready'} />
            </div>
            {expiringDocs.length === 0 ? (
              <p className="text-body-s text-text-3">
                All RC, insurance, and PUC documents valid beyond 14 days.
              </p>
            ) : (
              <ul className="space-y-2 text-body-s">
                {expiringDocs.map((d, i) => (
                  <li
                    key={`${d.vehicle_id}-${d.kind}-${i}`}
                    className="flex items-center justify-between text-body-s"
                  >
                    <Link
                      href={`/admin/fleet/${d.vehicle_id}`}
                      className="text-text-1 hover:text-accent hover:underline truncate"
                    >
                      {d.plate} ({d.kind})
                    </Link>
                    <span className="tabular-nums text-label-s text-warning">{d.expires_on}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Currently On Route (Taken) */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h4 font-display font-semibold text-text-1">
              Active on Route (Checked Out)
            </h2>
            <p className="text-body-s text-text-3">Vehicles actively in transit with customers.</p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-body-s font-medium text-accent hover:underline"
          >
            View Bookings Manifest →
          </Link>
        </div>

        {onRoute.length === 0 ? (
          <p className="text-body-s text-text-3 py-4">No vehicles currently on route.</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {onRoute.map((r) => (
              <div
                key={r.code}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-body-s"
              >
                <div className="flex items-center gap-3">
                  <Plate code={r.code} size="sm" />
                  <div>
                    <div className="font-semibold text-text-1">
                      {r.customer_name} · {r.make} {r.model} ({r.plate})
                    </div>
                    <div className="text-caption text-text-3">
                      Route:{' '}
                      {r.pickup_branch_name === r.return_branch_name
                        ? `${r.pickup_branch_name} (Round trip)`
                        : `${r.pickup_branch_name} → ${r.return_branch_name}`}{' '}
                      · Due back{' '}
                      {new Intl.DateTimeFormat('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'Asia/Kolkata',
                      }).format(new Date(r.end_at))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status="active" />
                  <Link
                    href={`/staff/handover/${r.code}/in`}
                    className="rounded-xs border border-border bg-surface px-3 py-1.5 text-label-s font-semibold text-text-1 hover:bg-surface-sunken transition-colors"
                  >
                    Check in
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming 24h Pickups */}
      <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h4 font-display font-semibold text-text-1">
              Upcoming Handover Pickups (Next 24h)
            </h2>
            <p className="text-body-s text-text-3">
              Reserved bookings scheduled for collection today.
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-body-s font-medium text-accent hover:underline"
          >
            All Bookings →
          </Link>
        </div>

        {upcomingPickups.length === 0 ? (
          <p className="text-body-s text-text-3 py-4">
            No scheduled collections in the next 24 hours.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {upcomingPickups.map((p) => (
              <div
                key={p.code}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-body-s"
              >
                <div className="flex items-center gap-3">
                  <Plate code={p.code} size="sm" />
                  <div>
                    <div className="font-semibold text-text-1">{p.customer_name}</div>
                    <div className="text-caption text-text-3">
                      {p.make} {p.model} ({p.plate})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <Link
                    href={`/staff/handover/${p.code}/out`}
                    className="rounded-xs bg-accent px-3 py-1.5 text-label-s font-semibold text-on-accent hover:opacity-90 transition-opacity"
                  >
                    Start Handover
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
