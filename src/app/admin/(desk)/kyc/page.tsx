import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { signPrivateFileUrl } from '@/server/files';
import { can } from '@/server/permissions';
import { KycClient, type KycRow } from './KycClient';

export default async function AdminKycPage() {
  const actor = await requireStaffPage('kyc.review');
  const { sqlite } = getReadConnection();

  const rows = sqlite
    .prepare(
      `
    SELECT dl.id, dl.user_id, dl.licence_no_last4, dl.issuing_region, dl.expires_on,
           dl.front_file_key, dl.back_file_key, dl.status, dl.reject_reason,
           u.name AS driver_name, u.email AS driver_email
    FROM driver_licences dl
    JOIN user u ON u.id = dl.user_id
    ORDER BY CASE WHEN dl.status = 'pending' THEN 0 ELSE 1 END, dl.created_at DESC
    LIMIT 50
  `,
    )
    .all() as Array<{
    id: number;
    user_id: string;
    licence_no_last4: string;
    issuing_region: string | null;
    expires_on: string;
    front_file_key: string;
    back_file_key: string | null;
    status: string;
    reject_reason: string | null;
    driver_name: string;
    driver_email: string;
  }>;

  const licences: KycRow[] = rows.map((r) => ({
    ...r,
    frontUrl: signPrivateFileUrl(r.front_file_key),
    backUrl: r.back_file_key ? signPrivateFileUrl(r.back_file_key) : null,
  }));

  return (
    <KycClient
      licences={licences}
      canReview={can(actor, 'kyc.review')}
      canReveal={can(actor, 'licence.reveal')}
    />
  );
}
