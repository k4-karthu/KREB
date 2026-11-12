'use client';

import { Check, Eye, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

export interface KycRow {
  id: number;
  user_id: string;
  licence_no_last4: string;
  issuing_region: string | null;
  expires_on: string;
  status: string;
  reject_reason: string | null;
  driver_name: string;
  driver_email: string;
  frontUrl: string;
  backUrl: string | null;
}

export function KycClient({
  licences,
  canReview,
  canReveal,
}: {
  licences: KycRow[];
  canReview: boolean;
  canReveal: boolean;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('Blurry image or cropped expiry date');
  const [error, setError] = useState<string | null>(null);

  async function postKyc(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch('/api/admin/kyc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { licenceNumber?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? 'KYC action failed');
      return null;
    }
    return data;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Driver licence KYC queue
        </h1>
        <p className="text-sm text-ink-muted">
          Licence numbers are masked by default. Revealing a full licence number writes an immutable
          audit entry.
        </p>
      </div>

      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {licences.map((l) => (
          <div
            key={l.id}
            className="grid gap-4 rounded-m border border-line bg-surface p-5 md:grid-cols-[1fr_240px]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-ink">{l.driver_name}</span>
                <span className="text-xs text-ink-muted">{l.driver_email}</span>
                <StatusBadge status={l.status} />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
                <span>
                  Licence:{' '}
                  <span className="font-mono font-semibold text-ink">
                    {revealed[l.id] ? revealed[l.id] : `****${l.licence_no_last4}`}
                  </span>
                </span>
                <span>RTO: {l.issuing_region ?? 'KA'}</span>
                <span>Expires: {l.expires_on}</span>
                {canReveal && !revealed[l.id] && (
                  <button
                    type="button"
                    onClick={async () => {
                      const data = await postKyc({
                        action: 'reveal',
                        licenceId: l.id,
                        reason: 'Manual verification during KYC review',
                      });
                      if (data?.licenceNumber) {
                        setRevealed((prev) => ({ ...prev, [l.id]: data.licenceNumber as string }));
                      }
                    }}
                    className="inline-flex items-center gap-1 text-petrol-700 hover:underline"
                  >
                    <Eye className="h-3.5 w-3.5" /> Reveal full number
                  </button>
                )}
              </div>

              {l.reject_reason && (
                <p className="text-xs text-stop-600">Rejection reason: {l.reject_reason}</p>
              )}

              {canReview && l.status === 'pending' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const res = await postKyc({ action: 'approve', licenceId: l.id });
                      if (res) router.refresh();
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => setRejectId(rejectId === l.id ? null : l.id)}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              )}

              {rejectId === l.id && (
                <div className="flex gap-2 pt-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="h-9 flex-1 rounded-s border border-line bg-surface-subtle px-3 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      const res = await postKyc({
                        action: 'reject',
                        licenceId: l.id,
                        reason: rejectReason,
                      });
                      if (res) {
                        setRejectId(null);
                        router.refresh();
                      }
                    }}
                  >
                    Confirm reject
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-s border border-line bg-surface-subtle">
              <img
                src={l.frontUrl}
                alt={`Driving licence front for ${l.driver_name}`}
                className="h-36 w-full object-cover"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
