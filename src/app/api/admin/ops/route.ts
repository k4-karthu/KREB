import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const opsSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_ops_state'),
    vehicleId: z.number().int().positive(),
    opsState: z.enum(['ready', 'cleaning', 'inspection', 'hold']),
  }),
  z.object({
    action: z.literal('add_maintenance'),
    vehicleId: z.number().int().positive(),
    kind: z.enum(['service', 'repair', 'tyres', 'inspection', 'body', 'other']),
    title: z.string().min(2).max(120),
    garage: z.string().max(120).optional(),
    costMinor: z.number().int().min(0).default(0),
    startsAt: z.number().int().positive(),
    endsAt: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('update_fine'),
    fineId: z.number().int().positive(),
    status: z.enum(['open', 'charged', 'paid', 'disputed', 'waived']),
  }),
  z.object({
    action: z.literal('update_claim'),
    claimId: z.number().int().positive(),
    status: z.enum([
      'open',
      'customer_notified',
      'accepted',
      'disputed',
      'charged',
      'waived',
      'closed',
    ]),
    finalMinor: z.number().int().min(0).optional(),
  }),
]);

export async function POST(req: Request) {
  try {
    const actor = await requireStaffCapability('fleet.read');
    const body = opsSchema.parse(await req.json());
    const now = Date.now();

    withImmediateTx(({ sqlite }) => {
      if (body.action === 'set_ops_state') {
        sqlite
          .prepare('UPDATE vehicles SET ops_state = ?, updated_at = ? WHERE id = ?')
          .run(body.opsState, now, body.vehicleId);
      } else if (body.action === 'add_maintenance') {
        const blockRes = sqlite
          .prepare(
            "INSERT INTO vehicle_blocks (vehicle_id, kind, start_at, end_at, buffer_end_at, note, created_by, created_at) VALUES (?, 'maintenance', ?, ?, ?, ?, ?, ?)",
          )
          .run(body.vehicleId, body.startsAt, body.endsAt, body.endsAt, body.title, actor.id, now);
        sqlite
          .prepare(
            "INSERT INTO maintenance_logs (vehicle_id, kind, title, garage, cost_minor, starts_at, ends_at, status, block_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)",
          )
          .run(
            body.vehicleId,
            body.kind,
            body.title,
            body.garage ?? null,
            body.costMinor,
            body.startsAt,
            body.endsAt,
            Number(blockRes.lastInsertRowid),
          );
      } else if (body.action === 'update_fine') {
        sqlite.prepare('UPDATE fines SET status = ? WHERE id = ?').run(body.status, body.fineId);
      } else if (body.action === 'update_claim') {
        sqlite
          .prepare(
            'UPDATE damage_claims SET status = ?, final_minor = COALESCE(?, final_minor) WHERE id = ?',
          )
          .run(body.status, body.finalMinor ?? null, body.claimId);
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: `ops.${body.action}`,
        entityType: 'ops',
        entityId: 'desk',
        after: body,
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
