import type Database from 'better-sqlite3';

export interface AuditInput {
  actorUserId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string | number;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Appends an immutable audit record inside the caller's SQLite transaction (§8.8).
 */
export function writeAudit(sqlite: Database.Database, input: AuditInput): void {
  sqlite
    .prepare(
      `INSERT INTO audit_logs
       (at, actor_user_id, actor_role, ip, user_agent, action, entity_type, entity_id, before_json, after_json, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      Date.now(),
      input.actorUserId ?? null,
      input.actorRole ?? null,
      input.ip ?? null,
      input.userAgent ?? null,
      input.action,
      input.entityType,
      String(input.entityId),
      input.before !== undefined ? JSON.stringify(input.before) : null,
      input.after !== undefined ? JSON.stringify(input.after) : null,
      input.requestId ?? null,
    );
}
