'use client';

import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';

export function LicenceUploadClient() {
  const router = useRouter();
  const [licenceNumber, setLicenceNumber] = useState('');
  const [issuingRegion, setIssuingRegion] = useState('KA-03');
  const [expiresOn, setExpiresOn] = useState('2035-08-20');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frontFile) {
      setError('Please select the front photo of your driving licence.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('licenceNumber', licenceNumber);
      fd.append('issuingRegion', issuingRegion);
      fd.append('expiresOn', expiresOn);
      fd.append('frontFile', frontFile);
      if (backFile) fd.append('backFile', backFile);

      const res = await fetch('/api/account/licence', {
        method: 'POST',
        body: fd,
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      router.push('/account');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-m border border-line bg-surface p-6">
      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-ink">
          <span>Driving licence number</span>
          <input
            required
            value={licenceNumber}
            onChange={(e) => setLicenceNumber(e.target.value)}
            placeholder="KA0320220012345"
            className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 font-mono text-sm"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-ink">
          <span>Issuing RTO / State</span>
          <input
            required
            value={issuingRegion}
            onChange={(e) => setIssuingRegion(e.target.value)}
            className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-ink">
          <span>Expiry date</span>
          <input
            type="date"
            required
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="h-10 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-medium text-ink">
          <span>Front photo (JPEG/PNG/WebP)</span>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-ink-muted"
          />
        </label>
        <label className="block space-y-1 text-xs font-medium text-ink">
          <span>Back photo (optional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-ink-muted"
          />
        </label>
      </div>

      <Button type="submit" disabled={submitting}>
        <Upload className="h-4 w-4" />
        {submitting ? 'Encrypting & uploading...' : 'Submit for verification'}
      </Button>
    </form>
  );
}
