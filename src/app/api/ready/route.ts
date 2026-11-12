import { NextResponse } from 'next/server';
import { getReadConnection } from '@/db/client';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const { sqlite } = getReadConnection();
    const row = sqlite.prepare('SELECT 1 as ok').get() as { ok: number };
    const migrations = sqlite.prepare('SELECT count(*) as cnt FROM _migrations').get() as {
      cnt: number;
    };
    return NextResponse.json({
      ok: row.ok === 1 && migrations.cnt > 0,
      migrations: migrations.cnt,
      ts: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Database not ready' },
      { status: 503 },
    );
  }
}
