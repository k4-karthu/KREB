import { Cron } from 'croner';
import { withImmediateTx } from '@/db/client';
import { transitionBooking } from '@/domain/booking/state-machine';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { logger } from './logger';
import { processOutboxBatch } from './mail';

let schedulerStarted = false;

/**
 * Releases expired checkout holds (`pending_payment` -> `expired`) and frees their blocks (§6.5).
 */
export function runExpireHoldsJob(): number {
  return withImmediateTx(({ sqlite }) => {
    const now = Date.now();
    const expiredBlocks = sqlite
      .prepare(
        `SELECT id, booking_id FROM vehicle_blocks
         WHERE kind = 'hold' AND released_at IS NULL AND expires_at <= ?`,
      )
      .all(now) as Array<{ id: number; booking_id: number | null }>;

    for (const blk of expiredBlocks) {
      sqlite.prepare('UPDATE vehicle_blocks SET released_at = ? WHERE id = ?').run(now, blk.id);
      if (blk.booking_id) {
        const booking = sqlite
          .prepare('SELECT status FROM bookings WHERE id = ?')
          .get(blk.booking_id) as { status: string } | undefined;
        if (booking?.status === 'pending_payment') {
          transitionBooking(sqlite, {
            bookingId: blk.booking_id,
            toStatus: 'expired',
            actorKind: 'system',
            eventType: 'hold.expired',
            releaseBlock: true,
          });
        }
      }
    }
    return expiredBlocks.length;
  });
}

/**
 * Releases confirmed bookings whose pick-up time + noShowReleaseMinutes has passed without check-out.
 */
export function runNoShowReleaseJob(): number {
  return withImmediateTx(({ sqlite }) => {
    const settings = loadRentalSettings(sqlite);
    const cutoff = Date.now() - settings.noShowReleaseMinutes * 60_000;
    const rows = sqlite
      .prepare("SELECT id FROM bookings WHERE status = 'confirmed' AND start_at < ?")
      .all(cutoff) as Array<{ id: number }>;

    for (const row of rows) {
      transitionBooking(sqlite, {
        bookingId: row.id,
        toStatus: 'no_show',
        actorKind: 'system',
        eventType: 'booking.no_show',
        releaseBlock: true,
      });
    }
    return rows.length;
  });
}

function runWithLease(name: string, leaseMs: number, fn: () => unknown): void {
  const now = Date.now();
  const acquired = withImmediateTx(({ sqlite }) => {
    const row = sqlite.prepare('SELECT locked_until FROM jobs WHERE name = ?').get(name) as
      | { locked_until: number | null }
      | undefined;
    if (row?.locked_until && row.locked_until > now) {
      return false;
    }
    sqlite
      .prepare(
        `INSERT INTO jobs (name, locked_until, last_run_at, last_status)
         VALUES (?, ?, ?, 'running')
         ON CONFLICT(name) DO UPDATE SET locked_until = excluded.locked_until, last_run_at = excluded.last_run_at, last_status = 'running'`,
      )
      .run(name, now + leaseMs, now);
    return true;
  });

  if (!acquired) return;

  try {
    fn();
    withImmediateTx(({ sqlite }) => {
      sqlite
        .prepare(
          "UPDATE jobs SET locked_until = NULL, last_status = 'ok', last_error = NULL WHERE name = ?",
        )
        .run(name);
    });
  } catch (err) {
    logger.error({ job: name, err }, 'Scheduled job failed');
    withImmediateTx(({ sqlite }) => {
      sqlite
        .prepare(
          "UPDATE jobs SET locked_until = NULL, last_status = 'error', last_error = ? WHERE name = ?",
        )
        .run(err instanceof Error ? err.message : 'Unknown error', name);
    });
  }
}

export function startBackgroundScheduler(): void {
  if (schedulerStarted || process.env.NODE_ENV === 'test') return;
  schedulerStarted = true;

  new Cron('*/30 * * * * *', () => {
    runWithLease('holds.expire', 25_000, runExpireHoldsJob);
  });

  new Cron('*/15 * * * * *', () => {
    runWithLease('outbox.deliver', 12_000, () =>
      withImmediateTx(({ sqlite }) => processOutboxBatch(sqlite, 25)),
    );
  });

  new Cron('*/5 * * * *', () => {
    runWithLease('noshow.release', 60_000, runNoShowReleaseJob);
  });
}
