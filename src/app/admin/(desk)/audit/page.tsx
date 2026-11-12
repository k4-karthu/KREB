import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';

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
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Append-only audit log
        </h1>
        <p className="text-sm text-ink-muted">
          Protected by SQLite immutability triggers. Every state change, pricing update, and KYC
          reveal is recorded.
        </p>
      </div>

      <div className="overflow-x-auto rounded-m border border-line bg-surface">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line bg-surface-subtle font-semibold text-ink-muted">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 font-mono text-ink-muted">
                  {new Date(l.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </td>
                <td className="px-4 py-2.5 text-ink">
                  {l.actor_name ?? 'System'} ({l.actor_role ?? 'system'})
                </td>
                <td className="px-4 py-2.5 font-mono font-semibold text-ink">{l.action}</td>
                <td className="px-4 py-2.5 text-ink-muted">
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
