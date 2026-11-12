import { z } from 'zod';
import { getReadConnection, withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { transitionBooking } from '@/domain/booking/state-machine';
import { DomainError } from '@/domain/shared/errors';
import { requireStaffCapability } from '@/server/auth';
import { decryptLicenceNumber } from '@/server/crypto-licence';
import { signPrivateFileUrl } from '@/server/files';
import { handleApiError, jsonOk } from '@/server/http';

const kycActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    licenceId: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('reject'),
    licenceId: z.number().int().positive(),
    reason: z.string().min(3).max(240),
  }),
  z.object({
    action: z.literal('reveal'),
    licenceId: z.number().int().positive(),
    reason: z.string().min(3).max(200),
  }),
]);

export async function GET() {
  try {
    await requireStaffCapability('kyc.review');
    const { sqlite } = getReadConnection();
    const licences = sqlite
      .prepare(
        `
      SELECT dl.id, dl.user_id, dl.licence_no_last4, dl.issuing_region, dl.expires_on,
             dl.front_file_key, dl.back_file_key, dl.status, dl.reject_reason, dl.created_at,
             u.name AS driver_name, u.email AS driver_email
      FROM driver_licences dl
      JOIN user u ON u.id = dl.user_id
      ORDER BY CASE WHEN dl.status = 'pending' THEN 0 ELSE 1 END, dl.created_at DESC
      LIMIT 60
    `,
      )
      .all() as Array<{
      id: number;
      user_id: string;
      licence_no_last4: string;
      issuing_region: string | null;
      expires_on: string;
      front_file_key: string;
      back_file_key: string | null;
      status: string;
      reject_reason: string | null;
      created_at: number;
      driver_name: string;
      driver_email: string;
    }>;

    const withUrls = licences.map((l) => ({
      ...l,
      frontUrl: signPrivateFileUrl(l.front_file_key),
      backUrl: l.back_file_key ? signPrivateFileUrl(l.back_file_key) : null,
    }));

    return jsonOk({ licences: withUrls });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = kycActionSchema.parse(await req.json());
    const now = Date.now();

    if (body.action === 'reveal') {
      const actor = await requireStaffCapability('licence.reveal');
      const plain = withImmediateTx(({ sqlite }) => {
        const row = sqlite
          .prepare('SELECT licence_no_enc, key_version, user_id FROM driver_licences WHERE id = ?')
          .get(body.licenceId) as
          | { licence_no_enc: Buffer; key_version: number; user_id: string }
          | undefined;
        if (!row) throw new DomainError('NOT_FOUND', 'Licence not found', 404);

        const decrypted = decryptLicenceNumber(row.licence_no_enc, row.key_version);
        writeAudit(sqlite, {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'licence.revealed',
          entityType: 'driver_licence',
          entityId: String(body.licenceId),
          after: { userId: row.user_id, reason: body.reason },
        });
        return decrypted;
      });
      return jsonOk({ licenceNumber: plain });
    }

    const actor = await requireStaffCapability('kyc.review');
    withImmediateTx(({ sqlite }) => {
      const row = sqlite
        .prepare('SELECT id, user_id, status FROM driver_licences WHERE id = ?')
        .get(body.licenceId) as { id: number; user_id: string; status: string } | undefined;
      if (!row) throw new DomainError('NOT_FOUND', 'Licence not found', 404);

      if (body.action === 'approve') {
        sqlite
          .prepare(
            "UPDATE driver_licences SET status = 'verified', reviewed_by = ?, reviewed_at = ?, reject_reason = NULL WHERE id = ?",
          )
          .run(actor.id, now, body.licenceId);

        // Auto-confirm any pending_approval bookings for this driver
        const pendingBookings = sqlite
          .prepare("SELECT id FROM bookings WHERE user_id = ? AND status = 'pending_approval'")
          .all(row.user_id) as Array<{ id: number }>;
        for (const pb of pendingBookings) {
          transitionBooking(sqlite, {
            bookingId: pb.id,
            toStatus: 'confirmed',
            actorKind: 'staff',
            actorUserId: actor.id,
            actorRole: actor.role,
            reason: 'Driver KYC approved',
          });
        }

        writeAudit(sqlite, {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'licence.approved',
          entityType: 'driver_licence',
          entityId: String(body.licenceId),
          before: { status: row.status },
          after: { status: 'verified' },
        });
      } else {
        sqlite
          .prepare(
            "UPDATE driver_licences SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reject_reason = ? WHERE id = ?",
          )
          .run(actor.id, now, body.reason, body.licenceId);

        writeAudit(sqlite, {
          actorUserId: actor.id,
          actorRole: actor.role,
          action: 'licence.rejected',
          entityType: 'driver_licence',
          entityId: String(body.licenceId),
          before: { status: row.status },
          after: { status: 'rejected', reason: body.reason },
        });
      }
    });

    return jsonOk({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
