import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { transitionBooking } from '@/domain/booking/state-machine';
import { DomainError } from '@/domain/shared/errors';
import { newPublicId } from '@/domain/shared/ids';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const handoverSchema = z.object({
  code: z.string().min(3),
  mode: z.enum(['checkout', 'checkin']),
  odometerKm: z.number().int().nonnegative(),
  fuelKind: z.enum(['eighths', 'percent']).default('eighths'),
  fuelLevel: z.number().int().min(0).max(100),
  cleanliness: z.enum(['clean', 'acceptable', 'dirty']).default('clean'),
  notes: z.string().max(600).optional(),
  damageMarks: z
    .array(
      z.object({
        zone: z.string().min(1),
        kind: z.enum(['scratch', 'dent', 'chip', 'crack', 'stain', 'missing', 'other']),
        severity: z.number().int().min(1).max(3),
        note: z.string().max(160).optional(),
      }),
    )
    .default([]),
});

export async function POST(req: Request) {
  try {
    const actor = await requireStaffCapability('handover.perform');
    const body = handoverSchema.parse(await req.json());
    const now = Date.now();

    const result = withImmediateTx(({ sqlite }) => {
      const booking = sqlite
        .prepare(
          'SELECT id, vehicle_id, status, end_at, deposit_minor, daily_rate_minor_snapshot FROM bookings WHERE code = ?',
        )
        .get(body.code) as
        | {
            id: number;
            vehicle_id: number;
            status: string;
            end_at: number;
            deposit_minor: number;
            daily_rate_minor_snapshot: number;
          }
        | undefined;

      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Booking not found', 404);
      }

      const inspPublicId = `insp_${newPublicId()}`;
      const inspRes = sqlite
        .prepare(
          `INSERT INTO inspections (public_id, booking_id, type, odometer_km, fuel_kind, fuel_level, cleanliness, notes, customer_signed_at, inspected_by, inspected_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          inspPublicId,
          booking.id,
          body.mode,
          body.odometerKm,
          body.fuelKind,
          body.fuelLevel,
          body.cleanliness,
          body.notes ?? null,
          now,
          actor.id,
          now,
        );
      const inspectionId = Number(inspRes.lastInsertRowid);

      const insMark = sqlite.prepare(
        'INSERT INTO inspection_marks (inspection_id, zone, kind, severity, note) VALUES (?, ?, ?, ?, ?)',
      );
      for (const m of body.damageMarks) {
        insMark.run(inspectionId, m.zone, m.kind, m.severity, m.note ?? null);
      }

      sqlite
        .prepare('UPDATE vehicles SET odometer_km = ?, updated_at = ? WHERE id = ?')
        .run(body.odometerKm, now, booking.vehicle_id);

      let extraChargesMinor = 0;

      if (body.mode === 'checkout') {
        transitionBooking(sqlite, {
          bookingId: booking.id,
          toStatus: 'active',
          actorKind: 'staff',
          actorUserId: actor.id,
          actorRole: actor.role,
          reason: 'Vehicle handed over to driver',
        });
        sqlite
          .prepare('UPDATE bookings SET actual_start_at = ?, updated_at = ? WHERE id = ?')
          .run(now, now, booking.id);
      } else {
        // Check-in: compute late / fuel shortfall if any
        const settings = loadRentalSettings(sqlite);
        const outInsp = sqlite
          .prepare(
            "SELECT odometer_km, fuel_level FROM inspections WHERE booking_id = ? AND type = 'checkout' ORDER BY id DESC LIMIT 1",
          )
          .get(booking.id) as { odometer_km: number; fuel_level: number } | undefined;

        if (outInsp && body.odometerKm < outInsp.odometer_km) {
          throw new DomainError(
            'VALIDATION_ERROR',
            `Check-in odometer (${body.odometerKm}) cannot be lower than checkout odometer (${outInsp.odometer_km}).`,
            400,
          );
        }

        const lateMinutes = Math.floor((now - booking.end_at) / 60_000);
        if (lateMinutes > settings.graceMinutes) {
          const billableLateHours = Math.ceil((lateMinutes - settings.graceMinutes) / 60);
          const hourlyMinor = Math.round(
            (booking.daily_rate_minor_snapshot * settings.lateFeePolicy.hourlyPercentOfDaily) / 100,
          );
          extraChargesMinor += billableLateHours * hourlyMinor;
        }

        if (outInsp && body.fuelKind === 'eighths' && body.fuelLevel < outInsp.fuel_level) {
          const shortfall = outInsp.fuel_level - body.fuelLevel;
          extraChargesMinor +=
            shortfall * settings.fuelShortfallPerEighthMinor + settings.refuelServiceFeeMinor;
        }

        transitionBooking(sqlite, {
          bookingId: booking.id,
          toStatus: 'returned',
          actorKind: 'staff',
          actorUserId: actor.id,
          actorRole: actor.role,
          reason: 'Vehicle returned at bay',
          releaseBlock: true,
        });

        // If no damage marks and no extra charges, auto-complete and release deposit hold
        if (body.damageMarks.length === 0 && extraChargesMinor === 0) {
          transitionBooking(sqlite, {
            bookingId: booking.id,
            toStatus: 'completed',
            actorKind: 'staff',
            actorUserId: actor.id,
            actorRole: actor.role,
            reason: 'Clean return — deposit released',
          });
          if (booking.deposit_minor > 0) {
            sqlite
              .prepare(
                `INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
                 VALUES (?, ?, 'deposit_release', 'succeeded', ?, 'fake', ?, 'card', ?, 'Automatic clean-return deposit release', ?, ?)`,
              )
              .run(
                `pay_${newPublicId()}`,
                booking.id,
                booking.deposit_minor,
                `fake_rel_${body.code}`,
                `dep-rel-${body.code}`,
                actor.id,
                now,
              );
          }
        }

        sqlite
          .prepare('UPDATE bookings SET actual_end_at = ?, updated_at = ? WHERE id = ?')
          .run(now, now, booking.id);
        sqlite
          .prepare("UPDATE vehicles SET ops_state = 'cleaning', updated_at = ? WHERE id = ?")
          .run(now, booking.vehicle_id);
      }

      return { inspectionId, extraChargesMinor };
    });

    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
