import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerActor } from '@/server/auth';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { LicenceUploadClient } from './LicenceUploadClient';

export default async function AccountLicencePage() {
  const actor = await getServerActor();
  if (!actor) {
    redirect('/login?next=/account/licence');
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10 sm:px-6">
        <Link href="/account" className="text-xs font-medium text-ink-muted hover:text-ink">
          Back to account
        </Link>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-ink">Upload your driving licence</h1>
          <p className="text-sm text-ink-muted">
            Your licence number is encrypted with AES-256-GCM and masked on staff desks.
          </p>
        </div>
        <LicenceUploadClient />
      </main>
      <SiteFooter />
    </div>
  );
}
