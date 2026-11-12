import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const actor = await getServerActor();
  if (!actor) {
    redirect('/login?next=/account');
  }

  const { sqlite } = getReadConnection();
  const profile = sqlite
    .prepare('SELECT phone, date_of_birth, city FROM user_profiles WHERE user_id = ?')
    .get(actor.id) as
    | { phone: string | null; date_of_birth: string | null; city: string | null }
    | undefined;

  const licence = sqlite
    .prepare(
      'SELECT licence_no_last4, expires_on, status, reject_reason FROM driver_licences WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    )
    .get(actor.id) as
    | {
        licence_no_last4: string;
        expires_on: string;
        status: string;
        reject_reason: string | null;
      }
    | undefined;

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{actor.name}</h1>
          <p className="text-sm text-ink-muted">{actor.email}</p>
        </div>

        <section className="space-y-3 rounded-m border border-line bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Driving licence (KYC)</h2>
            {licence && <StatusBadge status={licence.status} />}
          </div>
          {licence ? (
            <div className="space-y-1 text-sm text-ink-muted">
              <div>
                Ending in{' '}
                <span className="font-mono font-semibold text-ink">{licence.licence_no_last4}</span>
                , expires {licence.expires_on}
              </div>
              {licence.reject_reason && (
                <p className="text-xs text-stop-600">{licence.reject_reason}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              No driving licence uploaded yet. Upload once for instant verification on future trips.
            </p>
          )}
          <Link
            href="/account/licence"
            className="inline-flex h-9 items-center rounded-s bg-ink px-4 text-xs font-medium text-surface"
          >
            {licence ? 'Update driving licence' : 'Upload driving licence'}
          </Link>
        </section>

        <section className="space-y-2 rounded-m border border-line bg-surface p-5 text-sm">
          <h2 className="text-base font-semibold text-ink">Driver profile</h2>
          <div className="grid gap-2 sm:grid-cols-3 text-xs text-ink-muted">
            <div>
              <span className="block text-ink">Phone</span>
              {profile?.phone ?? 'Not set'}
            </div>
            <div>
              <span className="block text-ink">Date of birth</span>
              {profile?.date_of_birth ?? 'Not set'}
            </div>
            <div>
              <span className="block text-ink">City</span>
              {profile?.city ?? 'Bengaluru'}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-m border border-line bg-surface p-5 text-sm">
          <div>
            <div className="font-semibold text-ink">Your personal data</div>
            <div className="text-xs text-ink-muted">
              Download a machine-readable JSON archive of your profile and trips.
            </div>
          </div>
          <a
            href="/api/account/export"
            className="inline-flex h-9 items-center rounded-s border border-line px-4 text-xs font-medium text-ink hover:bg-surface-subtle"
          >
            Download JSON export
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
