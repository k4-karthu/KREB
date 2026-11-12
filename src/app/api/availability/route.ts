import { z } from 'zod';
import { getReadConnection } from '@/db/client';
import {
  searchAvailableVehicles,
  suggestAlternatives,
  validateBranchHoursAndLimits,
} from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { handleApiError, jsonOk } from '@/server/http';

const querySchema = z.object({
  startAt: z.coerce.number().int().positive(),
  endAt: z.coerce.number().int().positive(),
  pickupBranchId: z.coerce.number().int().positive().optional(),
  returnBranchId: z.coerce.number().int().positive().optional(),
  category: z.string().optional(),
  transmission: z.string().optional(),
  fuelType: z.string().optional(),
  minSeats: z.coerce.number().int().positive().optional(),
  sort: z.enum(['recommended', 'price_asc', 'price_desc']).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.parse(Object.fromEntries(url.searchParams.entries()));
    const { sqlite } = getReadConnection();

    const pickupBranchId = parsed.pickupBranchId ?? 1;
    const returnBranchId = parsed.returnBranchId ?? pickupBranchId;

    const validation = validateBranchHoursAndLimits(
      sqlite,
      pickupBranchId,
      returnBranchId,
      parsed.startAt,
      parsed.endAt,
    );

    const available = searchAvailableVehicles(sqlite, {
      startAt: parsed.startAt,
      endAt: parsed.endAt,
      pickupBranchId: parsed.pickupBranchId,
      category: parsed.category || undefined,
      transmission: parsed.transmission || undefined,
      fuelType: parsed.fuelType || undefined,
      minSeats: parsed.minSeats,
      sort: parsed.sort ?? 'recommended',
    });

    const priced = available.map((veh) => {
      const quote = loadAndPriceVehicle(sqlite, {
        vehicleId: veh.id,
        pickupBranchId: veh.currentBranchId,
        returnBranchId,
        startAt: parsed.startAt,
        endAt: parsed.endAt,
        addonSelections: [],
      });
      return {
        ...veh,
        totalMinor: quote.totalMinor,
        subtotalMinor: quote.subtotalMinor,
        taxMinor: quote.taxMinor,
        billableDays: quote.billableDays,
      };
    });

    const alternatives =
      priced.length === 0
        ? suggestAlternatives(sqlite, {
            startAt: parsed.startAt,
            endAt: parsed.endAt,
            pickupBranchId: parsed.pickupBranchId,
            category: parsed.category || undefined,
          })
        : null;

    return jsonOk({
      validation,
      vehicles: priced,
      alternatives,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
