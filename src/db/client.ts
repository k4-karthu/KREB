import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index';

export type KerbDb = BetterSQLite3Database<typeof schema>;

let writeSqlite: Database.Database | null = null;
let writeDrizzle: KerbDb | null = null;
let readSqlite: Database.Database | null = null;
let readDrizzle: KerbDb | null = null;

function applyBasePragmas(sqlite: Database.Database, readOnly: boolean): void {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('cache_size = -64000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('mmap_size = 268435456');
  sqlite.pragma('wal_autocheckpoint = 1000');
  if (readOnly) {
    sqlite.pragma('query_only = ON');
  }
}

export function resolveDbPath(overridePath?: string): string {
  const p = overridePath ?? process.env.DATABASE_PATH ?? './data/kerb.db';
  if (p !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
  }
  return p;
}

/**
 * Returns the single serialised write connection (Drizzle + raw better-sqlite3).
 */
export function getWriteConnection(overridePath?: string): {
  sqlite: Database.Database;
  db: KerbDb;
} {
  if (writeSqlite && writeDrizzle && !overridePath) {
    return { sqlite: writeSqlite, db: writeDrizzle };
  }
  const dbPath = resolveDbPath(overridePath);
  const sqlite = new Database(dbPath);
  applyBasePragmas(sqlite, false);
  const db = drizzle(sqlite, { schema });
  if (!overridePath) {
    writeSqlite = sqlite;
    writeDrizzle = db;
  }
  return { sqlite, db };
}

/**
 * Returns a read-only connection (`PRAGMA query_only = ON`).
 * For `:memory:` databases, shares the write connection so in-memory tests see writes.
 */
export function getReadConnection(overridePath?: string): {
  sqlite: Database.Database;
  db: KerbDb;
} {
  const dbPath = overridePath ?? process.env.DATABASE_PATH ?? './data/kerb.db';
  if (dbPath === ':memory:') {
    return getWriteConnection(overridePath);
  }
  if (readSqlite && readDrizzle && !overridePath) {
    return { sqlite: readSqlite, db: readDrizzle };
  }
  const sqlite = new Database(resolveDbPath(overridePath));
  applyBasePragmas(sqlite, true);
  const db = drizzle(sqlite, { schema });
  if (!overridePath) {
    readSqlite = sqlite;
    readDrizzle = db;
  }
  return { sqlite, db };
}

// Simple in-process write queue to serialise async callers on the single writer
let writeTail: Promise<unknown> = Promise.resolve();

/**
 * Executes a synchronous SQLite `BEGIN IMMEDIATE` transaction with up to 3 retries on `SQLITE_BUSY`.
 */
export function withImmediateTx<T>(
  fn: (ctx: { sqlite: Database.Database; db: KerbDb }) => T,
  overridePath?: string,
): T {
  const { sqlite, db } = getWriteConnection(overridePath);
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = fn({ sqlite, db });
        sqlite.exec('COMMIT');
        return result;
      } catch (err) {
        if (sqlite.inTransaction) {
          sqlite.exec('ROLLBACK');
        }
        throw err;
      }
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'SQLITE_BUSY' && attempt < maxAttempts) {
        // Brief busy backoff
        const waitUntil = Date.now() + 15 * attempt + Math.floor(Math.random() * 15);
        while (Date.now() < waitUntil) {
          // intentional short spin in synchronous retry
        }
        continue;
      }
      throw err;
    }
  }
  throw new Error('Database busy after retries');
}

/**
 * Serialises async write workflows on the single writer queue.
 */
export function enqueueWrite<T>(work: () => T | Promise<T>): Promise<T> {
  const next = writeTail.then(work, work);
  writeTail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function closeConnections(): void {
  if (readSqlite && readSqlite !== writeSqlite) {
    try {
      readSqlite.pragma('optimize');
      readSqlite.close();
    } catch {
      // ignore close errors
    }
  }
  if (writeSqlite) {
    try {
      writeSqlite.pragma('optimize');
      writeSqlite.close();
    } catch {
      // ignore close errors
    }
  }
  readSqlite = null;
  readDrizzle = null;
  writeSqlite = null;
  writeDrizzle = null;
}
