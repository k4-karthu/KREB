import Link from 'next/link';
import { BRAND } from '@/config/brand';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-sunken">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <div className="space-y-2">
          <div className="font-display text-body-l font-bold text-text-1">{BRAND.name}</div>
          <p className="max-w-xs text-body-s text-text-2">{BRAND.tagline}</p>
          <p className="text-caption text-text-2">
            {BRAND.supportPhone} | {BRAND.supportEmail}
          </p>
        </div>

        <div className="space-y-2 text-body-s">
          <div className="font-semibold text-text-1">Pickup hubs</div>
          <ul className="space-y-1.5 text-text-2">
            <li>
              <Link
                href="/branches#indiranagar-hub"
                className="hover:text-text-1 transition-colors"
              >
                Indiranagar 100ft Road
              </Link>
            </li>
            <li>
              <Link
                href="/branches#kempegowda-airport-blr"
                className="hover:text-text-1 transition-colors"
              >
                Kempegowda Airport (BLR)
              </Link>
            </li>
            <li>
              <Link
                href="/branches#whitefield-tech-corridor"
                className="hover:text-text-1 transition-colors"
              >
                Whitefield Tech Corridor
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-2 text-body-s">
          <div className="font-semibold text-text-1">Policies & Desk</div>
          <ul className="space-y-1.5 text-text-2">
            <li>
              <Link href="/policies/cancellation" className="hover:text-text-1 transition-colors">
                Cancellation & refunds
              </Link>
            </li>
            <li>
              <Link href="/policies/damage" className="hover:text-text-1 transition-colors">
                Damage, fuel & deposit rules
              </Link>
            </li>
            <li>
              <Link href="/policies/privacy" className="hover:text-text-1 transition-colors">
                Driver KYC & privacy
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-text-1 transition-colors">
                Staff operations login
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-caption text-text-2">
        {BRAND.legalName} — {BRAND.defaultCity}
      </div>
    </footer>
  );
}
