import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { checkVehicleAvailable } from '@/domain/availability/availability';
import { transitionBooking } from '@/domain/booking/state-machine';
import { DomainError } from '@/domain/shared/errors';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reassign'),
    newVehicleId: z.number().int().positive(),
    reason: z.string().max(240).optional(),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().min(2).max(240),
  }),
  z.object({
    action: z.literal('mark_no_show'),
  }),
  z.object({
    action: z.literal('approve_kyc_booking'),
  }),
]);

export async function POST(req: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const actor = await requireStaffCapability('bookings.manage');
    const { code } = await context.params;
    const body = actionSchema.parse(await req.json());
    const now = Date.now();

    withImmediateTx(({ sqlite }) => {
      const booking = sqlite
        .prepare('SELECT id, vehicle_id, start_at, end_at, status FROM bookings WHERE code = ?')
        .get(code) as
        | { id: number; vehicle_id: number; start_at: number; end_at: number; status: string }
        | undefined;
      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Booking not found', 404);
      }

      if (body.action === 'reassign') {
        const avail = checkVehicleAvailable(
          sqlite,
          body.newVehicleId,
          booking.start_at,
          booking.end_at,
        );
        if (!avail.ok) {
          throw new DomainError(
            'VEHICLE_UNAVAILABLE',
            avail.reason ?? 'Target vehicle is not free',
            409,
          );
        }
        sqlite
          .prepare('UPDATE bookings SET vehicle_id = ?, updated_at = ? WHERE id = ?')
          .run(body.newVehicleId, now, booking.id);
        sqlite
          .prepare(
            'UPDATE vehicle_blocks SET vehicle_id = ? WHERE booking_id = ? AND released_at IS NULL',
          )
          .run(body.newVehicleId, booking.id);
        writeAudit(sqlite, {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'booking.reassigned',
          entityType: 'booking',
          entityId: String(booking.id),
          before: { vehicleId: booking.vehicle_id },
          after: { vehicleId: body.newVehicleId, reason: body.reason },
        });
      } else if (body.action === 'cancel') {
        transitionBooking(sqlite, {
          bookingId: booking.id,
          toStatus: 'cancelled',
          actorKind: 'staff',
          actorUserId: actor.id,
          actorRole: actor.role,
          reason: body.reason,
          releaseBlock: true,
        });
        sqlite
          .prepare(
            'UPDATE bookings SET cancel_reason = ?, cancelled_at = ?, updated_at = ? WHERE id = ?',
          )
          .run(body.reason, now, now, booking.id);
      } else if (body.action === 'mark_no_show') {
        transitionBooking(sqlite, {
          bookingId: booking.id,
          toStatus: 'no_show',
          actorKind: 'staff',
          actorUserId: actor.id,
          actorRole: actor.role,
          reason: 'Marked no-show by staff',
          releaseBlock: true,
        });
      } else if (body.action === 'approve_kyc_booking') {
        transitionBooking(sqlite, {
          bookingId: booking.id,
          toStatus: 'confirmed',
          actorKind: 'staff',
          actorUserId: actor.id,
          actorRole: actor.role,
          reason: 'Approved by operations desk',
        });
      }
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
