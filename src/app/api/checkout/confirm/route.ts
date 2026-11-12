import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { checkVehicleAvailable } from '@/domain/availability/availability';
import { checkEligibility } from '@/domain/eligibility/eligibility';
import { FakePaymentProvider } from '@/domain/payments/fake-provider';
import { type QuoteLineItem, verifyQuoteSignature } from '@/domain/pricing/pricing';
import { DomainError } from '@/domain/shared/errors';
import { newBookingCode, newPublicId } from '@/domain/shared/ids';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { requireCustomerOrStaff } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';
import { enqueueEmail } from '@/server/mail';

const confirmSchema = z.object({
  quotePublicId: z.string().min(4),
  phone: z.string().min(7).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentMethod: z.enum(['card', 'upi']).default('card'),
  idempotencyKey: z.string().min(8).max(80),
});

export async function POST(req: Request) {
  try {
    const actor = await requireCustomerOrStaff();
    const body = confirmSchema.parse(await req.json());
    const now = Date.now();

    // Idempotency fast-path
    const provider = new FakePaymentProvider();

    // First verify quote & profile inside transaction? No, payment provider call is async so check quote+eligibility first, run fake provider, then commit booking+block atomically in withImmediateTx!
    const precheck = withImmediateTx(({ sqlite }) => {
      const existingIdem = sqlite
        .prepare('SELECT response_json FROM idempotency_keys WHERE key = ? AND scope = ?')
        .get(body.idempotencyKey, 'checkout.confirm') as { response_json: string } | undefined;
      if (existingIdem?.response_json) {
        return {
          replay: JSON.parse(existingIdem.response_json) as { code: string; status: string },
        };
      }

      const quote = sqlite
        .prepare('SELECT * FROM quotes WHERE public_id = ?')
        .get(body.quotePublicId) as
        | {
            id: number;
            public_id: string;
            vehicle_id: number;
            pickup_branch_id: number;
            return_branch_id: number;
            start_at: number;
            end_at: number;
            inputs_json: string;
            lines_json: string;
            total_minor: number;
            deposit_minor: number;
            engine_version: string;
            signature: string;
            expires_at: number;
          }
        | undefined;

      if (!quote) {
        throw new DomainError('NOT_FOUND', 'Quote not found. Please start a new search.', 404);
      }
      if (quote.expires_at < now) {
        throw new DomainError(
          'QUOTE_EXPIRED',
          'This quote has expired. Please re-price the vehicle.',
          409,
        );
      }

      const inputs = JSON.parse(quote.inputs_json) as {
        protectionPlanPublicId?: string | null;
        promoCode?: string | null;
      };
      const lines = JSON.parse(quote.lines_json) as QuoteLineItem[];
      const signPayload = {
        publicId: quote.public_id,
        inputs,
        lines,
        totalMinor: quote.total_minor,
        depositMinor: quote.deposit_minor,
        engineVersion: quote.engine_version,
        expiresAt: quote.expires_at,
      };
      if (!verifyQuoteSignature(signPayload, quote.signature)) {
        throw new DomainError('QUOTE_TAMPERED', 'Quote signature verification failed.', 400);
      }

      // Upsert profile with phone & DOB
      sqlite
        .prepare(
          `INSERT INTO user_profiles (user_id, full_name, phone, date_of_birth, locale)
           VALUES (?, ?, ?, ?, 'en')
           ON CONFLICT(user_id) DO UPDATE SET phone = excluded.phone, date_of_birth = excluded.date_of_birth`,
        )
        .run(actor.id, actor.name, body.phone, body.dateOfBirth);

      const profile = sqlite
        .prepare(
          'SELECT date_of_birth, is_blacklisted, blacklist_reason FROM user_profiles WHERE user_id = ?',
        )
        .get(actor.id) as {
        date_of_birth: string | null;
        is_blacklisted: number;
        blacklist_reason: string | null;
      };

      const licence = sqlite
        .prepare(
          'SELECT status, expires_on, issued_on FROM driver_licences WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        )
        .get(actor.id) as
        | {
            status: 'pending' | 'verified' | 'rejected' | 'expired';
            expires_on: string;
            issued_on: string | null;
          }
        | undefined;

      const veh = sqlite
        .prepare(
          `SELECT v.id, v.min_driver_age, v.min_licence_years, v.rate_plan_id, rp.base_daily_minor, br.timezone
           FROM vehicles v
           JOIN rate_plans rp ON rp.id = v.rate_plan_id
           JOIN branches br ON br.id = ?
           WHERE v.id = ?`,
        )
        .get(quote.pickup_branch_id, quote.vehicle_id) as {
        id: number;
        min_driver_age: number;
        min_licence_years: number;
        rate_plan_id: number;
        base_daily_minor: number;
        timezone: string;
      };

      const settings = loadRentalSettings(sqlite);
      const elig = checkEligibility({
        dateOfBirth: profile.date_of_birth,
        isBlacklisted: profile.is_blacklisted === 1,
        blacklistReason: profile.blacklist_reason,
        licence: licence
          ? {
              status: licence.status,
              expiresOn: licence.expires_on,
              issuedOn: licence.issued_on,
            }
          : null,
        vehicle: {
          minDriverAge: veh.min_driver_age,
          minLicenceYears: veh.min_licence_years,
        },
        pickupAt: quote.start_at,
        returnAt: quote.end_at,
        branchTimezone: veh.timezone,
        kycRequiredBeforePay: false,
      });

      if (!elig.ok) {
        throw new DomainError(
          'ELIGIBILITY_FAILED',
          elig.blockers.map((b) => b.message).join(' '),
          400,
        );
      }

      const avail = checkVehicleAvailable(sqlite, quote.vehicle_id, quote.start_at, quote.end_at);
      if (!avail.ok) {
        throw new DomainError(
          'VEHICLE_UNAVAILABLE',
          avail.reason ?? 'Vehicle was just booked by another customer.',
          409,
        );
      }

      return {
        replay: null,
        quote,
        inputs,
        lines,
        veh,
        settings,
        licenceStatus: licence?.status ?? 'none',
      };
    });

    if (precheck.replay) {
      return jsonOk(precheck.replay, 200);
    }

    const { quote, inputs, lines, veh, settings, licenceStatus } = precheck;
    const payRes = await provider.createCheckout({
      bookingCode: quote.public_id,
      amountMinor: quote.total_minor,
      depositMinor: quote.deposit_minor,
      currency: settings.currency,
      customerEmail: actor.email,
      idempotencyKey: body.idempotencyKey,
    });

    if (payRes.status !== 'succeeded') {
      throw new DomainError(
        'PAYMENT_FAILED',
        'Payment was declined. Please try another method.',
        402,
      );
    }

    const committed = withImmediateTx(({ sqlite }) => {
      // Re-check availability inside commit tx (trigger also guarantees no overlap!)
      const avail = checkVehicleAvailable(sqlite, quote.vehicle_id, quote.start_at, quote.end_at);
      if (!avail.ok) {
        throw new DomainError(
          'VEHICLE_UNAVAILABLE',
          avail.reason ?? 'Vehicle is no longer available.',
          409,
        );
      }

      const code = newBookingCode();
      const publicId = `bkg_${newPublicId()}`;
      const bookingStatus = licenceStatus === 'verified' ? 'confirmed' : 'pending_approval';

      const protectionRow = inputs.protectionPlanPublicId
        ? (sqlite
            .prepare('SELECT id FROM protection_plans WHERE public_id = ?')
            .get(inputs.protectionPlanPublicId) as { id: number } | undefined)
        : undefined;
      const promoRow = inputs.promoCode
        ? (sqlite
            .prepare('SELECT id FROM promo_codes WHERE code = ?')
            .get(inputs.promoCode.toUpperCase()) as { id: number } | undefined)
        : undefined;

      const taxLine = lines.find((l) => l.kind === 'tax');
      const taxMinor = taxLine?.amountMinor ?? 0;
      const discountMinor = lines
        .filter((l) => l.amountMinor < 0)
        .reduce((s, l) => s + Math.abs(l.amountMinor), 0);
      const subtotalMinor = quote.total_minor - taxMinor;

      const bRes = sqlite
        .prepare(
          `
        INSERT INTO bookings (
          public_id, code, user_id, vehicle_id, pickup_branch_id, return_branch_id,
          start_at, end_at, status, quote_id, currency, subtotal_minor, discount_minor,
          tax_minor, total_minor, deposit_minor, tax_rate_bp_snapshot,
          daily_rate_minor_snapshot, protection_plan_id, promo_code_id,
          policy_snapshot_json, source, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', ?, ?, ?)
      `,
        )
        .run(
          publicId,
          code,
          actor.id,
          quote.vehicle_id,
          quote.pickup_branch_id,
          quote.return_branch_id,
          quote.start_at,
          quote.end_at,
          bookingStatus,
          quote.id,
          settings.currency,
          subtotalMinor,
          discountMinor,
          taxMinor,
          quote.total_minor,
          quote.deposit_minor,
          settings.taxRateBp,
          veh.base_daily_minor,
          protectionRow?.id ?? null,
          promoRow?.id ?? null,
          JSON.stringify({ cancellationTiers: settings.cancellationTiers }),
          actor.id,
          now,
          now,
        );

      const bookingId = Number(bRes.lastInsertRowid);
      const insLine = sqlite.prepare(
        'INSERT INTO booking_line_items (booking_id, kind, label, quantity, unit_minor, amount_minor, taxable, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      lines.forEach((line, idx) => {
        insLine.run(
          bookingId,
          line.kind,
          line.label,
          line.quantity,
          line.unitMinor,
          line.amountMinor,
          line.taxable ? 1 : 0,
          idx,
        );
      });

      const bufferEndAt = quote.end_at + settings.turnaroundBufferMinutes * 60_000;
      sqlite
        .prepare(
          `INSERT INTO vehicle_blocks (vehicle_id, kind, booking_id, start_at, end_at, buffer_end_at, note, created_by, created_at)
           VALUES (?, 'booking', ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          quote.vehicle_id,
          bookingId,
          quote.start_at,
          quote.end_at,
          bufferEndAt,
          `Booking ${code}`,
          actor.id,
          now,
        );

      if (promoRow) {
        sqlite
          .prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?')
          .run(promoRow.id);
      }

      sqlite
        .prepare(
          `INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
           VALUES (?, ?, 'charge', 'succeeded', ?, ?, ?, ?, ?, 'Trip total payment', ?, ?)`,
        )
        .run(
          `pay_${newPublicId()}`,
          bookingId,
          quote.total_minor,
          payRes.provider,
          payRes.providerRef,
          body.paymentMethod,
          body.idempotencyKey,
          actor.id,
          now,
        );

      if (quote.deposit_minor > 0) {
        sqlite
          .prepare(
            `INSERT INTO payments (public_id, booking_id, kind, status, amount_minor, provider, provider_ref, method, idempotency_key, reason, created_by, created_at)
             VALUES (?, ?, 'deposit_hold', 'succeeded', ?, ?, ?, ?, ?, 'Refundable security deposit hold', ?, ?)`,
          )
          .run(
            `pay_${newPublicId()}`,
            bookingId,
            quote.deposit_minor,
            payRes.provider,
            payRes.depositHoldRef ?? `hold_${code}`,
            body.paymentMethod,
            `${body.idempotencyKey}:deposit`,
            actor.id,
            now,
          );
      }

      sqlite
        .prepare(
          `INSERT INTO booking_events (booking_id, type, from_status, to_status, actor_user_id, actor_kind, created_at)
           VALUES (?, 'booking.created', NULL, ?, ?, 'customer', ?)`,
        )
        .run(bookingId, bookingStatus, actor.id, now);

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'booking.created',
        entityType: 'booking',
        entityId: String(bookingId),
        after: { code, status: bookingStatus, totalMinor: quote.total_minor },
      });

      enqueueEmail(sqlite, {
        kind: 'booking_confirmed',
        to: actor.email,
        template: 'booking-confirmed',
        payload: { code, totalMinor: quote.total_minor, status: bookingStatus },
        dedupeKey: `bkg-conf-${code}`,
      });

      const response = { code, status: bookingStatus };
      sqlite
        .prepare(
          'INSERT OR IGNORE INTO idempotency_keys (key, scope, response_json, created_at) VALUES (?, ?, ?, ?)',
        )
        .run(body.idempotencyKey, 'checkout.confirm', JSON.stringify(response), now);

      return response;
    });

    return jsonOk(committed, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
