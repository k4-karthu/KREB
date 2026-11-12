'use client';

import {
  ArrowSquareOut,
  ArrowsClockwise,
  CalendarBlank,
  Car,
  CaretRight,
  CurrencyInr,
  Gear,
  IdentificationCard,
  List,
  MagnifyingGlass,
  Receipt,
  ShieldCheck,
  SignOut,
  SquaresFour,
  Tag,
  Users,
  Wrench,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { BRAND } from '@/config/brand';
import { authClient } from '@/server/auth-client';
import type { AuthActor } from '@/server/permissions';
import { ThemeToggle } from '@/ui/components/ThemeToggle';
import { Plate } from '@/ui/data/Plate';
import { CommandPalette, type CommandPaletteAction } from '@/ui/overlays/CommandPalette';

interface NavItem {
  href: string;
  label: string;
  // biome-ignore lint/suspicious/noExplicitAny: Phosphor Icon component
  icon: any;
  matchPrefix?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Today Overview', icon: SquaresFour, matchPrefix: false },
  { href: '/admin/timeline', label: 'Timeline', icon: CalendarBlank, matchPrefix: true },
  { href: '/admin/bookings', label: 'Bookings Desk', icon: Receipt, matchPrefix: true },
  { href: '/admin/fleet', label: 'Fleet Inventory', icon: Car, matchPrefix: true },
  { href: '/admin/turnaround', label: 'Bay Turnaround', icon: ArrowsClockwise, matchPrefix: true },
  { href: '/admin/kyc', label: 'KYC Queue', icon: IdentificationCard, matchPrefix: true },
  { href: '/admin/customers', label: 'Customers', icon: Users, matchPrefix: true },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench, matchPrefix: true },
  { href: '/admin/pricing', label: 'Pricing & Rules', icon: Tag, matchPrefix: true },
  { href: '/admin/finance', label: 'Finance & Ledger', icon: CurrencyInr, matchPrefix: true },
  { href: '/admin/audit', label: 'Audit Trail', icon: ShieldCheck, matchPrefix: true },
  { href: '/admin/settings', label: 'Policy Settings', icon: Gear, matchPrefix: true },
];

const ROUTE_NAME_MAP: Record<string, string> = {
  admin: 'Operations Desk',
  timeline: 'Fleet Timeline',
  bookings: 'Bookings Desk',
  fleet: 'Fleet Inventory',
  turnaround: 'Bay Turnaround',
  kyc: 'KYC Queue',
  customers: 'Customers Directory',
  maintenance: 'Maintenance Logs',
  pricing: 'Pricing & Addons',
  finance: 'Finance & Ledger',
  audit: 'Audit Trail',
  settings: 'Policy Settings',
};

export interface AdminShellProps {
  actor: AuthActor;
  children: ReactNode;
  onOpenCommandPalette?: () => void;
}

