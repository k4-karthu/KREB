import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { TurnaroundClient, type TurnaroundRow } from './TurnaroundClient';

export default async function AdminTurnaroundPage() {
  await requireStaffPage('fleet.read');
  const { sqlite } = getReadConnection();

  const vehicles = sqlite
    .prepare(
      `
    SELECT v.id, v.make, v.model, v.plate, v.paint_hex, v.ops_state, b.name AS branch_name
    FROM vehicles v
    JOIN branches b ON b.id = v.current_branch_id
    WHERE v.lifecycle = 'active' AND v.deleted_at IS NULL
    ORDER BY CASE WHEN v.ops_state != 'ready' THEN 0 ELSE 1 END, v.id ASC
  `,
    )
    .all() as TurnaroundRow[];

  return <TurnaroundClient vehicles={vehicles} />;
}
