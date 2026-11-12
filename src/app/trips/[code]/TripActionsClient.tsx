'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { MoneyText } from '@/ui/primitives/MoneyText';

export function TripActionsClient({
  code,
  status,
  endAt,
  refundPreviewMinor,
  refundRuleLabel,
}: {
  code: string;
  status: string;
  endAt: number;
  refundPreviewMinor: number;
  refundRuleLabel: string;
}) {
  const router = useRouter();
  const [extending, setExtending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const canCancel =
    status === 'confirmed' || status === 'pending_approval' || status === 'pending_payment';
  const canExtend = status === 'confirmed' || status === 'active';

  async function handleExtend24h() {
    setExtending(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${code}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEndAt: endAt + 86_400_000 }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not extend trip');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extend failed');
    } finally {
      setExtending(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${code}/cancel`, { method: 'POST' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Cancellation failed');
      setConfirmCancelOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/ics/${code}`}
          className="inline-flex h-10 items-center rounded-s border border-line bg-surface px-4 text-xs font-medium text-ink hover:bg-surface-subtle"
        >
          Download .ics
        </a>
        {canExtend && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={extending}
            onClick={() => void handleExtend24h()}
          >
            {extending ? 'Checking slot...' : 'Extend by +24 hours'}
          </Button>
        )}
        {canCancel && !confirmCancelOpen && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmCancelOpen(true)}
          >
            Cancel booking
          </Button>
        )}
      </div>

      {confirmCancelOpen && (
        <div className="space-y-3 rounded-s border border-stop-600 bg-stop-100 p-4 text-xs text-ink">
          <div className="font-semibold">Confirm cancellation</div>
          <p className="text-ink-muted">
            Policy matched: {refundRuleLabel}. Automatic refund:{' '}
            <MoneyText amountMinor={refundPreviewMinor} className="font-bold text-ink" />.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={cancelling}
              onClick={() => void handleCancel()}
            >
              {cancelling ? 'Cancelling...' : 'Yes, cancel booking'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmCancelOpen(false)}
            >
              Keep booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
