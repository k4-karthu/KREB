import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { checkVehicleAvailable } from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { DomainError } from '@/domain/shared/errors';
import { newPublicId } from '@/domain/shared/ids';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { requireCustomerOrStaff } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';
import { isStaffRole } from '@/server/permissions';

const extendSchema = z.object({
  newEndAt: z.number().int().positive(),
});

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const actor = await requireCustomerOrStaff();
    const { code } = await context.params;
    const { newEndAt } = extendSchema.parse(await req.json());
    const now = Date.now();

    const result = withImmediateTx(({ sqlite }) => {
      const booking = sqlite
        .prepare(
          'SELECT id, user_id, vehicle_id, pickup_branch_id, return_branch_id, start_at, end_at, status, total_minor FROM bookings WHERE code = ?',
        )
        .get(code) as
        | {
            id: number;
            user_id: string;
            vehicle_id: number;
            pickup_branch_id: number;
            return_branch_id: number;
            start_at: number;
            end_at: number;
            status: string;
            total_minor: number;
          }
        | undefined;

      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Booking not found', 404);
      }
      if (!isStaffRole(actor.role) && booking.user_id !== actor.id) {
        throw new DomainError('FORBIDDEN', 'Forbidden', 403);
      }
      if (booking.status !== 'confirmed' && booking.status !== 'active') {
        throw new DomainError(
          'INVALID_TRANSITION',
          'Only confirmed or active trips can be extended.',
          409,
        );
      }
      if (newEndAt <= booking.end_at) {
        throw new DomainError(
          'VALIDATION_ERROR',
          'New return time must be after the current scheduled return.',
          400,
        );
      }

      const settings = loadRentalSettings(sqlite);
      const avail = checkVehicleAvailable(sqlite, booking.vehicle_id, booking.start_at, newEndAt, {
        excludeBookingId: booking.id,
      });
      if (!avail.ok) {
        throw new DomainError(
          'VEHICLE_UNAVAILABLE',
          avail.reason ?? 'Another booking is already scheduled right after your trip.',
          409,
        );
      }

      const repriced = loadAndPriceVehicle(sqlite, {
        vehicleId: booking.vehicle_id,
        pickupBranchId: booking.pickup_branch_id,
        returnBranchId: booking.return_branch_id,
        startAt: booking.start_at,
        endAt: newEndAt,
        addonSelections: [],
        settings,
      });

      const deltaMinor = Math.max(0, repriced.totalMinor - booking.total_minor);
      const bufferEndAt = newEndAt + settings.turnaroundBufferMinutes * 60_000;

      sqlite
        .prepare('UPDATE bookings SET end_at = ?, total_minor = ?, updated_at = ? WHERE id = ?')
        .run(newEndAt, booking.total_minor + deltaMinor, now, booking.id);

      sqlite
        .prepare(
          'UPDATE vehicle_blocks SET end_at = ?, buffer_end_at = ? WHERE booking_id = ? AND released_at IS NULL',
        )
        .run(newEndAt, bufferEndAt, booking.id);

      if (deltaMinor > 0) {
        sqlite
          .prepare(
            `INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
             VALUES (?, ?, 'charge', 'succeeded', ?, 'fake', ?, 'card', ?, 'Trip extension', ?, ?)`,
          )
          .run(
            `pay_${newPublicId()}`,
            booking.id,
            deltaMinor,
            `fake_ext_${code}_${now}`,
            `extend-${code}-${newEndAt}`,
            actor.id,
            now,
          );
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'booking.extended',
        entityType: 'booking',
        entityId: String(booking.id),
        before: { endAt: booking.end_at, totalMinor: booking.total_minor },
        after: { endAt: newEndAt, totalMinor: booking.total_minor + deltaMinor, deltaMinor },
      });

      return { newEndAt, deltaMinor, totalMinor: booking.total_minor + deltaMinor };
    });

    return jsonOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
