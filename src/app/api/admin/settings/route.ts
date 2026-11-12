import { RentalSettingsSchema } from '@/config/settings';
import { getReadConnection, withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { loadRentalSettings, saveRentalSettings } from '@/domain/shared/settings-repo';
import { requireStaffCapability } from '@/server/auth';
import { handleApiError, jsonOk } from '@/server/http';

export async function GET() {
  try {
    await requireStaffCapability('settings.manage');
    const { sqlite } = getReadConnection();
    const settings = loadRentalSettings(sqlite);
    return jsonOk({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireStaffCapability('settings.manage');
    const next = RentalSettingsSchema.parse(await req.json());

    withImmediateTx(({ sqlite }) => {
      const before = loadRentalSettings(sqlite);
      saveRentalSettings(sqlite, next, actor.id);
      writeAudit(sqlite, {
        actorUserId: actor.id,
        actorRole: actor.role,
        action: 'settings.updated',
        entityType: 'settings',
        entityId: 'rental_settings',
        before,
        after: next,
      });
    });

    return jsonOk({ ok: true, settings: next });
  } catch (err) {
    return handleApiError(err);
  }
}
