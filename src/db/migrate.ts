import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { getWriteConnection } from './client';

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'src/db/migrations');

/**
 * Applies all pending SQL migrations in `src/db/migrations` inside immediate transactions.
 */
export function runMigrations(sqliteOverride?: Database.Database): string[] {
  const sqlite = sqliteOverride ?? getWriteConnection().sqlite;
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    ) STRICT;
  `);

  const appliedRows = sqlite.prepare('SELECT name FROM _migrations').all() as { name: string }[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.exec(sql);
      sqlite
        .prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)')
        .run(file, Date.now());
      sqlite.exec('COMMIT');
      newlyApplied.push(file);
    } catch (err) {
      if (sqlite.inTransaction) {
        sqlite.exec('ROLLBACK');
      }
      throw err;
    }
  }

  return newlyApplied;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.ts')) {
  const applied = runMigrations();
  console.log(
    applied.length ? `Applied migrations: ${applied.join(', ')}` : 'Database up to date.',
  );
}
