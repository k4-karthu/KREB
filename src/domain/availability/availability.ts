import type Database from 'better-sqlite3';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import {
  formatMinutesAsClock,
  getBranchLocalDate,
  getBranchMinuteOfDay,
  getBranchWeekday,
} from '@/domain/shared/time';

export interface SearchAvailableInput {
  startAt: number;
  endAt: number;
  pickupBranchId?: number;
  category?: string;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  maxDailyMinor?: number;
  query?: string;
  sort?: 'recommended' | 'price_asc' | 'price_desc';
}

export interface AvailableVehicleRow {
  id: number;
  publicId: string;
  slug: string;
  homeBranchId: number;
  currentBranchId: number;
  branchName: string;
  branchSlug: string;
  branchTimezone: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  plate: string;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number | null;
  luggageLiters: number | null;
  paintName: string;
  paintHex: string;
  ratePlanId: number;
  baseDailyMinor: number;
  depositMinor: number;
  kmPerDay: number | null;
  extraKmMinor: number;
  minDriverAge: number;
  minLicenceYears: number;
  opsState: string;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  primaryThumbhash: string | null;
}

export interface BlockConflict {
  id: number;
  kind: string;
  startAt: number;
  endAt: number;
  bufferEndAt: number;
  note: string | null;
}

export function checkVehicleAvailable(
  sqlite: Database.Database,
  vehicleId: number,
  startAt: number,
  endAt: number,
  opts?: { excludeBookingId?: number; bufferMinutes?: number },
): { ok: true } | { ok: false; reason: string; conflict?: BlockConflict } {
  const settings = loadRentalSettings(sqlite);
  const bufferMinutes = opts?.bufferMinutes ?? settings.turnaroundBufferMinutes;
  const bufferEndAt = endAt + bufferMinutes * 60_000;
  const now = Date.now();

  const veh = sqlite
    .prepare(
      'SELECT id, lifecycle, ops_state, current_branch_id FROM vehicles WHERE id = ? AND deleted_at IS NULL',
    )
    .get(vehicleId) as
    | { id: number; lifecycle: string; ops_state: string; current_branch_id: number }
    | undefined;

  if (!veh || veh.lifecycle !== 'active') {
    return { ok: false, reason: 'This vehicle is not active for rentals.' };
  }

  // Check expired required compliance documents
  const todayStr = new Date(now).toISOString().slice(0, 10);
  const expiredDoc = sqlite
    .prepare(
      `SELECT kind, expires_on FROM vehicle_documents
       WHERE vehicle_id = ? AND kind IN ('registration', 'insurance', 'emissions')
         AND expires_on IS NOT NULL AND expires_on < ?
       LIMIT 1`,
    )
    .get(vehicleId, todayStr) as { kind: string; expires_on: string } | undefined;

  if (expiredDoc) {
    return {
      ok: false,
      reason: `Vehicle document (${expiredDoc.kind}) expired on ${expiredDoc.expires_on}.`,
    };
  }

  const conflict = sqlite
    .prepare(
      `SELECT id, kind, start_at as startAt, end_at as endAt, buffer_end_at as bufferEndAt, note
       FROM vehicle_blocks
       WHERE vehicle_id = ?
         AND released_at IS NULL
         AND (booking_id IS NULL OR ? IS NULL OR booking_id <> ?)
         AND (kind <> 'hold' OR expires_at > ?)
         AND ? < buffer_end_at
         AND ? > start_at
       ORDER BY start_at ASC
       LIMIT 1`,
    )
    .get(
      vehicleId,
      opts?.excludeBookingId ?? null,
      opts?.excludeBookingId ?? null,
      now,
      startAt,
      bufferEndAt,
    ) as BlockConflict | undefined;

  if (conflict) {
    return {
      ok: false,
      reason:
        'This vehicle already has a reservation or maintenance block overlapping those dates.',
      conflict,
    };
  }

  return { ok: true };
}

