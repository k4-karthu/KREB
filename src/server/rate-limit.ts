import { withImmediateTx } from '@/db/client';

/**
 * SQLite-backed sliding window rate limiter (§5.1, §10).
 * Returns `{ allowed: true, remaining }` or `{ allowed: false, retryAfterMs }`.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;

  return withImmediateTx(({ sqlite }) => {
    const row = sqlite
      .prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?')
      .get(key, windowStart) as { count: number } | undefined;

    const current = row?.count ?? 0;
    if (current >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: windowStart + windowMs - now,
      };
    }

    if (row) {
      sqlite
        .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ? AND window_start = ?')
        .run(key, windowStart);
    } else {
      sqlite
        .prepare('INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)')
        .run(key, windowStart);
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - (current + 1)),
      retryAfterMs: 0,
    };
  });
}
