import { z } from 'zod';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { DomainError } from '@/domain/shared/errors';
import { newPublicId } from '@/domain/shared/ids';
import { requireStaffCapability } from '@/server/auth';
import { deleteVehicleImageFiles, processAndSaveVehicleImage } from '@/server/files';
import { handleApiError, jsonOk } from '@/server/http';

const patchImageSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set_primary'),
    imageId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('reorder'),
    orderedIds: z.array(z.number().int().positive()).min(1),
  }),
  z.object({
    action: z.literal('update_meta'),
    imageId: z.number().int().positive(),
    altText: z.string().min(2).max(200),
    shotType: z
      .enum(['front34', 'side', 'rear34', 'interior', 'dashboard', 'boot', 'detail', 'other'])
      .nullable(),
  }),
]);

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    if (!Number.isInteger(vid) || vid <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle ID', 400);
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new DomainError('VALIDATION_ERROR', 'Please choose an image file to upload.', 400);
    }

    const altText = String(form.get('altText') ?? '').trim() || 'Vehicle exterior photograph';
    const shotTypeRaw = String(form.get('shotType') ?? 'front34');
    const shotType = [
      'front34',
      'side',
      'rear34',
      'interior',
      'dashboard',
      'boot',
      'detail',
      'other',
    ].includes(shotTypeRaw)
      ? shotTypeRaw
      : 'other';

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAndSaveVehicleImage(buffer);
    const now = Date.now();
    const publicId = `img_${newPublicId()}`;

    const inserted = withImmediateTx(({ sqlite }) => {
      const veh = sqlite
        .prepare('SELECT id FROM vehicles WHERE id = ? AND deleted_at IS NULL')
        .get(vid);
      if (!veh) {
        throw new DomainError('NOT_FOUND', 'Vehicle not found', 404);
      }

      const countRow = sqlite
        .prepare(
          'SELECT COUNT(*) AS cnt, COALESCE(MAX(sort_order), -1) AS max_sort FROM vehicle_images WHERE vehicle_id = ?',
        )
        .get(vid) as { cnt: number; max_sort: number };

      const isPrimary = countRow.cnt === 0 ? 1 : 0;
      const sortOrder = countRow.max_sort + 1;

      const res = sqlite
        .prepare(
          `
        INSERT INTO vehicle_images (public_id, vehicle_id, file_key, width, height, thumbhash, alt_text, shot_type, is_primary, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          publicId,
          vid,
          processed.fileKey,
          processed.width,
          processed.height,
          processed.thumbhash,
          altText,
          shotType,
          isPrimary,
          sortOrder,
          now,
        );

      const imageId = Number(res.lastInsertRowid);
      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle_image.uploaded',
        entityType: 'vehicle',
        entityId: String(vid),
        after: { imageId, fileKey: processed.fileKey, shotType },
      });

      return {
        id: imageId,
        public_id: publicId,
        vehicle_id: vid,
        file_key: processed.fileKey,
        width: processed.width,
        height: processed.height,
        thumbhash: processed.thumbhash,
        alt_text: altText,
        shot_type: shotType,
        is_primary: isPrimary,
        sort_order: sortOrder,
        created_at: now,
      };
    });

    return jsonOk({ image: inserted }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    if (!Number.isInteger(vid) || vid <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle ID', 400);
    }

    const body = patchImageSchema.parse(await req.json());

    withImmediateTx(({ sqlite }) => {
      if (body.action === 'set_primary') {
        sqlite.prepare('UPDATE vehicle_images SET is_primary = 0 WHERE vehicle_id = ?').run(vid);
        sqlite
          .prepare('UPDATE vehicle_images SET is_primary = 1 WHERE id = ? AND vehicle_id = ?')
          .run(body.imageId, vid);
      } else if (body.action === 'reorder') {
        const upd = sqlite.prepare(
          'UPDATE vehicle_images SET sort_order = ? WHERE id = ? AND vehicle_id = ?',
        );
        body.orderedIds.forEach((imgId, index) => {
          upd.run(index, imgId, vid);
        });
      } else if (body.action === 'update_meta') {
        sqlite
          .prepare(
            'UPDATE vehicle_images SET alt_text = ?, shot_type = ? WHERE id = ? AND vehicle_id = ?',
          )
          .run(body.altText, body.shotType, body.imageId, vid);
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: `vehicle_image.${body.action}`,
        entityType: 'vehicle',
        entityId: String(vid),
        after: body,
      });
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireStaffCapability('fleet.write');
    const { id } = await context.params;
    const vid = Number(id);
    const url = new URL(req.url);
    const imageId = Number(url.searchParams.get('imageId'));
    if (!Number.isInteger(vid) || vid <= 0 || !Number.isInteger(imageId) || imageId <= 0) {
      throw new DomainError('VALIDATION_ERROR', 'Invalid vehicle or image ID', 400);
    }

    const deletedKey = withImmediateTx(({ sqlite }) => {
      const row = sqlite
        .prepare('SELECT file_key, is_primary FROM vehicle_images WHERE id = ? AND vehicle_id = ?')
        .get(imageId, vid) as { file_key: string; is_primary: number } | undefined;
      if (!row) {
        throw new DomainError('NOT_FOUND', 'Image not found', 404);
      }

      sqlite
        .prepare('DELETE FROM vehicle_images WHERE id = ? AND vehicle_id = ?')
        .run(imageId, vid);

      if (row.is_primary === 1) {
        const nextImg = sqlite
          .prepare(
            'SELECT id FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
          )
          .get(vid) as { id: number } | undefined;
        if (nextImg) {
          sqlite.prepare('UPDATE vehicle_images SET is_primary = 1 WHERE id = ?').run(nextImg.id);
        }
      }

      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'vehicle_image.deleted',
        entityType: 'vehicle',
        entityId: String(vid),
        before: { imageId, fileKey: row.file_key },
      });

      return row.file_key;
    });

    await deleteVehicleImageFiles(deletedKey);
    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
