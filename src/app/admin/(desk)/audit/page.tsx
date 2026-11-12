import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';

export default async function AdminAuditPage() {
  await requireStaffPage('audit.view');
  const { sqlite } = getReadConnection();

  const logs = sqlite
    .prepare(
      `
    SELECT a.id, a.at, a.actor_role, a.action, a.entity_type, a.entity_id, u.name AS actor_name
    FROM audit_logs a
    LEFT JOIN user u ON u.id = a.actor_user_id
    ORDER BY a.id DESC
    LIMIT 100
  `,
    )
    .all() as Array<{
    id: number;
    at: number;
    actor_role: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    actor_name: string | null;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h3 font-bold text-text-1">Append-Only Audit Trail</h1>
        <p className="text-body-s text-text-3">
          Protected by SQLite immutability triggers. Every state transition, price schedule update,
          and KYC reveal is cryptographically timestamped.
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-border bg-surface shadow-e0">
        <table className="w-full border-collapse text-left text-body-s">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/60 text-label-s font-semibold text-text-2 select-none">
              <th className="px-4 py-3">Timestamp (IST)</th>
              <th className="px-4 py-3">Staff Actor</th>
              <th className="px-4 py-3">Action Event</th>
              <th className="px-4 py-3">Entity Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {logs.map((l) => (
              <tr key={l.id} className="transition-colors hover:bg-surface-sunken/40">
                <td className="px-4 py-3 text-caption text-text-3">
                  {new Intl.DateTimeFormat('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone: 'Asia/Kolkata',
                  }).format(new Date(l.at))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-1">
                      {l.actor_name ?? 'Automated System'}
                    </span>
                    {l.actor_role && <Plate code={l.actor_role} size="sm" />}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-label-s font-bold text-accent">
                  {l.action}
                </td>
                <td className="px-4 py-3 text-caption text-text-2 tabular-nums">
                  {l.entity_type} #{l.entity_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
