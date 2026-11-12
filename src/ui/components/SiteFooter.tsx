import Link from 'next/link';
import { BRAND } from '@/config/brand';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface-subtle">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <div className="font-display text-lg font-bold text-ink">{BRAND.name}</div>
          <p className="max-w-xs text-sm text-ink-muted">{BRAND.tagline}</p>
          <p className="text-xs text-ink-muted">
            {BRAND.supportPhone} | {BRAND.supportEmail}
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="font-semibold text-ink">Pickup hubs</div>
          <ul className="space-y-1.5 text-ink-muted">
            <li>
              <Link href="/branches#indiranagar-hub" className="hover:text-ink">
                Indiranagar 100ft Road
              </Link>
            </li>
            <li>
              <Link href="/branches#kempegowda-airport-blr" className="hover:text-ink">
                Kempegowda Airport (BLR)
              </Link>
            </li>
            <li>
              <Link href="/branches#whitefield-tech-corridor" className="hover:text-ink">
                Whitefield Tech Corridor
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <div className="font-semibold text-ink">Policies & Desk</div>
          <ul className="space-y-1.5 text-ink-muted">
            <li>
              <Link href="/policies/cancellation" className="hover:text-ink">
                Cancellation & refunds
              </Link>
            </li>
            <li>
              <Link href="/policies/damage" className="hover:text-ink">
                Damage, fuel & deposit rules
              </Link>
            </li>
            <li>
              <Link href="/policies/privacy" className="hover:text-ink">
                Driver KYC & privacy
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-ink">
                Staff operations login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-muted">
        {BRAND.legalName} — {BRAND.defaultCity}
      </div>
    </footer>
  );
}
