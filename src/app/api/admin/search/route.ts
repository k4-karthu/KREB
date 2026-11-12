import { getReadConnection } from '@/db/client';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

export async function GET(req: Request) {
  try {
    await requireStaffCapability('admin.access');
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    if (q.length < 2) {
      return jsonOk({ bookings: [], vehicles: [], customers: [] });
    }

    const like = `%${q}%`;
    const { sqlite } = getReadConnection();

    const bookings = sqlite
      .prepare(
        `SELECT b.code, b.status, u.name AS customer_name
         FROM bookings b JOIN user u ON u.id = b.user_id
         WHERE b.code LIKE ? OR u.name LIKE ?
         ORDER BY b.created_at DESC LIMIT 6`,
      )
      .all(like, like);

    const vehicles = sqlite
      .prepare(
        `SELECT id, make, model, plate
         FROM vehicles
         WHERE deleted_at IS NULL AND (make LIKE ? OR model LIKE ? OR plate LIKE ?)
         LIMIT 6`,
      )
      .all(like, like, like);

    const customers = sqlite
      .prepare(
        `SELECT id, name, email
         FROM user
         WHERE role = 'customer' AND (name LIKE ? OR email LIKE ?)
         LIMIT 6`,
      )
      .all(like, like);

    return jsonOk({ bookings, vehicles, customers });
  } catch (err) {
    return handleApiError(err);
  }
}
