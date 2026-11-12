import { getReadConnection } from '@/db/client';
import { loadRentalSettings } from '@/domain/shared/settings-repo';
import { requireStaffPage } from '@/server/auth';
import { can } from '@/server/permissions';
import { SettingsClient } from './SettingsClient';

export default async function AdminSettingsPage() {
  const actor = await requireStaffPage('settings.manage');
  const { sqlite } = getReadConnection();
  const settings = loadRentalSettings(sqlite);

  return <SettingsClient initialSettings={settings} canEdit={can(actor, 'settings.manage')} />;
}
