import { z } from 'zod';
import { getReadConnection, withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { newPublicId } from '@/domain/shared/ids';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const createVehicleSchema = z.object({
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  variant: z.string().max(60).optional().nullable(),
  year: z.number().int().min(2015).max(2030),
  plate: z.string().min(4).max(20),
  vin: z.string().max(32).optional().nullable(),
  homeBranchId: z.number().int().positive(),
  currentBranchId: z.number().int().positive().optional(),
  category: z.enum(['hatchback', 'sedan', 'suv', 'muv', 'luxury', 'ev', 'van']),
  transmission: z.enum(['manual', 'automatic']),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'cng']),
  seats: z.number().int().min(2).max(16),
  doors: z.number().int().min(2).max(6).optional().nullable(),
  luggageLiters: z.number().int().min(0).max(3000).optional().nullable(),
  engineCc: z.number().int().min(0).max(8000).optional().nullable(),
  batteryKwh: z.number().min(0).max(200).optional().nullable(),
  rangeKm: z.number().int().min(0).max(1200).optional().nullable(),
  paintName: z.string().min(1).max(40),
  paintHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  ratePlanId: z.number().int().positive(),
  depositMinor: z.number().int().min(0),
  kmPerDay: z.number().int().min(0).optional().nullable(),
  extraKmMinor: z.number().int().min(0).default(0),
  minDriverAge: z.number().int().min(18).max(35).default(21),
  minLicenceYears: z.number().int().min(0).max(15).default(1),
  odometerKm: z.number().int().min(0).default(0),
  lifecycle: z.enum(['draft', 'active', 'retired']).default('draft'),
  description: z.string().max(1500).optional().nullable(),
  featureIds: z.array(z.number().int().positive()).optional(),
});

function slugifyVehicle(make: string, model: string, plate: string): string {
  return `${make}-${model}-${plate}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET() {
  try {
    await requireStaffCapability('fleet.read');
    const { sqlite } = getReadConnection();
    const vehicles = sqlite
      .prepare(
        `
      SELECT
        v.*,
        b.name AS home_branch_name,
        rp.name AS rate_plan_name,
        rp.base_daily_minor,
        (SELECT file_key FROM vehicle_images vi WHERE vi.vehicle_id = v.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1) AS primary_file_key,
        (SELECT COUNT(*) FROM vehicle_images vi WHERE vi.vehicle_id = v.id) AS image_count,
        (SELECT MIN(expires_on) FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expires_on IS NOT NULL) AS next_doc_expiry
      FROM vehicles v
      JOIN branches b ON b.id = v.home_branch_id
      JOIN rate_plans rp ON rp.id = v.rate_plan_id
      WHERE v.deleted_at IS NULL
      ORDER BY v.id DESC
    `,
      )
      .all();
    return jsonOk({ vehicles });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const body = createVehicleSchema.parse(await req.json());
    const now = Date.now();
    const publicId = `veh_${newPublicId()}`;
    const normalizedPlate = body.plate.toUpperCase().replace(/\s+/g, '');
    const slug = slugifyVehicle(body.make, body.model, normalizedPlate);

    const createdId = withImmediateTx(({ sqlite }) => {
      const res = sqlite
        .prepare(
          `
        INSERT INTO vehicles (
          public_id, slug, home_branch_id, current_branch_id, make, model, variant, year,
          plate, vin, category, transmission, fuel_type, seats, doors, luggage_liters,
          engine_cc, battery_kwh, range_km, paint_name, paint_hex, rate_plan_id,
          deposit_minor, km_per_day, extra_km_minor, min_driver_age, min_licence_years,
          odometer_km, lifecycle, ops_state, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)
      `,
        )
        .run(
          publicId,
          slug,
          body.homeBranchId,
          body.currentBranchId ?? body.homeBranchId,
          body.make,
          body.model,
          body.variant ?? null,
          body.year,
          normalizedPlate,
          body.vin ?? null,
          body.category,
          body.transmission,
          body.fuelType,
          body.seats,
          body.doors ?? null,
          body.luggageLiters ?? null,
          body.engineCc ?? null,
          body.batteryKwh ?? null,
          body.rangeKm ?? null,
          body.paintName,
          body.paintHex,
          body.ratePlanId,
          body.depositMinor,
          body.kmPerDay ?? null,
          body.extraKmMinor,
          body.minDriverAge,
          body.minLicenceYears,
          body.odometerKm,
          body.lifecycle,
          body.description ?? null,
          now,
          now,
        );

      const vehicleId = Number(res.lastInsertRowid);
      if (body.featureIds?.length) {
        const insFeat = sqlite.prepare(
          'INSERT OR IGNORE INTO vehicle_features (vehicle_id, feature_id) VALUES (?, ?)',
        );
        for (const fid of body.featureIds) {
          insFeat.run(vehicleId, fid);
        }
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle.created',
        entityType: 'vehicle',
        entityId: String(vehicleId),
        after: { publicId, plate: normalizedPlate, make: body.make, model: body.model },
      });

      return vehicleId;
    });

    return jsonOk({ id: createdId, publicId, slug }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
