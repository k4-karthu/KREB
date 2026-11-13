import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import type { QuoteLineItem } from '@/domain/pricing/pricing';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { EmptyState } from '@/ui/data/EmptyState';
import { CheckoutClient } from './CheckoutClient';

export const dynamic = 'force-dynamic';

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
        SELECT q.*, v.make, v.model, v.year, v.plate, v.paint_hex, v.category, b.name AS branch_name
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
            category: string;
            branch_name: string;
          }
        | undefined)
    : undefined;

  if (!quote || quote.expires_at < Date.now()) {
    return (
      <div className="min-h-screen flex flex-col bg-canvas text-text-1">
        <SiteHeader />
        <main className="mx-auto max-w-xl flex-1 px-4 py-20 flex items-center justify-center">
          <EmptyState
            iconName="receipt"
            heading="Quote not found or expired"
            description="Signed price quotes remain valid for 15 minutes. Pick your rental dates again in our vehicle catalog to lock a fresh quote."
            action={
              <Link
                href="/cars"
                className="inline-flex h-10 items-center justify-center rounded-s bg-accent px-5 text-label-s font-semibold text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
              >
                Browse available fleet
              </Link>
            }
          />
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
        .prepare(
          'SELECT status, licence_no_last4 FROM driver_licences WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        )
        .get(actor.id) as { status: string; licence_no_last4?: string } | undefined)
    : undefined;

  const lines = JSON.parse(quote.lines_json) as QuoteLineItem[];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="flex-1">
        <CheckoutClient
          quotePublicId={quote.public_id}
          vehicleTitle={`${quote.year} ${quote.make} ${quote.model}`}
          category={quote.category}
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
          licenceLast4={licence?.licence_no_last4 ?? null}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
