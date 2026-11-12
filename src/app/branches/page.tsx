import { getReadConnection } from '@/db/client';
import { formatMinutesAsClock } from '@/domain/shared/time';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { MoneyText } from '@/ui/primitives/MoneyText';

export const dynamic = 'force-dynamic';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function BranchesPage() {
  const { sqlite } = getReadConnection();
  const branches = sqlite
    .prepare('SELECT * FROM branches WHERE deleted_at IS NULL AND is_active = 1 ORDER BY id ASC')
    .all() as Array<{
    id: number;
    slug: string;
    name: string;
    city: string;
    address: string;
    phone: string | null;
    email: string | null;
    allows_after_hours: number;
    after_hours_fee_minor: number;
  }>;

  const hoursRows = sqlite
    .prepare(
      'SELECT branch_id, weekday, opens_minute, closes_minute FROM branch_hours ORDER BY weekday ASC',
    )
    .all() as Array<{
    branch_id: number;
    weekday: number;
    opens_minute: number;
    closes_minute: number;
  }>;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Bengaluru pick-up & return hubs
          </h1>
          <p className="text-sm text-ink-muted">
            Walk-up handover bays with dedicated inspection lighting and after-hours lockboxes at
            BLR Airport.
          </p>
        </div>

        <div className="space-y-6">
          {branches.map((b) => {
            const hrs = hoursRows.filter((h) => h.branch_id === b.id);
            return (
              <section
                key={b.id}
                id={b.slug}
                className="rounded-m border border-line bg-surface p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-ink">{b.name}</h2>
                    <p className="text-sm text-ink-muted">{b.address}</p>
                  </div>
                  {b.allows_after_hours === 1 && (
                    <span className="rounded-s border border-go-600 bg-go-100 px-3 py-1 text-xs font-medium text-petrol-800">
                      After-hours fee: <MoneyText amountMinor={b.after_hours_fee_minor} />
                    </span>
                  )}
                </div>

                <div className="grid gap-2 text-xs sm:grid-cols-7">
                  {hrs.map((h) => (
                    <div
                      key={h.weekday}
                      className="rounded-s border border-line bg-surface-subtle p-2 text-center"
                    >
                      <div className="font-semibold text-ink">{WEEKDAYS[h.weekday]}</div>
                      <div className="mt-0.5 tabular-nums text-ink-muted">
                        {formatMinutesAsClock(h.opens_minute)} -{' '}
                        {formatMinutesAsClock(h.closes_minute)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
