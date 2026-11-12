import type Database from 'better-sqlite3';
import { writeAudit } from '@/domain/audit/audit';
import { DomainError } from '@/domain/shared/errors';

export type BookingStatus =
  | 'pending_payment'
  | 'pending_approval'
  | 'confirmed'
  | 'active'
  | 'returned'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired'
  | 'rejected';

export type ActorKind = 'customer' | 'staff' | 'system' | 'provider';

interface TransitionRule {
  from: BookingStatus;
  to: BookingStatus;
  actors: ActorKind[];
}

const ALLOWED_TRANSITIONS: TransitionRule[] = [
  { from: 'pending_payment', to: 'confirmed', actors: ['provider', 'staff', 'system'] },
  { from: 'pending_payment', to: 'expired', actors: ['system', 'staff'] },
  { from: 'pending_payment', to: 'cancelled', actors: ['customer', 'staff'] },
  { from: 'pending_approval', to: 'confirmed', actors: ['staff'] },
  { from: 'pending_approval', to: 'pending_payment', actors: ['staff'] },
  { from: 'pending_approval', to: 'rejected', actors: ['staff'] },
  { from: 'pending_approval', to: 'cancelled', actors: ['customer', 'staff'] },
  { from: 'confirmed', to: 'active', actors: ['staff'] },
  { from: 'confirmed', to: 'cancelled', actors: ['customer', 'staff'] },
  { from: 'confirmed', to: 'no_show', actors: ['system', 'staff'] },
  { from: 'active', to: 'returned', actors: ['staff'] },
  { from: 'returned', to: 'completed', actors: ['staff'] },
];

export function canTransitionBooking(
  from: BookingStatus,
  to: BookingStatus,
  actorKind: ActorKind,
): boolean {
  return ALLOWED_TRANSITIONS.some(
    (r) => r.from === from && r.to === to && r.actors.includes(actorKind),
  );
}

/**
 * Transitions a booking inside the caller's transaction, recording booking_events & audit_logs (§8.3).
 */
export function transitionBooking(
  sqlite: Database.Database,
  params: {
    bookingId: number;
    toStatus: BookingStatus;
    actorKind: ActorKind;
    actorUserId?: string | null;
    actorRole?: string | null;
    eventType?: string;
    reason?: string;
    payload?: Record<string, unknown>;
    releaseBlock?: boolean;
  },
): { fromStatus: BookingStatus; toStatus: BookingStatus } {
  const row = sqlite
    .prepare('SELECT id, code, status FROM bookings WHERE id = ?')
    .get(params.bookingId) as { id: number; code: string; status: BookingStatus } | undefined;

  if (!row) {
    throw new DomainError('NOT_FOUND', 'Booking not found.', 404);
  }

  if (!canTransitionBooking(row.status, params.toStatus, params.actorKind)) {
    throw new DomainError(
      'INVALID_TRANSITION',
      `Cannot move booking ${row.code} from ${row.status} to ${params.toStatus}.`,
      409,
    );
  }

  const now = Date.now();
  const isCancel = params.toStatus === 'cancelled';

  sqlite
    .prepare(
      `UPDATE bookings
       SET status = ?,
           cancel_reason = COALESCE(?, cancel_reason),
           cancelled_at = CASE WHEN ? = 1 THEN ? ELSE cancelled_at END,
           actual_start_at = CASE WHEN ? = 'active' AND actual_start_at IS NULL THEN ? ELSE actual_start_at END,
           actual_end_at = CASE WHEN ? = 'returned' AND actual_end_at IS NULL THEN ? ELSE actual_end_at END,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      params.toStatus,
      params.reason ?? null,
      isCancel ? 1 : 0,
      now,
      params.toStatus,
      now,
      params.toStatus,
      now,
      now,
      row.id,
    );

  if (
    params.releaseBlock ||
    params.toStatus === 'cancelled' ||
    params.toStatus === 'expired' ||
    params.toStatus === 'rejected' ||
    params.toStatus === 'no_show'
  ) {
    sqlite
      .prepare(
        'UPDATE vehicle_blocks SET released_at = ? WHERE booking_id = ? AND released_at IS NULL',
      )
      .run(now, row.id);
  }

  sqlite
    .prepare(
      `INSERT INTO booking_events (booking_id, type, from_status, to_status, actor_user_id, actor_kind, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      params.eventType ?? `status.${params.toStatus}`,
      row.status,
      params.toStatus,
      params.actorUserId ?? null,
      params.actorKind,
      params.payload ? JSON.stringify(params.payload) : null,
      now,
    );

  writeAudit(sqlite, {
    actorUserId: params.actorUserId ?? null,
    actorRole: params.actorRole ?? params.actorKind,
    action: `booking.${params.toStatus}`,
    entityType: 'booking',
    entityId: row.code,
    before: { status: row.status },
    after: { status: params.toStatus, reason: params.reason },
  });

  return { fromStatus: row.status, toStatus: params.toStatus };
}
