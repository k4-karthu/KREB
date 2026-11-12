import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { getServerActor } from '@/server/auth';
import { isStaffRole } from '@/server/permissions';
import { ThemeToggle } from './ThemeToggle';

export async function SiteHeader() {
  const actor = await getServerActor();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-h3 font-bold tracking-tight text-text-1">
            {BRAND.name}
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-body-s sm:flex">
            <Link href="/cars" className="text-text-2 hover:text-text-1 transition-colors">
              Fleet
            </Link>
            <Link href="/branches" className="text-text-2 hover:text-text-1 transition-colors">
              Branches
            </Link>
            <Link href="/trips" className="text-text-2 hover:text-text-1 transition-colors">
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
                  className="rounded-s border border-border px-3 py-1.5 text-caption font-medium text-text-1 hover:bg-surface-sunken transition-colors"
                >
                  Ops desk
                </Link>
              )}
              <Link
                href="/account"
                className="rounded-s bg-text-1 px-3 py-1.5 text-caption font-medium text-surface hover:opacity-90 transition-opacity"
              >
                {actor.name.split(' ')[0]}
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-s border border-border px-3.5 py-1.5 text-caption font-medium text-text-1 hover:bg-surface-sunken transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
