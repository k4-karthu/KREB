import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { DomainError } from '@/domain/shared/errors';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

const docSchema = z.object({
  kind: z.enum(['registration', 'insurance', 'road_tax', 'emissions', 'permit', 'other']),
  referenceNo: z.string().max(64).optional().nullable(),
  issuedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    if (!Number.isInteger(vid) || vid <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle ID', 400);
    }
    const body = docSchema.parse(await req.json());
    const now = Date.now();

    const docId = withImmediateTx(({ sqlite }) => {
      const res = sqlite
        .prepare(
          'INSERT INTO vehicle_documents (vehicle_id, kind, reference_no, issued_on, expires_on, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          vid,
          body.kind,
          body.referenceNo ?? null,
          body.issuedOn ?? null,
          body.expiresOn ?? null,
          now,
        );
      const createdId = Number(res.lastInsertRowid);
      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle_document.added',
        entityType: 'vehicle',
        entityId: String(vid),
        after: { docId: createdId, ...body },
      });
      return createdId;
    });

    return jsonOk({ id: docId }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    const docId = Number(new URL(req.url).searchParams.get('docId'));
    if (!Number.isInteger(vid) || !Number.isInteger(docId)) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid IDs', 400);
    }

    withImmediateTx(({ sqlite }) => {
      sqlite
        .prepare('DELETE FROM vehicle_documents WHERE id = ? AND vehicle_id = ?')
        .run(docId, vid);
      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle_document.deleted',
        entityType: 'vehicle',
        entityId: String(vid),
        before: { docId },
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
