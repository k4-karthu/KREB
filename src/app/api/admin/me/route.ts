import { NextResponse } from 'next/server';
import { withImmediateTx } from '@/db/client';
import { writeAudit } from '@/domain/audit/audit';
import { getServerActor } from '@/server/auth';
import { isStaffRole } from '@/server/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getServerActor();
  if (!actor || !isStaffRole(actor.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  withImmediateTx(({ sqlite }) => {
    writeAudit(sqlite, {
      actorUserId: actor.id,
      actorRole: actor.role,
      action: 'admin.session_verified',
      entityType: 'user',
      entityId: actor.id,
    });
  });
  return NextResponse.json({ actor });
}
