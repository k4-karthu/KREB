import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { getServerActor } from '@/server/auth';
import { isStaffRole } from '@/server/permissions';
import { ThemeToggle } from './ThemeToggle';

export async function SiteHeader() {
  const actor = await getServerActor();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-ink">
            {BRAND.name}
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm sm:flex">
            <Link href="/cars" className="text-ink-muted hover:text-ink">
              Fleet
            </Link>
            <Link href="/branches" className="text-ink-muted hover:text-ink">
              Branches
            </Link>
            <Link href="/trips" className="text-ink-muted hover:text-ink">
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
                  className="rounded-s border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-subtle"
                >
                  Ops desk
                </Link>
              )}
              <Link
                href="/account"
                className="rounded-s bg-ink px-3 py-1.5 text-xs font-medium text-surface hover:opacity-90"
              >
                {actor.name.split(' ')[0]}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-s border border-line px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-subtle"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
