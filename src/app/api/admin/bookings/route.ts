import { z } from 'zod';
import { getReadConnection, withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { checkVehicleAvailable } from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { DomainError } from '@/domain/shared/errors';
import { newBookingCode, newPublicId } from '@/domain/shared/ids';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const walkinSchema = z.object({
  userId: z.string().min(1),
  vehicleId: z.number().int().positive(),
  startAt: z.number().int().positive(),
  endAt: z.number().int().positive(),
  notes: z.string().max(400).optional(),
});

export async function GET() {
  try {
    await requireStaffCapability('bookings.view_all');
    const { sqlite } = getReadConnection();
    const bookings = sqlite
      .prepare(
        `
      SELECT b.*, u.name AS customer_name, u.email AS customer_email,
             v.make, v.model, v.plate, v.paint_hex, br.name AS branch_name
      FROM bookings b
      JOIN user u ON u.id = b.user_id
      JOIN vehicles v ON v.id = b.vehicle_id
      JOIN branches br ON br.id = b.pickup_branch_id
      ORDER BY b.start_at DESC
      LIMIT 120
    `,
      )
      .all();
    return jsonOk({ bookings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireStaffCapability('bookings.manage');
    const body = walkinSchema.parse(await req.json());
    const now = Date.now();

    const created = withImmediateTx(({ sqlite }) => {
      const avail = checkVehicleAvailable(sqlite, body.vehicleId, body.startAt, body.endAt);
      if (!avail.ok) {
        throw new DomainError('VEHICLE_UNAVAILABLE', avail.reason ?? 'Vehicle unavailable', 409);
      }

      const veh = sqlite
        .prepare('SELECT current_branch_id, deposit_minor, rate_plan_id FROM vehicles WHERE id = ?')
        .get(body.vehicleId) as
        | { current_branch_id: number; deposit_minor: number; rate_plan_id: number }
        | undefined;
      if (!veh) throw new DomainError('NOT_FOUND', 'Vehicle not found', 404);

      const settings = loadRentalSettings(sqlite);
      const quote = loadAndPriceVehicle(sqlite, {
        vehicleId: body.vehicleId,
        pickupBranchId: veh.current_branch_id,
        returnBranchId: veh.current_branch_id,
        startAt: body.startAt,
        endAt: body.endAt,
        addonSelections: [],
        settings,
      });

      const code = newBookingCode();
      const publicId = `bkg_${newPublicId()}`;
      const res = sqlite
        .prepare(
          `
        INSERT INTO bookings (
          public_id, code, user_id, vehicle_id, pickup_branch_id, return_branch_id,
          start_at, end_at, status, currency, subtotal_minor, discount_minor, tax_minor,
          total_minor, deposit_minor, tax_rate_bp_snapshot, daily_rate_minor_snapshot,
          policy_snapshot_json, source, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'counter', ?, ?, ?)
      `,
        )
        .run(
          publicId,
          code,
          body.userId,
          body.vehicleId,
          veh.current_branch_id,
          veh.current_branch_id,
          body.startAt,
          body.endAt,
          settings.currency,
          quote.subtotalMinor,
          quote.discountMinor,
          quote.taxMinor,
          quote.totalMinor,
          quote.depositMinor,
          settings.taxRateBp,
          quote.ratePlanBaseDailyMinor,
          JSON.stringify({ cancellationTiers: settings.cancellationTiers }),
          actor.id,
          now,
          now,
        );
      const bookingId = Number(res.lastInsertRowid);

      sqlite
        .prepare(
          `INSERT INTO vehicle_blocks (vehicle_id, kind, booking_id, start_at, end_at, buffer_end_at, note, created_by, created_at)
           VALUES (?, 'booking', ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          body.vehicleId,
          bookingId,
          body.startAt,
          body.endAt,
          body.endAt + settings.turnaroundBufferMinutes * 60_000,
          body.notes ?? `Walk-in booking ${code}`,
          actor.id,
          now,
        );

      sqlite
        .prepare(
          `INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
           VALUES (?, ?, 'manual', 'succeeded', ?, 'counter', ?, 'cash', ?, 'Counter payment', ?, ?)`,
        )
        .run(
          `pay_${newPublicId()}`,
          bookingId,
          quote.totalMinor,
          `counter_${code}`,
          `walkin-${code}`,
          actor.id,
          now,
        );

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'booking.walkin_created',
        entityType: 'booking',
        entityId: String(bookingId),
        after: { code, totalMinor: quote.totalMinor },
      });

      return { id: bookingId, code };
    });

    return jsonOk(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
