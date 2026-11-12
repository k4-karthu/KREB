import { notFound } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { can } from '@/server/permissions';
import type { VehicleImageRow } from '@/ui/components/ImageManager';
import { VehicleEditorClient } from './VehicleEditorClient';

export default async function AdminVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireStaffPage('fleet.read');
  const { id } = await params;
  const vid = Number(id);
  if (!Number.isInteger(vid) || vid <= 0) {
    notFound();
  }

  const { sqlite } = getReadConnection();
  const vehicle = sqlite
    .prepare('SELECT * FROM vehicles WHERE id = ? AND deleted_at IS NULL')
    .get(vid) as React.ComponentProps<typeof VehicleEditorClient>['vehicle'] | undefined;
  if (!vehicle) {
    notFound();
  }

  const images = sqlite
    .prepare(
      'SELECT id, public_id, file_key, width, height, alt_text, shot_type, is_primary, sort_order FROM vehicle_images WHERE vehicle_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC',
    )
    .all(vid) as VehicleImageRow[];

  const documents = sqlite
    .prepare(
      'SELECT id, kind, reference_no, issued_on, expires_on FROM vehicle_documents WHERE vehicle_id = ? ORDER BY id DESC',
    )
    .all(vid) as React.ComponentProps<typeof VehicleEditorClient>['documents'];

  const branches = sqlite
    .prepare('SELECT id, name FROM branches WHERE deleted_at IS NULL ORDER BY id ASC')
    .all() as Array<{ id: number; name: string }>;

  const ratePlans = sqlite
    .prepare('SELECT id, name FROM rate_plans ORDER BY id ASC')
    .all() as Array<{ id: number; name: string }>;

  const allFeatures = sqlite
    .prepare('SELECT id, label FROM features ORDER BY sort_order ASC')
    .all() as Array<{ id: number; label: string }>;

  const selectedRows = sqlite
    .prepare('SELECT feature_id FROM vehicle_features WHERE vehicle_id = ?')
    .all(vid) as Array<{ feature_id: number }>;

  return (
    <VehicleEditorClient
      vehicle={vehicle}
      images={images}
      documents={documents}
      branches={branches}
      ratePlans={ratePlans}
      allFeatures={allFeatures}
      selectedFeatureIds={selectedRows.map((r) => r.feature_id)}
      canEdit={can(actor, 'fleet.write')}
      canArchive={can(actor, 'fleet.write')}
    />
  );
}
