import { withImmediateTx } from '@/db/client';
import { computeCancellationRefund } from '@/domain/booking/cancellation';
import { transitionBooking } from '@/domain/booking/state-machine';
import { DomainError } from '@/domain/shared/errors';
import { newPublicId } from '@/domain/shared/ids';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { requireCustomerOrStaff } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';
import { isStaffRole } from '@/server/permissions';

export async function POST(_req: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const actor = await requireCustomerOrStaff();
    const { code } = await context.params;
    const now = Date.now();

    const result = withImmediateTx(({ sqlite }) => {
      const booking = sqlite
        .prepare('SELECT id, user_id, start_at, total_minor, status FROM bookings WHERE code = ?')
        .get(code) as
        | {
            id: number;
            user_id: string;
            start_at: number;
            total_minor: number;
            status: string;
          }
        | undefined;

      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Booking not found', 404);
      }
      const staff = isStaffRole(actor.role);
      if (!staff && booking.user_id !== actor.id) {
        throw new DomainError('FORBIDDEN', 'You cannot cancel another customer booking.', 403);
      }

      const settings = loadRentalSettings(sqlite);
      const preview = computeCancellationRefund({
        totalPaidMinor: booking.total_minor,
        pickupAt: booking.start_at,
        cancelledAt: now,
        tiers: settings.cancellationTiers,
        adminInitiated: staff,
      });

      transitionBooking(sqlite, {
        bookingId: booking.id,
        toStatus: 'cancelled',
        actorKind: staff ? 'staff' : 'customer',
        actorUserId: actor.id,
        actorRole: actor.role,
        reason: preview.ruleLabel,
        releaseBlock: true,
      });

      sqlite
        .prepare(
          'UPDATE bookings SET cancel_reason = ?, cancelled_at = ?, updated_at = ? WHERE id = ?',
        )
        .run(preview.ruleLabel, now, now, booking.id);

      if (preview.refundMinor > 0) {
        sqlite
          .prepare(
            `INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
             VALUES (?, ?, 'refund', 'succeeded', ?, 'fake', ?, 'card', ?, ?, ?, ?)`,
          )
          .run(
            `pay_${newPublicId()}`,
            booking.id,
            preview.refundMinor,
            `fake_ref_${code}`,
            `cancel-refund-${code}-${now}`,
            preview.ruleLabel,
            actor.id,
            now,
          );
      }

      return preview;
    });

    return jsonOk({ ok: true, refund: result });
  } catch (err) {
    return handleApiError(err);
  }
}
