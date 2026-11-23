import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { getReadConnection } from '@/db/client';
import { getServerActor } from '@/server/auth';
import { isStaffRole } from '@/server/permissions';
import { ThemeToggle } from './ThemeToggle';

export async function SiteHeader() {
  const actor = await getServerActor();
  const { sqlite } = getReadConnection();
  const fleetCount =
    (
      sqlite
        .prepare(
          "SELECT count(*) as count FROM vehicles WHERE deleted_at IS NULL AND lifecycle = 'active'",
        )
        .get() as { count: number } | undefined
    )?.count ?? 22;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-saturate-150 transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6 md:gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-racing-green text-on-racing-green text-caption font-technical font-bold border border-racing-green-light/40 group-hover:bg-racing-green-light transition-colors">
              K
            </span>
            <span className="font-display text-h3 font-bold tracking-tight text-text-1 group-hover:text-racing-cobalt transition-colors">
              {BRAND.name}
            </span>
          </Link>
          <div className="hidden lg:inline-flex items-center gap-2 rounded-xs border border-border-subtle bg-surface-sunken px-2.5 py-1 text-label-s font-technical text-text-2 shadow-e0">
            <span className="h-1.5 w-1.5 rounded-full bg-racing-green shrink-0" />
            <span>
              {fleetCount} ACTIVE UNITS {'//'} BLR ATELIER
            </span>
          </div>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-body-s sm:flex">
            <Link
              href="/cars"
              className="font-medium text-text-2 hover:text-text-1 hover:border-b-2 hover:border-text-1 pb-0.5 transition-colors"
            >
              Fleet
            </Link>
            <Link
              href="/branches"
              className="font-medium text-text-2 hover:text-text-1 hover:border-b-2 hover:border-text-1 pb-0.5 transition-colors"
            >
              Branches
            </Link>
            <Link
              href="/policies/fuel"
              className="font-medium text-text-2 hover:text-text-1 hover:border-b-2 hover:border-text-1 pb-0.5 transition-colors"
            >
              Policies
            </Link>
            <Link
              href="/trips"
              className="font-medium text-text-2 hover:text-text-1 hover:border-b-2 hover:border-text-1 pb-0.5 transition-colors"
            >
              My trips
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {actor ? (
            <div className="flex items-center gap-2">
              {isStaffRole(actor.role) && (
                <Link
                  href="/admin"
                  className="rounded-s border border-border bg-surface px-3 py-1.5 text-caption font-medium text-text-1 hover:bg-surface-sunken hover:border-border-strong transition-all shadow-e0"
                >
                  Ops desk
                </Link>
              )}
              <Link
                href="/account"
                className="rounded-s bg-racing-green text-on-racing-green px-3 py-1.5 text-caption font-medium hover:bg-racing-green-light transition-colors shadow-e1"
              >
                {actor.name.split(' ')[0]}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-s border border-border bg-surface px-3.5 py-1.5 text-caption font-medium text-text-1 hover:bg-surface-sunken hover:border-border-strong transition-all shadow-e0"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
