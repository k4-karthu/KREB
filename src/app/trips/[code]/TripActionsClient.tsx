'use client';

import { CalendarPlus, ClockCountdown, XCircle } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Price } from '@/ui/data/Price';
import { Button } from '@/ui/primitives/Button';

export interface TripActionsClientProps {
  code: string;
  status: string;
  endAt: number;
  refundPreviewMinor: number;
  refundRuleLabel: string;
}

export function TripActionsClient({
  code,
  status,
  endAt,
  refundPreviewMinor,
  refundRuleLabel,
}: TripActionsClientProps) {
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
        <div
          role="alert"
          className="rounded-s border border-danger/30 bg-danger-subtle p-3 text-body-s font-medium text-danger"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/api/ics/${code}`}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-s border border-border bg-surface px-4 text-label-s font-medium text-text-1 transition-colors hover:bg-surface-sunken cursor-pointer"
        >
          <CalendarPlus size={16} weight="bold" />
          <span>Calendar (.ics)</span>
        </a>

        {canExtend && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={extending}
            onClick={() => void handleExtend24h()}
          >
            <ClockCountdown size={16} weight="bold" />
            <span>{extending ? 'Checking schedule...' : 'Extend rental by 24 hours'}</span>
          </Button>
        )}

        {canCancel && !confirmCancelOpen && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setConfirmCancelOpen(true)}
          >
            <XCircle size={16} weight="bold" />
            <span>Cancel reservation</span>
          </Button>
        )}
      </div>

      {confirmCancelOpen && (
        <div className="space-y-3 rounded-m border border-danger/30 bg-danger-subtle/40 p-5 text-body-s">
          <h4 className="font-display text-body font-bold text-text-1">Confirm cancellation</h4>
          <p className="text-text-2">
            Policy applied: {refundRuleLabel}. Calculated refund amount:{' '}
            <Price amountMinor={refundPreviewMinor} size="sm" />.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={cancelling}
              onClick={() => void handleCancel()}
            >
              {cancelling ? 'Cancelling...' : 'Confirm cancellation'}
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
