import { notFound } from 'next/navigation';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';

const POLICIES: Record<
  string,
  { title: string; summary: string; sections: Array<[string, string]> }
> = {
  cancellation: {
    title: 'Cancellation & Refund Policy',
    summary:
      'Transparent refunds calculated automatically from the hours remaining before scheduled pick-up.',
    sections: [
      [
        'More than 48 hours before pick-up',
        '100% of rental charges and add-ons are refunded to your original payment method within 3 to 5 working days.',
      ],
      [
        '24 to 48 hours before pick-up',
        '75% of the rental total is refunded. Refundable security deposits are always released in full.',
      ],
      [
        '6 to 24 hours before pick-up',
        '50% of the rental total is refunded automatically when you cancel from My Trips.',
      ],
      [
        'Less than 6 hours or no-show',
        'Bookings held past the 120-minute no-show grace window are released back to the fleet with no rental refund.',
      ],
    ],
  },
  damage: {
    title: 'Damage, Fuel & Deposit Rules',
    summary:
      'Every trip includes a signed checkout and check-in condition sheet so there are no surprises.',
    sections: [
      [
        'Security deposit release',
        'Clean, undamaged returns with matching fuel release the deposit hold automatically within 5 working days.',
      ],
      [
        '59-minute return grace period',
        'Returns up to 59 minutes late incur zero late fee. Beyond 59 minutes, hourly rates apply up to 3 hours, after which an extra rental day is billed.',
      ],
      [
        'Fuel & EV charge level',
        'Return with the same eighth-tank mark (or within 5% EV charge) recorded at checkout to avoid refuel service fees.',
      ],
    ],
  },
  privacy: {
    title: 'Driver KYC & Data Privacy',
    summary:
      'Your driving licence number is encrypted at rest using AES-256-GCM and stored locally.',
    sections: [
      [
        'Encrypted storage',
        'Licence numbers are never stored in plaintext and are masked as last-4 digits on routine staff screens.',
      ],
      [
        'Audited reveals',
        'Every staff inspection of your full licence number or uploaded document is logged with timestamp and reason.',
      ],
      [
        'Account export & deletion',
        'You can download a JSON copy of your profile and trip history or request account deletion from your Account page.',
      ],
    ],
  },
};

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-12 sm:px-6">
        <div className="space-y-2 border-b border-border pb-5">
          <h1 className="font-display text-h1 font-bold tracking-tight text-text-1">
            {policy.title}
          </h1>
          <p className="text-body-s text-text-2">{policy.summary}</p>
        </div>

        <div className="space-y-5">
          {policy.sections.map(([heading, body]) => (
            <section key={heading} className="space-y-1.5">
              <h2 className="text-body font-semibold text-text-1">{heading}</h2>
              <p className="text-body-s leading-relaxed text-text-2">{body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