export function validateBranchHoursAndLimits(
  sqlite: Database.Database,
  pickupBranchId: number,
  returnBranchId: number,
  startAt: number,
  endAt: number,
):
  | { ok: true; afterHoursCount: number; afterHoursFeeMinor: number }
  | { ok: false; message: string } {
  const settings = loadRentalSettings(sqlite);
  const now = Date.now();

  if (endAt <= startAt) {
    return { ok: false, message: 'Return time must be after pick-up time.' };
  }
  if (startAt - now < settings.minLeadTimeMinutes * 60_000) {
    return {
      ok: false,
      message: `Pick-up must be at least ${Math.round(settings.minLeadTimeMinutes / 60)} hours from now.`,
    };
  }
  const durationMinutes = (endAt - startAt) / 60_000;
  if (durationMinutes < settings.minDurationMinutes) {
    return {
      ok: false,
      message: `Minimum rental duration is ${Math.round(settings.minDurationMinutes / 60)} hours.`,
    };
  }
  if (durationMinutes > settings.maxDurationMinutes) {
    return {
      ok: false,
      message: `Online bookings are capped at ${Math.round(settings.maxDurationMinutes / 1440)} days.`,
    };
  }
  if (pickupBranchId !== returnBranchId && !settings.oneWayEnabled) {
    return {
      ok: false,
      message:
        'One-way returns to another branch are currently disabled. Choose the same return branch.',
    };
  }

  let afterHoursCount = 0;
  let afterHoursFeeMinor = 0;

  for (const [label, branchId, instant] of [
    ['Pick-up', pickupBranchId, startAt],
    ['Return', returnBranchId, endAt],
  ] as const) {
    const branch = sqlite
      .prepare(
        'SELECT id, name, timezone, allows_after_hours, after_hours_fee_minor, is_active FROM branches WHERE id = ? AND deleted_at IS NULL',
      )
      .get(branchId) as
      | {
          id: number;
          name: string;
          timezone: string;
          allows_after_hours: number;
          after_hours_fee_minor: number;
          is_active: number;
        }
      | undefined;

    if (!branch || !branch.is_active) {
      return { ok: false, message: `${label} branch is unavailable.` };
    }

    const localDate = getBranchLocalDate(instant, branch.timezone);
    const closure = sqlite
      .prepare(
        'SELECT reason FROM branch_closures WHERE branch_id = ? AND starts_on <= ? AND ends_on >= ? LIMIT 1',
      )
      .get(branch.id, localDate, localDate) as { reason: string | null } | undefined;

    if (closure) {
      return {
        ok: false,
        message: `${branch.name} is closed on ${localDate}${closure.reason ? ` (${closure.reason})` : ''}.`,
      };
    }

    const weekday = getBranchWeekday(instant, branch.timezone);
    const hours = sqlite
      .prepare(
        'SELECT opens_minute, closes_minute FROM branch_hours WHERE branch_id = ? AND weekday = ?',
      )
      .get(branch.id, weekday) as { opens_minute: number; closes_minute: number } | undefined;

    if (hours) {
      const minute = getBranchMinuteOfDay(instant, branch.timezone);
      const isOpen = minute >= hours.opens_minute && minute <= hours.closes_minute;
      if (!isOpen) {
        if (branch.allows_after_hours) {
          afterHoursCount += 1;
          afterHoursFeeMinor += branch.after_hours_fee_minor;
        } else {
          return {
            ok: false,
            message: `${label} time is outside ${branch.name} hours (${formatMinutesAsClock(hours.opens_minute)} to ${formatMinutesAsClock(hours.closes_minute)}).`,
          };
        }
      }
    }
  }

  return { ok: true, afterHoursCount, afterHoursFeeMinor };
}

