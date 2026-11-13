import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';
import { StatusBadge } from '@/ui/data/StatusBadge';

export default async function StaffBayQueuePage() {
  await requireStaffPage('handover.perform');
  const { sqlite } = getReadConnection();

  const pickups = sqlite
    .prepare(
      `
    SELECT b.code, b.start_at, u.name AS customer_name, v.make, v.model, v.plate, v.paint_hex
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status = 'confirmed'
    ORDER BY b.start_at ASC
    LIMIT 15
  `,
    )
    .all() as Array<{
    code: string;
    start_at: number;
    customer_name: string;
    make: string;
    model: string;
    plate: string;
    paint_hex: string;
  }>;

  const returns = sqlite
    .prepare(
      `
    SELECT b.code, b.end_at, u.name AS customer_name, v.make, v.model, v.plate, v.paint_hex
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    WHERE b.status = 'active'
    ORDER BY b.end_at ASC
    LIMIT 15
  `,
    )
    .all() as Array<{
    code: string;
    end_at: number;
    customer_name: string;
    make: string;
    model: string;
    plate: string;
    paint_hex: string;
  }>;

  return (
    <div className="min-h-screen bg-canvas text-text-1">
      <header className="border-b border-border bg-surface px-4 py-4 shadow-e1">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <div className="font-display text-h3 font-bold text-text-1">Kerb Bay Handover</div>
            <div className="text-caption text-text-2">Mobile tablet inspection desk</div>
          </div>
          <Link href="/admin" className="text-caption font-medium text-accent hover:underline">
            Admin desk
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-6">
        <section className="space-y-3">
          <h1 className="font-display text-h2 font-bold text-text-1">Ready for check-out</h1>
          <div className="space-y-2.5">
            {pickups.map((p) => (
              <Link
                key={p.code}
                href={`/staff/handover/${p.code}/out`}
                className="flex items-center justify-between rounded-m border border-border bg-surface p-4 hover:border-accent transition-colors shadow-e1"
              >
                <div className="space-y-1">
                  <Plate code={p.code} paintHex={p.paint_hex} size="sm" />
                  <div className="font-semibold text-text-1">
                    {p.make} {p.model} ({p.plate})
                  </div>
                  <div className="text-caption text-text-2">{p.customer_name}</div>
                </div>
                <StatusBadge status="confirmed" />
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-h2 font-bold text-text-1">
            On road (awaiting check-in)
          </h2>
          <div className="space-y-2.5">
            {returns.map((r) => (
              <Link
                key={r.code}
                href={`/staff/handover/${r.code}/in`}
                className="flex items-center justify-between rounded-m border border-border bg-surface p-4 hover:border-accent transition-colors shadow-e1"
              >
                <div className="space-y-1">
                  <Plate code={r.code} paintHex={r.paint_hex} size="sm" />
                  <div className="font-semibold text-text-1">
                    {r.make} {r.model} ({r.plate})
                  </div>
                  <div className="text-caption text-text-2">{r.customer_name}</div>
                </div>
                <StatusBadge status="active" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
