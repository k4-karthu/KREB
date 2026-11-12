import { getReadConnection } from '@/db/client';
import { requireCustomerOrStaff } from '@/server/auth';
import { handleApiError } from '@/server/http';

export async function GET() {
  try {
    const actor = await requireCustomerOrStaff();
    const { sqlite } = getReadConnection();

    const profile = sqlite
      .prepare(
        'SELECT full_name, phone, date_of_birth, address_line, city, postal_code, locale FROM user_profiles WHERE user_id = ?',
      )
      .get(actor.id);

    const licences = sqlite
      .prepare(
        'SELECT id, licence_no_last4, issuing_region, expires_on, status, created_at FROM driver_licences WHERE user_id = ?',
      )
      .all(actor.id);

    const bookings = sqlite
      .prepare(
        'SELECT code, status, start_at, end_at, total_minor, currency, created_at FROM bookings WHERE user_id = ? ORDER BY created_at DESC',
      )
      .all(actor.id);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { id: actor.id, email: actor.email, name: actor.name },
      profile,
      licences,
      bookings,
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="kerb-account-export.json"',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
