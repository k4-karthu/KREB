import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import type { QuoteLineItem } from '@/domain/pricing/pricing';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { CheckoutClient } from './CheckoutClient';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const quoteId = typeof sp.quote === 'string' ? sp.quote : '';
  const { sqlite } = getReadConnection();
  const actor = await getServerActor();

  const quote = quoteId
    ? (sqlite
        .prepare(
          `
        SELECT q.*, v.make, v.model, v.year, v.plate, v.paint_hex, b.name AS branch_name
        FROM quotes q
        JOIN vehicles v ON v.id = q.vehicle_id
        JOIN branches b ON b.id = q.pickup_branch_id
        WHERE q.public_id = ?
      `,
        )
        .get(quoteId) as
        | {
            public_id: string;
            start_at: number;
            end_at: number;
            lines_json: string;
            total_minor: number;
            deposit_minor: number;
            expires_at: number;
            make: string;
            model: string;
            year: number;
            plate: string;
            paint_hex: string;
            branch_name: string;
          }
        | undefined)
    : undefined;

  if (!quote || quote.expires_at < Date.now()) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas text-ink">
        <SiteHeader />
        <main className="mx-auto max-w-xl flex-1 px-4 py-16 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-ink">Quote not found or expired</h1>
          <p className="text-sm text-ink-muted">
            Signed price quotes are valid for 15 minutes. Pick your dates again to lock a fresh
            quote.
          </p>
          <Link
            href="/cars"
            className="inline-flex h-10 items-center rounded-s bg-ink px-5 text-sm font-medium text-surface"
          >
            Browse available fleet
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const profile = actor
    ? ((sqlite
        .prepare('SELECT phone, date_of_birth AS dateOfBirth FROM user_profiles WHERE user_id = ?')
        .get(actor.id) as { phone: string | null; dateOfBirth: string | null } | undefined) ?? null)
    : null;

  const licence = actor
    ? (sqlite
        .prepare('SELECT status FROM driver_licences WHERE user_id = ? ORDER BY id DESC LIMIT 1')
        .get(actor.id) as { status: string } | undefined)
    : undefined;

  const lines = JSON.parse(quote.lines_json) as QuoteLineItem[];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="flex-1">
        <CheckoutClient
          quotePublicId={quote.public_id}
          vehicleTitle={`${quote.year} ${quote.make} ${quote.model}`}
          plate={quote.plate}
          paintHex={quote.paint_hex}
          branchName={quote.branch_name}
          startAt={quote.start_at}
          endAt={quote.end_at}
          totalMinor={quote.total_minor}
          depositMinor={quote.deposit_minor}
          lines={lines}
          actor={actor ? { id: actor.id, name: actor.name, email: actor.email } : null}
          profile={profile}
          licenceStatus={licence?.status ?? null}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
