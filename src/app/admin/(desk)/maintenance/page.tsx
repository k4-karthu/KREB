import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';

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
        <h1 className="font-display text-h3 font-bold text-text-1">
          Maintenance & Workshop Blocks
        </h1>
        <p className="text-body-s text-text-3">
          Scheduled garage events, preventive maintenance, and fleet workshop holds.
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border bg-surface shadow-e0">
        <table className="w-full border-collapse text-left text-body-s">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/60 text-label-s font-semibold text-text-2 select-none">
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Maintenance Work</th>
              <th className="px-4 py-3">Authorized Facility</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-body-s text-text-3">
                  No maintenance records found.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} className="transition-colors hover:bg-surface-sunken/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Plate code={l.plate} size="sm" />
                      <span className="font-medium text-text-1">
                        {l.make} {l.model}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-text-1">{l.title}</div>
                    <div className="text-caption text-text-3 capitalize">
                      {l.kind.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-caption text-text-2">
                    {l.garage ?? 'Authorized Kerb Service Center'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-text-1">
                    <Price minorUnits={l.cost_minor} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
