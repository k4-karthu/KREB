import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { StatusBadge } from '@/ui/data/StatusBadge';

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
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <div className="space-y-1">
          <h1 className="font-display text-h1 font-bold tracking-tight text-text-1">
            {actor.name}
          </h1>
          <p className="text-body-s text-text-2">{actor.email}</p>
        </div>

        <section className="space-y-3 rounded-m border border-border bg-surface p-5 shadow-e1">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-semibold text-text-1">Driving licence (KYC)</h2>
            {licence && <StatusBadge status={licence.status} />}
          </div>
          {licence ? (
            <div className="space-y-1 text-body-s text-text-2">
              <div>
                Ending in{' '}
                <span className="tabular-nums font-semibold text-text-1">
                  {licence.licence_no_last4}
                </span>
                , expires {licence.expires_on}
              </div>
              {licence.reject_reason && (
                <p className="text-caption text-danger">{licence.reject_reason}</p>
              )}
            </div>
          ) : (
            <p className="text-body-s text-text-2">
              No driving licence uploaded yet. Upload once for instant verification on future trips.
            </p>
          )}
          <Link
            href="/account/licence"
            className="inline-flex h-9 items-center rounded-s bg-accent text-on-accent px-4 text-caption font-medium hover:bg-accent-hover transition-colors shadow-e1"
          >
            {licence ? 'Update driving licence' : 'Upload driving licence'}
          </Link>
        </section>

        <section className="space-y-2 rounded-m border border-border bg-surface p-5 text-body-s shadow-e1">
          <h2 className="text-body font-semibold text-text-1">Driver profile</h2>
          <div className="grid gap-2 sm:grid-cols-3 text-caption text-text-2">
            <div>
              <span className="block font-medium text-text-1">Phone</span>
              {profile?.phone ?? 'Not set'}
            </div>
            <div>
              <span className="block font-medium text-text-1">Date of birth</span>
              {profile?.date_of_birth ?? 'Not set'}
            </div>
            <div>
              <span className="block font-medium text-text-1">City</span>
              {profile?.city ?? 'Bengaluru'}
            </div>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-m border border-border bg-surface p-5 text-body-s shadow-e1">
          <div>
            <div className="font-semibold text-text-1">Your personal data</div>
            <div className="text-caption text-text-2">
              Download a machine-readable JSON archive of your profile and trips.
            </div>
          </div>
          <a
            href="/api/account/export"
            className="inline-flex h-9 items-center rounded-s border border-border px-4 text-caption font-medium text-text-1 hover:bg-surface-sunken transition-colors"
          >
            Download JSON export
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
