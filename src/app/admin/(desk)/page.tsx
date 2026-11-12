import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Today operations desk
          </h1>
          <p className="text-sm text-ink-muted">
            Exceptions surface first, followed by live handovers and fleet readiness.
          </p>
        </div>
        <Link
          href="/staff"
          className="inline-flex h-10 items-center rounded-s bg-ink px-4 text-xs font-medium text-surface"
        >
          Open bay handover queue
        </Link>
      </div>

      {/* 4 Typographic figures */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-m border border-line bg-surface p-4">
          <div className="text-xs text-ink-muted">Active fleet</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
            {stats.active_fleet}
          </div>
        </div>
        <div className="rounded-m border border-line bg-surface p-4">
          <div className="text-xs text-ink-muted">Currently on road</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
            {stats.on_road}
          </div>
        </div>
        <div className="rounded-m border border-line bg-surface p-4">
          <div className="text-xs text-ink-muted">Turnaround bay</div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">
            {stats.turnaround_queue}
          </div>
        </div>
        <div className="rounded-m border border-line bg-surface p-4">
          <div className="text-xs text-ink-muted">Collected revenue</div>
          <MoneyText
            amountMinor={stats.gross_revenue}
            size="large"
            className="mt-1 text-2xl text-ink"
          />
        </div>
      </div>

      {/* Exceptions First */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink">Attention needed</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-m border border-line bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Overdue returns</span>
              <StatusBadge status={overdue.length > 0 ? 'overdue' : 'ready'} />
            </div>
            {overdue.length === 0 ? (
              <p className="text-xs text-ink-muted">No overdue vehicles right now.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {overdue.map((o) => (
                  <li
                    key={o.code}
                    className="flex items-center justify-between border-t border-line pt-2"
                  >
                    <div>
                      <div className="font-semibold text-ink">{o.customer_name}</div>
                      <div className="text-ink-muted">
                        {o.make} {o.model}
                      </div>
                    </div>
                    <Link href={`/staff/handover/${o.code}/in`} className="text-stop-600 underline">
                      Check in
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-m border border-line bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Pending KYC review</span>
              <StatusBadge status={pendingKycCount > 0 ? 'pending' : 'verified'} />
            </div>
            <p className="text-xs text-ink-muted">
              {pendingKycCount} driving {pendingKycCount === 1 ? 'licence' : 'licences'} waiting for
              verification.
            </p>
            <Link
              href="/admin/kyc"
              className="inline-block text-xs font-medium text-petrol-700 hover:underline"
            >
              Open KYC queue
            </Link>
          </div>

          <div className="rounded-m border border-line bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Expiring compliance docs</span>
              <StatusBadge status={expiringDocs.length > 0 ? 'pending' : 'ready'} />
            </div>
            {expiringDocs.length === 0 ? (
              <p className="text-xs text-ink-muted">
                All RC, insurance, and PUC docs valid beyond 14 days.
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {expiringDocs.map((d, i) => (
                  <li
                    key={`${d.vehicle_id}-${d.kind}-${i}`}
                    className="flex items-center justify-between"
                  >
                    <Link
                      href={`/admin/fleet/${d.vehicle_id}`}
                      className="text-ink hover:underline"
                    >
                      {d.plate} ({d.kind})
                    </Link>
                    <span className="font-mono text-stop-600">{d.expires_on}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Currently on route (taken) */}
      <section className="space-y-3 rounded-m border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Currently on route (taken)</h2>
            <p className="text-xs text-ink-muted">
              Vehicles checked out and actively in transit with customers.
            </p>
          </div>
          <Link
            href="/admin/bookings"
            className="text-xs font-medium text-petrol-700 hover:underline"
          >
            Manage all
          </Link>
        </div>
        {onRoute.length === 0 ? (
          <p className="text-sm text-ink-muted">No vehicles currently on route.</p>
        ) : (
          <div className="divide-y divide-line">
            {onRoute.map((r) => (
              <div
                key={r.code}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Plate code={r.code} paintHex={r.paint_hex} size="sm" />
                  <div>
                    <div className="font-medium text-ink">
                      {r.customer_name} · {r.make} {r.model} ({r.plate})
                    </div>
                    <div className="text-xs text-ink-muted">
                      Route:{' '}
                      {r.pickup_branch_name === r.return_branch_name
                        ? `${r.pickup_branch_name} (Round trip)`
                        : `${r.pickup_branch_name} → ${r.return_branch_name}`}{' '}
                      · Due back{' '}
                      {new Date(r.end_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'Asia/Kolkata',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status="taken" />
                  <Link
                    href={`/staff/handover/${r.code}/in`}
                    className="rounded-s border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-subtle"
                  >
                    Check in
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Next 24h pickups */}
      <section className="space-y-3 rounded-m border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Upcoming pick-ups (next 24h)</h2>
          <Link
            href="/admin/bookings"
            className="text-xs font-medium text-petrol-700 hover:underline"
          >
            All bookings
          </Link>
        </div>
        {upcomingPickups.length === 0 ? (
          <p className="text-sm text-ink-muted">No scheduled pick-ups in the next 24 hours.</p>
        ) : (
          <div className="divide-y divide-line">
            {upcomingPickups.map((p) => (
              <div
                key={p.code}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Plate code={p.code} paintHex={p.paint_hex} size="sm" />
                  <div>
                    <div className="font-medium text-ink">{p.customer_name}</div>
                    <div className="text-xs text-ink-muted">
                      {p.make} {p.model} ({p.plate})
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <Link
                    href={`/staff/handover/${p.code}/out`}
                    className="rounded-s border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-subtle"
                  >
                    Start handover
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