export function AdminShell({ actor, children, onOpenCommandPalette }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  async function handleSignOut() {
    await authClient.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  // Derive breadcrumbs from path segments
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: Array<{ label: string; href: string }> = [];

    let currentHref = '';
    for (const seg of segments) {
      if (!seg) continue;
      currentHref += `/${seg}`;
      const mapped = ROUTE_NAME_MAP[seg];
      if (mapped) {
        crumbs.push({ label: mapped, href: currentHref });
      } else if (!Number.isNaN(Number(seg))) {
        crumbs.push({ label: `#${seg}`, href: currentHref });
      } else {
        crumbs.push({ label: seg, href: currentHref });
      }
    }

    if (crumbs.length === 0) {
      crumbs.push({ label: 'Operations Desk', href: '/admin' });
    }
    return crumbs;
  }, [pathname]);

  // Command Palette Actions
  const commandActions: CommandPaletteAction[] = useMemo(() => {
    const navActions: CommandPaletteAction[] = NAV_ITEMS.map((item) => {
      const IconComponent = item.icon;
      return {
        id: `nav-${item.href}`,
        label: `Go to ${item.label}`,
        group: 'Navigation',
        icon: <IconComponent size={18} weight="duotone" className="text-text-2" />,
        onSelect: () => router.push(item.href),
      };
    });

    const actionItems: CommandPaletteAction[] = [
      {
        id: 'action-staff',
        label: 'Switch to Staff Bay Handover Mode',
        group: 'Operations',
        icon: <ArrowSquareOut size={18} weight="bold" className="text-accent" />,
        shortcut: 'Shift+S',
        onSelect: () => router.push('/staff'),
      },
      {
        id: 'action-signout',
        label: `Sign Out (${actor.name})`,
        group: 'System',
        icon: <SignOut size={18} weight="bold" className="text-danger" />,
        onSelect: () => void handleSignOut(),
      },
    ];

    return [...navActions, ...actionItems];
  }, [router, actor.name]);

  const handleOpenCommand = () => {
    setCommandOpen(true);
    onOpenCommandPalette?.();
  };

  return (
    <div className="min-h-screen flex bg-canvas text-text-1">
      {/* Command Palette Overlay */}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        actions={commandActions}
        placeholder="Type a destination or action (Cmd+K)..."
      />

      {/* Desktop Left Rail */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface shrink-0">
        {/* Brand & Actor Role Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link
            href="/admin"
            className="font-display font-bold tracking-tight text-text-1 hover:text-accent transition-colors"
          >
            {BRAND.name}{' '}
            <span className="text-caption text-text-3  font-sans font-medium">Desk</span>
          </Link>
          <Plate code={actor.role} size="sm" />
        </div>

        {/* Navigation list */}
        <nav aria-label="Operations navigation" className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.matchPrefix
              ? pathname.startsWith(item.href)
              : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xs px-3 py-2 text-body-s font-medium transition-colors ${
                  active
                    ? 'bg-accent-subtle text-accent font-semibold'
                    : 'text-text-2 hover:bg-surface-sunken hover:text-text-1'
                }`}
              >
                <Icon
                  size={18}
                  weight={active ? 'fill' : 'regular'}
                  className={`shrink-0 ${active ? 'text-accent' : 'text-text-3'}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Rail Actions */}
        <div className="border-t border-border p-3 space-y-2">
          <Link
            href="/staff"
            className="flex items-center justify-center gap-2 rounded-xs border border-border bg-surface-sunken px-3 py-2 text-center text-body-s font-medium text-text-1 hover:bg-surface-raised hover:border-border-strong transition-colors"
          >
            <ArrowSquareOut size={16} weight="bold" />
            <span>Staff Handover Mode</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-xs px-3 py-2 text-body-s text-text-3 hover:bg-surface-sunken hover:text-danger cursor-pointer transition-colors"
          >
            <SignOut size={16} weight="bold" aria-hidden="true" />
            <span className="truncate">Sign out ({actor.name})</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 bg-surface border-r border-border flex flex-col z-10 shadow-e3">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-display font-bold text-text-1">{BRAND.name} Desk</span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-xs text-text-2 hover:bg-surface-sunken hover:text-text-1 cursor-pointer transition-colors"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = item.matchPrefix
                  ? pathname.startsWith(item.href)
                  : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xs px-3 py-2.5 text-body-s font-medium transition-colors ${
                      active
                        ? 'bg-accent-subtle text-accent font-semibold'
                        : 'text-text-2 hover:bg-surface-sunken hover:text-text-1'
                    }`}
                  >
                    <Icon
                      size={20}
                      weight={active ? 'fill' : 'regular'}
                      className={active ? 'text-accent' : 'text-text-3'}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-3 space-y-2">
              <Link
                href="/staff"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xs border border-border bg-surface-sunken px-3 py-2 text-body-s font-medium text-text-1 hover:bg-surface-raised"
              >
                <ArrowSquareOut size={16} weight="bold" />
                <span>Staff Handover Mode</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xs px-3 py-2 text-body-s text-text-3 hover:text-danger cursor-pointer"
              >
                <SignOut size={16} weight="bold" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss navigation overlay"
            className="flex-1 bg-[rgb(var(--shadow-ink)/0.6)] cursor-pointer"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Rail with Breadcrumbs and Quick Search */}
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 lg:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xs border border-border text-text-2 hover:bg-surface-sunken hover:text-text-1 cursor-pointer transition-colors"
            >
              <List size={20} weight="bold" />
            </button>

            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumbs"
              className="hidden sm:flex items-center gap-1.5 text-body-s text-text-3 truncate"
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <div key={crumb.href} className="flex items-center gap-1.5 truncate">
                    {idx > 0 && <CaretRight size={12} className="text-text-3 shrink-0" />}
                    {isLast ? (
                      <span className="font-semibold text-text-1 truncate">{crumb.label}</span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-text-3 hover:text-text-1 hover:underline transition-colors truncate"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Quick Actions & Utility Controls */}
          <div className="flex items-center gap-2.5">
            {/* Search / CommandPalette Trigger */}
            <button
              type="button"
              onClick={handleOpenCommand}
              className="inline-flex h-9 items-center gap-2 rounded-xs border border-border bg-surface-sunken px-3 text-body-s text-text-3 hover:border-border-strong hover:text-text-1 cursor-pointer transition-colors shadow-e0"
            >
              <MagnifyingGlass size={16} className="text-text-3 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Search desk...</span>
              <kbd className="hidden md:inline-flex items-center rounded-2xs border border-border bg-surface px-1.5 py-0.5 text-label-s text-text-3 tabular-nums">
                ⌘K
              </kbd>
            </button>

            {/* Density switch */}
            <button
              type="button"
              onClick={() => setCompact((v) => !v)}
              className="hidden md:inline-flex h-9 items-center rounded-xs border border-border px-2.5 text-label-s font-medium text-text-2 hover:bg-surface-sunken hover:text-text-1 cursor-pointer transition-colors"
            >
              {compact ? 'Compact view' : 'Standard view'}
            </button>

            {/* Dark / Light Mode Switch */}
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Work Area */}
        <main
          id="main-content"
          data-density={compact ? 'compact' : 'standard'}
          className={`flex-1 mx-auto w-full max-w-7xl px-4 lg:px-6 ${
            compact ? 'py-4 space-y-4' : 'py-6 space-y-6'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
