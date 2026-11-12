'use client';

import {
  CalendarRange,
  Car,
  ClipboardCheck,
  FileCheck2,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { BRAND } from '@/config/brand';
import { authClient } from '@/server/auth-client';
import type { AuthActor } from '@/server/permissions';
import { ThemeToggle } from '@/ui/components/ThemeToggle';
import { Plate } from '@/ui/primitives/Plate';

const NAV_ITEMS = [
  { href: '/admin', label: 'Today', icon: LayoutDashboard },
  { href: '/admin/timeline', label: 'Timeline', icon: CalendarRange },
  { href: '/admin/bookings', label: 'Bookings', icon: ClipboardCheck },
  { href: '/admin/fleet', label: 'Fleet', icon: Car },
  { href: '/admin/turnaround', label: 'Turnaround', icon: Sparkles },
  { href: '/admin/kyc', label: 'KYC queue', icon: FileCheck2 },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/pricing', label: 'Pricing', icon: Tag },
  { href: '/admin/finance', label: 'Finance', icon: IndianRupee },
  { href: '/admin/audit', label: 'Audit log', icon: ShieldCheck },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
] as const;

export function AdminShell({
  actor,
  children,
  onOpenCommandPalette,
}: {
  actor: AuthActor;
  children: ReactNode;
  onOpenCommandPalette?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenCommandPalette?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenCommandPalette]);

  async function signOut() {
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-paper text-petrol-800">
      {/* Desktop rail */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-stone-200 lg:bg-sheet shrink-0">
        <div className="flex h-14 items-center justify-between border-b border-stone-200 px-4">
          <Link href="/admin" className="font-display-wide text-1 text-petrol-800">
            {BRAND.name}
          </Link>
          <Plate code={actor.role} size="sm" />
        </div>
        <nav aria-label="Operations navigation" className="flex-1 overflow-y-auto p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-m px-3 py-2 text-m1 font-medium transition-colors ${
                  active ? 'bg-amber-500 text-petrol-950' : 'text-petrol-800 hover:bg-stone-200'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 p-3 space-y-2">
          <Link
            href="/staff"
            className="block rounded-m border border-stone-300 px-3 py-2 text-center text-m1 font-medium text-petrol-800 hover:bg-stone-200"
          >
            Staff handover mode
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-m px-3 py-2 text-m1 text-stone-500 hover:bg-stone-200 hover:text-petrol-800 cursor-pointer"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Sign out ({actor.name})</span>
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-64 bg-sheet border-r border-stone-200 flex flex-col">
            <div className="flex h-14 items-center justify-between border-b border-stone-200 px-4">
              <span className="font-display-wide text-1">{BRAND.name}</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-m hover:bg-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-m px-3 py-2 text-m1 font-medium ${
                      active ? 'bg-amber-500 text-petrol-950' : 'text-petrol-800 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            type="button"
            aria-label="Dismiss navigation"
            className="flex-1 bg-petrol-950/60"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-stone-200 bg-sheet px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-m border border-stone-300"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onOpenCommandPalette?.()}
              className="inline-flex h-9 items-center gap-2 rounded-m border border-stone-300 bg-paper px-3 text-m1 text-stone-500 hover:border-petrol-800 cursor-pointer"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Find booking, plate, customer (Ctrl+K)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompact((v) => !v)}
              className="hidden sm:inline-flex h-9 items-center rounded-m border border-stone-300 px-3 text-m1 text-petrol-800 hover:bg-stone-200 cursor-pointer"
            >
              Density: {compact ? 'Compact' : 'Standard'}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main
          id="main-content"
          data-density={compact ? 'compact' : 'standard'}
          className="flex-1 mx-auto w-full max-w-7xl px-4 py-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
