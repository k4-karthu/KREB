import { z } from 'zod';
import { getReadConnection, withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { DomainError } from '@/domain/shared/errors';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const patchVehicleSchema = z.object({
  make: z.string().min(1).max(60).optional(),
  model: z.string().min(1).max(60).optional(),
  variant: z.string().max(60).optional().nullable(),
  year: z.number().int().min(2015).max(2030).optional(),
  plate: z.string().min(4).max(20).optional(),
  homeBranchId: z.number().int().positive().optional(),
  currentBranchId: z.number().int().positive().optional(),
  category: z.enum(['hatchback', 'sedan', 'suv', 'muv', 'luxury', 'ev', 'van']).optional(),
  transmission: z.enum(['manual', 'automatic']).optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'cng']).optional(),
  seats: z.number().int().min(2).max(16).optional(),
  doors: z.number().int().min(2).max(6).optional().nullable(),
  luggageLiters: z.number().int().min(0).max(3000).optional().nullable(),
  engineCc: z.number().int().min(0).max(8000).optional().nullable(),
  batteryKwh: z.number().min(0).max(200).optional().nullable(),
  rangeKm: z.number().int().min(0).max(1200).optional().nullable(),
  paintName: z.string().min(1).max(40).optional(),
  paintHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  ratePlanId: z.number().int().positive().optional(),
  depositMinor: z.number().int().min(0).optional(),
  kmPerDay: z.number().int().min(0).optional().nullable(),
  extraKmMinor: z.number().int().min(0).optional(),
  minDriverAge: z.number().int().min(18).max(35).optional(),
  minLicenceYears: z.number().int().min(0).max(15).optional(),
  odometerKm: z.number().int().min(0).optional(),
  lifecycle: z.enum(['draft', 'active', 'retired']).optional(),
  opsState: z.enum(['ready', 'cleaning', 'inspection', 'hold']).optional(),
  description: z.string().max(1500).optional().nullable(),
  featureIds: z.array(z.number().int().positive()).optional(),
});

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireStaffCapability('fleet.read');
    const { id } = await context.params;
    const vid = Number(id);
    if (!Number.isInteger(vid) || vid <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle ID', 400);
    }

    const { sqlite } = getReadConnection();
    const vehicle = sqlite
      .prepare('SELECT * FROM vehicles WHERE id = ? AND deleted_at IS NULL')
      .get(vid);
    if (!vehicle) {
      throw new DomainError('NOT_FOUND', 'Vehicle not found', 404);
    }

    const images = sqlite
      .prepare(
        'SELECT * FROM vehicle_images WHERE vehicle_id = ? ORDER BY is_primary DESC, sort_order ASC, id ASC',
      )
      .all(vid);
    const documents = sqlite
      .prepare('SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY id DESC')
      .all(vid);
    const featureRows = sqlite
      .prepare('SELECT feature_id FROM vehicle_features WHERE vehicle_id = ?')
      .all(vid) as Array<{ feature_id: number }>;

    return jsonOk({
      vehicle,
      images,
      documents,
      featureIds: featureRows.map((r) => r.feature_id),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    if (!Number.isInteger(vid) || vid <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle ID', 400);
    }
    const body = patchVehicleSchema.parse(await req.json());

    withImmediateTx(({ sqlite }) => {
      const existing = sqlite
        .prepare('SELECT * FROM vehicles WHERE id = ? AND deleted_at IS NULL')
        .get(vid) as Record<string, unknown> | undefined;
      if (!existing) {
        throw new DomainError('NOT_FOUND', 'Vehicle not found', 404);
      }

      const columnMap: Record<string, string> = {
        make: 'make',
        model: 'model',
        variant: 'variant',
        year: 'year',
        plate: 'plate',
        homeBranchId: 'home_branch_id',
        currentBranchId: 'current_branch_id',
        category: 'category',
        transmission: 'transmission',
        fuelType: 'fuel_type',
        seats: 'seats',
        doors: 'doors',
        luggageLiters: 'luggage_liters',
        engineCc: 'engine_cc',
        batteryKwh: 'battery_kwh',
        rangeKm: 'range_km',
        paintName: 'paint_name',
        paintHex: 'paint_hex',
        ratePlanId: 'rate_plan_id',
        depositMinor: 'deposit_minor',
        kmPerDay: 'km_per_day',
        extraKmMinor: 'extra_km_minor',
        minDriverAge: 'min_driver_age',
        minLicenceYears: 'min_licence_years',
        odometerKm: 'odometer_km',
        lifecycle: 'lifecycle',
        opsState: 'ops_state',
        description: 'description',
      };

      const sets: string[] = [];
      const values: unknown[] = [];
      for (const [key, col] of Object.entries(columnMap)) {
        const val = (body as Record<string, unknown>)[key];
        if (val !== undefined) {
          sets.push(`${col} = ?`);
          values.push(
            key === 'plate' && typeof val === 'string'
              ? val.toUpperCase().replace(/\s+/g, '')
              : val,
          );
        }
      }

      if (sets.length > 0) {
        sets.push('updated_at = ?');
        values.push(Date.now(), vid);
        sqlite.prepare(`UPDATE vehicles SET ${sets.join(', ')} WHERE id = ?`).run(...values);
      }

      if (body.featureIds !== undefined) {
        sqlite.prepare('DELETE FROM vehicle_features WHERE vehicle_id = ?').run(vid);
        const insFeat = sqlite.prepare(
          'INSERT OR IGNORE INTO vehicle_features (vehicle_id, feature_id) VALUES (?, ?)',
        );
        for (const fid of body.featureIds) {
          insFeat.run(vid, fid);
        }
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle.updated',
        entityType: 'vehicle',
        entityId: String(vid),
        before: { lifecycle: existing.lifecycle, opsState: existing.ops_state },
        after: body,
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    if (!Number.isInteger(vid) || vid <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle ID', 400);
    }

    withImmediateTx(({ sqlite }) => {
      const now = Date.now();
      const activeBlock = sqlite
        .prepare(
          'SELECT id FROM vehicle_blocks WHERE vehicle_id = ? AND released_at IS NULL AND end_at > ? LIMIT 1',
        )
        .get(vid, now);
      if (activeBlock) {
        throw new DomainError(
          'CONFLICT',
          'Cannot archive a vehicle with active or upcoming reservations',
          409,
        );
      }

      sqlite
        .prepare(
          "UPDATE vehicles SET lifecycle = 'retired', deleted_at = ?, updated_at = ? WHERE id = ?",
        )
        .run(now, now, vid);

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle.archived',
        entityType: 'vehicle',
        entityId: String(vid),
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
