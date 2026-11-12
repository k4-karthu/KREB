import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { can } from '@/server/permissions';
import { PricingClient } from './PricingClient';

export default async function AdminPricingPage() {
  const actor = await requireStaffPage('pricing.read');
  const { sqlite } = getReadConnection();

  const ratePlans = sqlite
    .prepare('SELECT id, name, base_daily_minor, is_active FROM rate_plans ORDER BY id ASC')
    .all() as React.ComponentProps<typeof PricingClient>['ratePlans'];
  const rules = sqlite
    .prepare(
      'SELECT id, kind, label, multiplier_bp, flat_add_minor, is_active FROM pricing_rules ORDER BY priority ASC',
    )
    .all() as React.ComponentProps<typeof PricingClient>['rules'];
  const addons = sqlite
    .prepare(
      'SELECT id, name, price_type, price_minor, max_qty, is_active FROM addons WHERE deleted_at IS NULL ORDER BY id ASC',
    )
    .all() as React.ComponentProps<typeof PricingClient>['addons'];
  const promoCodes = sqlite
    .prepare(
      'SELECT id, code, kind, value, min_days, used_count, max_uses, is_active FROM promo_codes ORDER BY id DESC',
    )
    .all() as React.ComponentProps<typeof PricingClient>['promoCodes'];

  return (
    <PricingClient
      ratePlans={ratePlans}
      rules={rules}
      addons={addons}
      promoCodes={promoCodes}
      canEdit={can(actor, 'pricing.write')}
    />
  );
}
