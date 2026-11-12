import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

export default async function AdminMaintenancePage() {
  await requireStaffPage('maintenance.read');
  const { sqlite } = getReadConnection();

  const logs = sqlite
    .prepare(
      `
    SELECT m.*, v.make, v.model, v.plate, v.paint_hex
    FROM maintenance_logs m
    JOIN vehicles v ON v.id = m.vehicle_id
    ORDER BY m.starts_at DESC
    LIMIT 60
  `,
    )
    .all() as Array<{
    id: number;
    kind: string;
    title: string;
    garage: string | null;
    cost_minor: number;
    starts_at: number;
    status: string;
    make: string;
    model: string;
    plate: string;
    paint_hex: string;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Maintenance & workshop blocks
        </h1>
        <p className="text-sm text-ink-muted">
          Scheduled service events automatically create availability blocks so vehicles cannot be
          booked.
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Work</th>
              <th className="px-4 py-3">Garage</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Plate code={l.plate} paintHex={l.paint_hex} size="sm" />
                    <span className="font-medium text-ink">
                      {l.make} {l.model}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{l.title}</div>
                  <div className="text-xs text-ink-muted">{l.kind}</div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">{l.garage ?? 'Internal bay'}</td>
                <td className="px-4 py-3">
                  <MoneyText amountMinor={l.cost_minor} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={
                      l.status === 'scheduled'
                        ? 'pending'
                        : l.status === 'done'
                          ? 'completed'
                          : 'active'
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
