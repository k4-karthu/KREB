import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const blacklistSchema = z.object({
  userId: z.string().min(1),
  blacklist: z.boolean(),
  reason: z.string().max(240).optional(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireStaffCapability('customers.blacklist');
    const body = blacklistSchema.parse(await req.json());

    withImmediateTx(({ sqlite }) => {
      sqlite
        .prepare(
          'UPDATE user_profiles SET is_blacklisted = ?, blacklist_reason = ? WHERE user_id = ?',
        )
        .run(
          body.blacklist ? 1 : 0,
          body.blacklist ? (body.reason ?? 'Restricted by operations') : null,
          body.userId,
        );

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: body.blacklist ? 'customer.blacklisted' : 'customer.unblacklisted',
        entityType: 'user',
        entityId: body.userId,
        after: { blacklist: body.blacklist, reason: body.reason },
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
