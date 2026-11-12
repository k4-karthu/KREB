import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { DomainError } from '@/domain/shared/errors';
import { requireCustomerOrStaff } from '@/server/auth';
import { encryptLicenceNumber } from '@/server/crypto-licence';
import { savePrivateFile } from '@/server/files';
import { handleApiError, jsonOk } from '@/server/http';

export async function POST(req: Request) {
  try {
    const actor = await requireCustomerOrStaff();
    const form = await req.formData();

    const licenceNo = String(form.get('licenceNumber') ?? '')
      .trim()
      .toUpperCase();
    const issuingRegion = String(form.get('issuingRegion') ?? '').trim();
    const expiresOn = String(form.get('expiresOn') ?? '').trim();
    const frontFile = form.get('frontFile');
    const backFile = form.get('backFile');

    if (licenceNo.length < 6 || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Please enter a valid driving licence number and expiry date.',
        400,
      );
    }
    if (!(frontFile instanceof File)) {
      throw new DomainError(
        'VALIDATION_ERROR',
        'Please upload the front image of your driving licence.',
        400,
      );
    }

    const frontKey = await savePrivateFile(Buffer.from(await frontFile.arrayBuffer()), 'licences');
    const backKey =
      backFile instanceof File && backFile.size > 0
        ? await savePrivateFile(Buffer.from(await backFile.arrayBuffer()), 'licences')
        : null;

    const enc = encryptLicenceNumber(licenceNo);
    const now = Date.now();

    const licenceId = withImmediateTx(({ sqlite }) => {
      const res = sqlite
        .prepare(
          `
        INSERT INTO driver_licences (
          user_id, licence_no_enc, licence_no_last4, key_version,
          issuing_region, expires_on, front_file_key, back_file_key, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `,
        )
        .run(
          actor.id,
          enc.ciphertext,
          enc.last4,
          enc.keyVersion,
          issuingRegion || 'KA',
          expiresOn,
          frontKey,
          backKey,
          now,
        );

      const id = Number(res.lastInsertRowid);
      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'licence.submitted',
        entityType: 'driver_licence',
        entityId: String(id),
        after: { last4: enc.last4, expiresOn },
      });
      return id;
    });

    return jsonOk({ id: licenceId, status: 'pending', last4: enc.last4 }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
