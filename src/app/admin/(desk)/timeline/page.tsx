import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/primitives/Plate';

export default async function AdminTimelinePage() {
  await requireStaffPage('fleet.read');
  const { sqlite } = getReadConnection();

  const now = Date.now();
  const windowStart = now - 2 * 86_400_000;
  const windowEnd = now + 12 * 86_400_000;
  const totalSpan = windowEnd - windowStart;

  const vehicles = sqlite
    .prepare(
      "SELECT id, make, model, plate, paint_hex FROM vehicles WHERE lifecycle = 'active' AND deleted_at IS NULL ORDER BY id ASC",
    )
    .all() as Array<{ id: number; make: string; model: string; plate: string; paint_hex: string }>;

  const blocks = sqlite
    .prepare(
      `
    SELECT vb.id, vb.vehicle_id, vb.kind, vb.start_at, vb.end_at, vb.note, b.code AS booking_code
    FROM vehicle_blocks vb
    LEFT JOIN bookings b ON b.id = vb.booking_id
    WHERE vb.released_at IS NULL AND vb.end_at >= ? AND vb.start_at <= ?
  `,
    )
    .all(windowStart, windowEnd) as Array<{
    id: number;
    vehicle_id: number;
    kind: string;
    start_at: number;
    end_at: number;
    note: string | null;
    booking_code: string | null;
  }>;

  const nowPct = Math.max(0, Math.min(100, ((now - windowStart) / totalSpan) * 100));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Fleet schedule timeline
        </h1>
        <p className="text-sm text-ink-muted">
          14-day rolling occupancy across active vehicles (-2 days to +12 days).
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-line bg-surface p-4">
        <div className="space-y-2" style={{ minWidth: '760px' }}>
          <div className="grid grid-cols-[200px_1fr] items-center border-b border-line pb-2 text-xs font-semibold text-ink-muted">
            <div>Vehicle</div>
            <div className="relative h-5">
              <span className="absolute left-0">-2d</span>
              <span
                className="absolute -translate-x-1/2 font-mono text-petrol-700"
                style={{ left: `${nowPct}%` }}
              >
                NOW
              </span>
              <span className="absolute right-0">+12d</span>
            </div>
          </div>

          {vehicles.map((v) => {
            const vBlocks = blocks.filter((b) => b.vehicle_id === v.id);
            return (
              <div
                key={v.id}
                className="grid grid-cols-[200px_1fr] items-center gap-3 py-1.5 text-xs"
              >
                <Link
                  href={`/admin/fleet/${v.id}`}
                  className="flex items-center gap-2 hover:underline"
                >
                  <Plate code={v.plate} paintHex={v.paint_hex} size="sm" />
                  <span className="truncate text-ink">
                    {v.make} {v.model}
                  </span>
                </Link>
                <div className="relative h-8 rounded-s border border-line bg-surface-subtle">
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 top-0 w-px bg-petrol-600"
                    style={{ left: `${nowPct}%` }}
                  />
                  {vBlocks.map((b) => {
                    const left = Math.max(0, ((b.start_at - windowStart) / totalSpan) * 100);
                    const right = Math.min(100, ((b.end_at - windowStart) / totalSpan) * 100);
                    const width = Math.max(2, right - left);
                    const bg =
                      b.kind === 'maintenance'
                        ? 'bg-amber-100 border-amber-600 text-petrol-950'
                        : 'bg-petrol-100 border-petrol-600 text-petrol-900';
                    return (
                      <div
                        key={b.id}
                        title={b.note ?? b.kind}
                        className={`absolute top-1 bottom-1 truncate rounded-s border px-1.5 leading-6 font-mono text-m1 ${bg}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      >
                        {b.booking_code ?? b.kind}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
