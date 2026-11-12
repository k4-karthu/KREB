import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';

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
        <h1 className="font-display text-h3 font-bold text-text-1">Fleet Schedule Timeline</h1>
        <p className="text-body-s text-text-3">
          14-day rolling availability across active vehicles (-2 days to +12 days).
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border bg-surface p-5 shadow-e0">
        <div className="space-y-3" style={{ minWidth: '820px' }}>
          {/* Header Time Axis */}
          <div className="grid grid-cols-[220px_1fr] items-center border-b border-border pb-3 text-label-s font-semibold text-text-3">
            <div>Vehicle</div>
            <div className="relative h-6">
              <span className="absolute left-0 text-text-3">-2 Days</span>
              <div
                className="absolute -translate-x-1/2 flex items-center gap-1 font-semibold text-accent"
                style={{ left: `${nowPct}%` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>TODAY</span>
              </div>
              <span className="absolute right-0 text-text-3">+12 Days</span>
            </div>
          </div>

          {/* Vehicle Rows */}
          {vehicles.map((v) => {
            const vBlocks = blocks.filter((b) => b.vehicle_id === v.id);
            return (
              <div
                key={v.id}
                className="grid grid-cols-[220px_1fr] items-center gap-4 py-2 text-body-s"
              >
                <Link
                  href={`/admin/fleet/${v.id}`}
                  className="flex items-center gap-2.5 group transition-colors"
                >
                  <Plate code={v.plate} size="sm" />
                  <span className="truncate font-medium text-text-1 group-hover:text-accent group-hover:underline">
                    {v.make} {v.model}
                  </span>
                </Link>

                <div className="relative h-9 rounded-xs border border-border-subtle bg-surface-sunken">
                  {/* Current timestamp indicator line */}
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 top-0 w-0.5 bg-accent z-10"
                    style={{ left: `${nowPct}%` }}
                  />

                  {vBlocks.map((b) => {
                    const left = Math.max(0, ((b.start_at - windowStart) / totalSpan) * 100);
                    const right = Math.min(100, ((b.end_at - windowStart) / totalSpan) * 100);
                    const width = Math.max(2, right - left);
                    const isMaint = b.kind === 'maintenance';

                    return (
                      <div
                        key={b.id}
                        title={b.note ?? b.kind}
                        className={`absolute top-1 bottom-1 truncate rounded-2xs border px-2 leading-7 text-caption font-medium transition-transform hover:scale-[1.01] z-0 ${
                          isMaint
                            ? 'bg-warning-subtle border-warning/50 text-warning'
                            : 'bg-accent-subtle border-accent/40 text-accent font-semibold'
                        }`}
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
