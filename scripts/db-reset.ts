import fs from 'node:fs';
import path from 'node:path';
import { getWriteConnection, resolveDbPath } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to reset database in production.');
  process.exit(1);
}

const dbPath = resolveDbPath();
let unlinkedAll = true;
for (const suffix of ['', '-wal', '-shm']) {
  const full = `${dbPath}${suffix}`;
  if (fs.existsSync(full)) {
    try {
      fs.unlinkSync(full);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EBUSY' || code === 'EPERM') {
        unlinkedAll = false;
      } else {
        throw err;
      }
    }
  }
}

if (!unlinkedAll && fs.existsSync(dbPath)) {
  const { sqlite } = getWriteConnection();
  sqlite.pragma('foreign_keys = OFF');
  const objects = sqlite
    .prepare(
      "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND type IN ('trigger', 'view', 'table')",
    )
    .all() as Array<{ type: string; name: string }>;
  for (const obj of objects) {
    if (obj.type === 'trigger') sqlite.exec(`DROP TRIGGER IF EXISTS "${obj.name}"`);
    else if (obj.type === 'view') sqlite.exec(`DROP VIEW IF EXISTS "${obj.name}"`);
  }
  for (const obj of objects) {
    if (obj.type === 'table') sqlite.exec(`DROP TABLE IF EXISTS "${obj.name}"`);
  }
  sqlite.pragma('foreign_keys = ON');
}

const uploadsDir = path.resolve(process.env.UPLOADS_PATH ?? './data', 'uploads');
if (fs.existsSync(uploadsDir)) {
  fs.rmSync(uploadsDir, { recursive: true, force: true });
}

const applied = runMigrations();
console.log(`Database reset complete. Applied migrations: ${applied.join(', ')}`);
