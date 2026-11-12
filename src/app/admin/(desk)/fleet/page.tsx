import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { can } from '@/server/permissions';
import { FleetClient, type FleetRow } from './FleetClient';

export default async function AdminFleetPage() {
  const actor = await requireStaffPage('fleet.read');
  const { sqlite } = getReadConnection();

  const vehicles = sqlite
    .prepare(
      `
    SELECT
      v.id, v.public_id, v.slug, v.make, v.model, v.variant, v.year, v.plate,
      v.category, v.transmission, v.fuel_type, v.seats, v.paint_name, v.paint_hex,
      v.lifecycle, v.ops_state, v.odometer_km,
      b.name AS home_branch_name,
      rp.name AS rate_plan_name,
      rp.base_daily_minor,
      (SELECT file_key FROM vehicle_images vi WHERE vi.vehicle_id = v.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS primary_file_key,
      (SELECT COUNT(*) FROM vehicle_images vi WHERE vi.vehicle_id = v.id) AS image_count,
      (SELECT MIN(expires_on) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expires_on IS NOT NULL) AS next_doc_expiry
    FROM vehicles v
    JOIN branches b ON b.id = v.home_branch_id
    JOIN rate_plans rp ON rp.id = v.rate_plan_id
    WHERE v.deleted_at IS NULL
    ORDER BY v.id DESC
  `,
    )
    .all() as FleetRow[];

  const branches = sqlite
    .prepare(
      'SELECT id, name FROM branches WHERE deleted_at IS NULL AND is_active = 1 ORDER BY id ASC',
    )
    .all() as Array<{ id: number; name: string }>;

  const ratePlans = sqlite
    .prepare(
      'SELECT id, name, base_daily_minor FROM rate_plans WHERE is_active = 1 ORDER BY id ASC',
    )
    .all() as Array<{ id: number; name: string; base_daily_minor: number }>;

  return (
    <FleetClient
      vehicles={vehicles}
      branches={branches}
      ratePlans={ratePlans}
      canEdit={can(actor, 'fleet.write')}
    />
  );
}
