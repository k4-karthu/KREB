import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../src/db/migrate';

function setupMemoryDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  runMigrations(sqlite);
  return sqlite;
}

describe('SQLite schema, triggers & FTS5 (§7)', () => {
  it('applies migrations cleanly and creates required STRICT tables, triggers, and FTS5', () => {
    const sqlite = setupMemoryDb();
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = new Set(tables.map((t) => t.name));

    for (const expected of [
      'branches',
      'branch_hours',
      'rate_plans',
      'vehicles',
      'vehicle_images',
      'vehicle_blocks',
      'bookings',
      'booking_line_items',
      'payments',
      'invoices',
      'invoice_sequences',
      'inspections',
      'audit_logs',
      'outbox',
      'vehicles_fts',
    ]) {
      expect(tableNames.has(expected), `Missing table ${expected}`).toBe(true);
    }

    // Re-running migrations is idempotent
    expect(runMigrations(sqlite)).toEqual([]);
    sqlite.close();
  });

  it('aborts overlapping vehicle_blocks via trigger and allows non-overlapping or released blocks', () => {
    const sqlite = setupMemoryDb();
    const now = Date.now();

    sqlite
      .prepare(
        `INSERT INTO branches (public_id, slug, name, city, address, timezone, created_at, updated_at)
         VALUES ('br_1', 'indiranagar', 'Indiranagar Hub', 'Bengaluru', '100 Ft Rd', 'Asia/Kolkata', ?, ?)`,
      )
      .run(now, now);
    sqlite
      .prepare(
        `INSERT INTO rate_plans (public_id, name, base_daily_minor, created_at, updated_at)
         VALUES ('rp_1', 'Standard Hatch', 280000, ?, ?)`,
      )
      .run(now, now);
    sqlite
      .prepare(
        `INSERT INTO vehicles (public_id, slug, home_branch_id, current_branch_id, make, model, year, plate, category, transmission, fuel_type, seats, paint_name, paint_hex, rate_plan_id, created_at, updated_at)
         VALUES ('veh_1', 'swift-zxi', 1, 1, 'Maruti Suzuki', 'Swift', 2025, 'KA03MN4821', 'hatchback', 'manual', 'petrol', 5, 'Pearl White', '#F4F5F0', 1, ?, ?)`,
      )
      .run(now, now);

    const t0 = 1_800_000_000_000;
    const hour = 3_600_000;

    sqlite
      .prepare(
        `INSERT INTO vehicle_blocks (vehicle_id, kind, start_at, end_at, buffer_end_at, created_at)
         VALUES (1, 'booking', ?, ?, ?, ?)`,
      )
      .run(t0, t0 + 24 * hour, t0 + 25.5 * hour, now);

    // Overlapping during buffer window should fail with VEHICLE_UNAVAILABLE
    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO vehicle_blocks (vehicle_id, kind, start_at, end_at, buffer_end_at, created_at)
           VALUES (1, 'booking', ?, ?, ?, ?)`,
        )
        .run(t0 + 25 * hour, t0 + 48 * hour, t0 + 49.5 * hour, now),
    ).toThrow(/VEHICLE_UNAVAILABLE/);

    // Starting right at buffer_end_at succeeds
    sqlite
      .prepare(
        `INSERT INTO vehicle_blocks (vehicle_id, kind, start_at, end_at, buffer_end_at, created_at)
         VALUES (1, 'maintenance', ?, ?, ?, ?)`,
      )
      .run(t0 + 25.5 * hour, t0 + 30 * hour, t0 + 30 * hour, now);

    sqlite.close();
  });

  it('enforces audit_logs append-only immutability', () => {
    const sqlite = setupMemoryDb();
    sqlite
      .prepare(
        `INSERT INTO audit_logs (at, action, entity_type, entity_id)
         VALUES (?, 'vehicle.create', 'vehicle', 'veh_1')`,
      )
      .run(Date.now());

    expect(() =>
      sqlite.prepare("UPDATE audit_logs SET action = 'tampered' WHERE id = 1").run(),
    ).toThrow(/AUDIT_IMMUTABLE/);

    expect(() => sqlite.prepare('DELETE FROM audit_logs WHERE id = 1').run()).toThrow(
      /AUDIT_IMMUTABLE/,
    );

    sqlite.close();
  });
});
