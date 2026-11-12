import type Database from 'better-sqlite3';
import { logger } from './logger';

export interface OutboxEmailInput {
  kind: string;
  to: string;
  template: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
}

/**
 * Enqueues an email into the SQLite outbox with optional idempotent dedupeKey (§8.6).
 */
export function enqueueEmail(sqlite: Database.Database, input: OutboxEmailInput): void {
  const now = Date.now();
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO outbox (kind, to_addr, template, payload_json, dedupe_key, status, attempts, next_attempt_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'queued', 0, ?, ?)`,
    )
    .run(
      input.kind,
      input.to,
      input.template,
      JSON.stringify(input.payload),
      input.dedupeKey ?? null,
      now,
      now,
    );
}

/**
 * Delivers queued outbox rows (logs cleanly in console/dev mode; extensible to SMTP/Resend).
 */
export function processOutboxBatch(sqlite: Database.Database, limit = 20): number {
  const now = Date.now();
  const rows = sqlite
    .prepare(
      `SELECT id, kind, to_addr, template, payload_json, attempts
       FROM outbox
       WHERE status = 'queued' AND next_attempt_at <= ?
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(now, limit) as Array<{
    id: number;
    kind: string;
    to_addr: string;
    template: string;
    payload_json: string;
    attempts: number;
  }>;

  let sent = 0;
  for (const row of rows) {
    try {
      logger.info(
        { outboxId: row.id, to: row.to_addr, template: row.template, kind: row.kind },
        'Outbox email dispatched',
      );
      sqlite
        .prepare(
          "UPDATE outbox SET status = 'sent', sent_at = ?, attempts = attempts + 1 WHERE id = ?",
        )
        .run(Date.now(), row.id);
      sent += 1;
    } catch (err) {
      const nextAttempt = Date.now() + Math.min(3600_000, 15_000 * 2 ** row.attempts);
      sqlite
        .prepare(
          `UPDATE outbox
           SET attempts = attempts + 1,
               next_attempt_at = ?,
               last_error = ?,
               status = CASE WHEN attempts + 1 >= 5 THEN 'failed' ELSE 'queued' END
           WHERE id = ?`,
        )
        .run(nextAttempt, err instanceof Error ? err.message : 'Send error', row.id);
    }
  }
  return sent;
}
