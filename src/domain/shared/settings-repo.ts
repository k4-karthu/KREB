import type Database from 'better-sqlite3';
import {
  DEFAULT_RENTAL_SETTINGS,
  type RentalSettings,
  RentalSettingsSchema,
} from '@/config/settings';

const SETTINGS_KEY = 'rental_settings';

export function loadRentalSettings(sqlite: Database.Database): RentalSettings {
  const row = sqlite.prepare('SELECT value_json FROM settings WHERE key = ?').get(SETTINGS_KEY) as
    | { value_json: string }
    | undefined;

  if (!row) return DEFAULT_RENTAL_SETTINGS;
  try {
    const parsed = JSON.parse(row.value_json);
    return RentalSettingsSchema.parse({ ...DEFAULT_RENTAL_SETTINGS, ...parsed });
  } catch {
    return DEFAULT_RENTAL_SETTINGS;
  }
}

export function saveRentalSettings(
  sqlite: Database.Database,
  next: RentalSettings,
  actorUserId: string,
): RentalSettings {
  const validated = RentalSettingsSchema.parse(next);
  sqlite
    .prepare(
      `INSERT INTO settings (key, value_json, updated_at, updated_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(SETTINGS_KEY, JSON.stringify(validated), Date.now(), actorUserId);
  return validated;
}
