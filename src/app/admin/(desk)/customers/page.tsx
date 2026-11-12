import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { can } from '@/server/permissions';
import { type CustomerRow, CustomersClient } from './CustomersClient';

export default async function AdminCustomersPage() {
  const actor = await requireStaffPage('bookings.view_all');
  const { sqlite } = getReadConnection();

  const customers = sqlite
    .prepare(
      `
    SELECT u.id, u.name, u.email, up.phone, COALESCE(up.is_blacklisted, 0) AS is_blacklisted,
           up.blacklist_reason,
           (SELECT status FROM driver_licences dl WHERE dl.user_id = u.id ORDER BY dl.id DESC LIMIT 1) AS licence_status,
           (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS trip_count
    FROM user u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE u.role = 'customer'
    ORDER BY u.createdAt DESC
    LIMIT 100
  `,
    )
    .all() as CustomerRow[];

  return <CustomersClient customers={customers} canBlacklist={can(actor, 'customers.blacklist')} />;
}