export function searchAvailableVehicles(
  sqlite: Database.Database,
  input: SearchAvailableInput,
): AvailableVehicleRow[] {
  const settings = loadRentalSettings(sqlite);
  const bufferEndAt = input.endAt + settings.turnaroundBufferMinutes * 60_000;
  const now = Date.now();
  const todayStr = new Date(now).toISOString().slice(0, 10);

  const conditions: string[] = [
    "v.lifecycle = 'active'",
    'v.deleted_at IS NULL',
    `NOT EXISTS (
      SELECT 1 FROM vehicle_blocks b
      WHERE b.vehicle_id = v.id
        AND b.released_at IS NULL
        AND (b.kind <> 'hold' OR b.expires_at > ?)
        AND ? < b.buffer_end_at
        AND ? > b.start_at
    )`,
    `NOT EXISTS (
      SELECT 1 FROM vehicle_documents vd
      WHERE vd.vehicle_id = v.id
        AND vd.kind IN ('registration', 'insurance', 'emissions')
        AND vd.expires_on IS NOT NULL
        AND vd.expires_on < ?
    )`,
  ];

  const params: Array<string | number> = [now, input.startAt, bufferEndAt, todayStr];

  if (input.pickupBranchId) {
    conditions.push('v.current_branch_id = ?');
    params.push(input.pickupBranchId);
  }
  if (input.category) {
    conditions.push('v.category = ?');
    params.push(input.category);
  }
  if (input.transmission) {
    conditions.push('v.transmission = ?');
    params.push(input.transmission);
  }
  if (input.fuelType) {
    conditions.push('v.fuel_type = ?');
    params.push(input.fuelType);
  }
  if (input.minSeats) {
    conditions.push('v.seats >= ?');
    params.push(input.minSeats);
  }
  if (input.maxDailyMinor) {
    conditions.push('rp.base_daily_minor <= ?');
    params.push(input.maxDailyMinor);
  }
  if (input.query?.trim()) {
    const ftsQuery = input.query
      .trim()
      .split(/\s+/)
      .map((t) => `${t.replace(/["*]/g, '')}*`)
      .join(' ');
    conditions.push('v.id IN (SELECT rowid FROM vehicles_fts WHERE vehicles_fts MATCH ?)');
    params.push(ftsQuery);
  }

  let orderBy =
    "CASE WHEN v.ops_state = 'ready' THEN 0 ELSE 1 END, rp.base_daily_minor ASC, v.id ASC";
  if (input.sort === 'price_asc') {
    orderBy = 'rp.base_daily_minor ASC, v.id ASC';
  } else if (input.sort === 'price_desc') {
    orderBy = 'rp.base_daily_minor DESC, v.id ASC';
  }

  const sql = `
    SELECT
      v.id,
      v.public_id AS publicId,
      v.slug,
      v.home_branch_id AS homeBranchId,
      v.current_branch_id AS currentBranchId,
      br.name AS branchName,
      br.slug AS branchSlug,
      br.timezone AS branchTimezone,
      v.make,
      v.model,
      v.variant,
      v.year,
      v.plate,
      v.category,
      v.transmission,
      v.fuel_type AS fuelType,
      v.seats,
      v.doors,
      v.luggage_liters AS luggageLiters,
      v.paint_name AS paintName,
      v.paint_hex AS paintHex,
      v.rate_plan_id AS ratePlanId,
      rp.base_daily_minor AS baseDailyMinor,
      v.deposit_minor AS depositMinor,
      v.km_per_day AS kmPerDay,
      v.extra_km_minor AS extraKmMinor,
      v.min_driver_age AS minDriverAge,
      v.min_licence_years AS minLicenceYears,
      v.ops_state AS opsState,
      CASE
        WHEN vi.file_key IS NOT NULL THEN '/api/uploads/public/' || vi.file_key || '-640.webp'
        ELSE NULL
      END AS primaryImageUrl,
      vi.alt_text AS primaryImageAlt,
      vi.thumbhash AS primaryThumbhash
    FROM vehicles v
    JOIN branches br ON br.id = v.current_branch_id
    JOIN rate_plans rp ON rp.id = v.rate_plan_id
    LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = 1
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
  `;

  return sqlite.prepare(sql).all(...params) as AvailableVehicleRow[];
}

export function suggestAlternatives(
  sqlite: Database.Database,
  input: SearchAvailableInput,
): {
  shiftedDates: Array<{ shiftDays: number; startAt: number; endAt: number; count: number }>;
  similarVehicles: AvailableVehicleRow[];
} {
  const shiftedDates: Array<{ shiftDays: number; startAt: number; endAt: number; count: number }> =
    [];
  for (const shiftDays of [1, -1, 2, -2, 3]) {
    const startAt = input.startAt + shiftDays * 86_400_000;
    const endAt = input.endAt + shiftDays * 86_400_000;
    if (startAt <= Date.now()) continue;
    const found = searchAvailableVehicles(sqlite, { ...input, startAt, endAt });
    if (found.length > 0) {
      shiftedDates.push({ shiftDays, startAt, endAt, count: found.length });
    }
  }

  // Similar vehicles without category/transmission/branch constraints
  const similarVehicles = searchAvailableVehicles(sqlite, {
    startAt: input.startAt,
    endAt: input.endAt,
  }).slice(0, 4);

  return { shiftedDates, similarVehicles };
}
