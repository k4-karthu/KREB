'use client';

import { CheckCircle, FileImage, ShieldCheck, UploadSimple } from '@phosphor-icons/react';
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
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-m border border-border bg-surface p-6 shadow-e1"
    >
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-s bg-accent-subtle text-accent">
          <ShieldCheck size={22} weight="bold" />
        </div>
        <div>
          <h2 className="text-body font-semibold text-text-1">Driving licence verification</h2>
          <p className="text-caption text-text-2">
            Encrypted client-side with AES-256-GCM before dispatch to verification bay
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-s border border-danger bg-danger-subtle px-3 py-2 text-caption text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1.5 text-caption font-medium text-text-1">
          <span>Licence number</span>
          <input
            required
            value={licenceNumber}
            onChange={(e) => setLicenceNumber(e.target.value)}
            placeholder="KA0320220012345"
            className="h-11 w-full rounded-s border border-border bg-surface-sunken px-3 text-body-s text-text-1 tabular-nums focus:border-accent focus:outline-none"
          />
        </label>
        <label className="space-y-1.5 text-caption font-medium text-text-1">
          <span>Issuing RTO / State</span>
          <input
            required
            value={issuingRegion}
            onChange={(e) => setIssuingRegion(e.target.value)}
            className="h-11 w-full rounded-s border border-border bg-surface-sunken px-3 text-body-s text-text-1 focus:border-accent focus:outline-none"
          />
        </label>
        <label className="space-y-1.5 text-caption font-medium text-text-1">
          <span>Expiry date</span>
          <input
            type="date"
            required
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
            className="h-11 w-full rounded-s border border-border bg-surface-sunken px-3 text-body-s text-text-1 tabular-nums focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <span className="text-caption font-medium text-text-1">Front photo (required)</span>
          <label className="flex flex-col items-center justify-center gap-2 rounded-m border border-dashed border-border-strong bg-surface-sunken p-5 text-center cursor-pointer hover:border-accent transition-colors">
            {frontFile ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle size={20} weight="fill" />
                <span className="text-caption font-medium truncate max-w-xs">{frontFile.name}</span>
              </div>
            ) : (
              <>
                <FileImage size={28} className="text-text-3" />
                <span className="text-caption text-text-2">Upload front of licence</span>
                <span className="text-caption text-text-3">JPEG, PNG, or WebP</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>

        <div className="space-y-1.5">
          <span className="text-caption font-medium text-text-1">Back photo (optional)</span>
          <label className="flex flex-col items-center justify-center gap-2 rounded-m border border-dashed border-border-strong bg-surface-sunken p-5 text-center cursor-pointer hover:border-accent transition-colors">
            {backFile ? (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle size={20} weight="fill" />
                <span className="text-caption font-medium truncate max-w-xs">{backFile.name}</span>
              </div>
            ) : (
              <>
                <FileImage size={28} className="text-text-3" />
                <span className="text-caption text-text-2">Upload back of licence</span>
                <span className="text-caption text-text-3">Optional secondary check</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBackFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={submitting}
          loading={submitting}
        >
          <UploadSimple size={16} weight="bold" />
          <span>
            {submitting ? 'Encrypting and uploading...' : 'Submit licence for verification'}
          </span>
        </Button>
      </div>
    </form>
  );
}
