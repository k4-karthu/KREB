import { z } from 'zod';
import { getReadConnection, withImmediateTx } from '@/db/client';
import {
  checkVehicleAvailable,
  validateBranchHoursAndLimits,
} from '@/domain/availability/availability';
import {
  loadAndPriceVehicle,
  PRICING_ENGINE_VERSION,
  signQuotePayload,
} from '@/domain/pricing/pricing';
import { DomainError } from '@/domain/shared/errors';
import { newPublicId } from '@/domain/shared/ids';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { getServerActor } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const quoteRequestSchema = z.object({
  mode: z.enum(['preview', 'lock']).default('preview'),
  vehicleId: z.number().int().positive(),
  pickupBranchId: z.number().int().positive(),
  returnBranchId: z.number().int().positive().optional(),
  startAt: z.number().int().positive(),
  endAt: z.number().int().positive(),
  protectionPlanPublicId: z.string().optional(),
  addonSelections: z
    .array(z.object({ publicId: z.string(), quantity: z.number().int().positive() }))
    .default([]),
  promoCode: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = quoteRequestSchema.parse(await req.json());
    const returnBranchId = body.returnBranchId ?? body.pickupBranchId;
    const actor = await getServerActor();

    if (body.mode === 'preview') {
      const { sqlite } = getReadConnection();
      const avail = checkVehicleAvailable(sqlite, body.vehicleId, body.startAt, body.endAt);
      const quote = loadAndPriceVehicle(sqlite, {
        vehicleId: body.vehicleId,
        pickupBranchId: body.pickupBranchId,
        returnBranchId,
        startAt: body.startAt,
        endAt: body.endAt,
        protectionPlanPublicId: body.protectionPlanPublicId,
        addonSelections: body.addonSelections,
        promoCode: body.promoCode,
        userId: actor?.id ?? null,
      });

      return jsonOk({
        available: avail.ok,
        unavailableReason: avail.ok ? null : avail.reason,
        quote,
      });
    }

    // Lock mode: verify branch hours + availability + persist signed quote + 15-min hold block
    const result = withImmediateTx(({ sqlite }) => {
      const settings = loadRentalSettings(sqlite);
      const val = validateBranchHoursAndLimits(
        sqlite,
        body.pickupBranchId,
        returnBranchId,
        body.startAt,
        body.endAt,
      );
      if (!val.ok) {
        throw new DomainError('VALIDATION_ERROR', val.message ?? 'Invalid trip window', 400);
      }

      const avail = checkVehicleAvailable(sqlite, body.vehicleId, body.startAt, body.endAt);
      if (!avail.ok) {
        throw new DomainError(
          'VEHICLE_UNAVAILABLE',
          avail.reason ?? 'Vehicle is no longer free',
          409,
        );
      }

      const quote = loadAndPriceVehicle(sqlite, {
        vehicleId: body.vehicleId,
        pickupBranchId: body.pickupBranchId,
        returnBranchId,
        startAt: body.startAt,
        endAt: body.endAt,
        protectionPlanPublicId: body.protectionPlanPublicId,
        addonSelections: body.addonSelections,
        promoCode: body.promoCode,
        userId: actor?.id ?? null,
        settings,
      });

      const now = Date.now();
      const expiresAt = now + settings.quoteValidityMinutes * 60_000;
      const publicId = `qt_${newPublicId()}`;
      const inputsObj = {
        vehicleId: body.vehicleId,
        pickupBranchId: body.pickupBranchId,
        returnBranchId,
        startAt: body.startAt,
        endAt: body.endAt,
        protectionPlanPublicId: body.protectionPlanPublicId ?? null,
        addonSelections: body.addonSelections,
        promoCode: body.promoCode ?? null,
      };
      const signPayload = {
        publicId,
        inputs: inputsObj,
        lines: quote.lines,
        totalMinor: quote.totalMinor,
        depositMinor: quote.depositMinor,
        engineVersion: PRICING_ENGINE_VERSION,
        expiresAt,
      };
      const signature = signQuotePayload(signPayload);

      sqlite
        .prepare(
          `
        INSERT INTO quotes (
          public_id, user_id, vehicle_id, pickup_branch_id, return_branch_id,
          start_at, end_at, inputs_json, lines_json, total_minor, deposit_minor,
          engine_version, signature, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          publicId,
          actor?.id ?? null,
          body.vehicleId,
          body.pickupBranchId,
          returnBranchId,
          body.startAt,
          body.endAt,
          JSON.stringify(inputsObj),
          JSON.stringify(quote.lines),
          quote.totalMinor,
          quote.depositMinor,
          PRICING_ENGINE_VERSION,
          signature,
          expiresAt,
          now,
        );

      return { publicId, expiresAt, totalMinor: quote.totalMinor };
    });

    return jsonOk(result, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
