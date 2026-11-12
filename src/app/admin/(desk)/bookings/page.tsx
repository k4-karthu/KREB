import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { can } from '@/server/permissions';
import { type BookingRow, BookingsClient } from './BookingsClient';

export default async function AdminBookingsPage() {
  const actor = await requireStaffPage('bookings.view_all');
  const { sqlite } = getReadConnection();

  const bookings = sqlite
    .prepare(
      `
    SELECT b.id, b.code, b.status, b.start_at, b.end_at, b.actual_start_at, b.actual_end_at, b.total_minor, b.source,
           u.name AS customer_name, u.email AS customer_email,
           v.make, v.model, v.plate, v.paint_hex,
           pbr.name AS branch_name, rbr.name AS return_branch_name
    FROM bookings b
    JOIN user u ON u.id = b.user_id
    JOIN vehicles v ON v.id = b.vehicle_id
    JOIN branches pbr ON pbr.id = b.pickup_branch_id
    JOIN branches rbr ON rbr.id = b.return_branch_id
    ORDER BY b.start_at DESC
    LIMIT 100
  `,
    )
    .all() as BookingRow[];

  const customers = sqlite
    .prepare("SELECT id, name, email FROM user WHERE role = 'customer' ORDER BY name ASC LIMIT 50")
    .all() as Array<{ id: string; name: string; email: string }>;

  const vehicles = sqlite
    .prepare(
      "SELECT id, make, model, plate FROM vehicles WHERE lifecycle = 'active' AND deleted_at IS NULL ORDER BY make ASC",
    )
    .all() as Array<{ id: number; make: string; model: string; plate: string }>;

  return (
    <BookingsClient
      bookings={bookings}
      customers={customers}
      vehicles={vehicles}
      canManage={can(actor, 'bookings.manage')}
    />
  );
}
