'use client';

import { ArrowRight, Calendar, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';

export interface BranchChoice {
  id: number;
  name: string;
  city: string;
}

function toLocalInputValue(ms: number): string {
  const d = new Date(ms + 330 * 60_000);
  return d.toISOString().slice(0, 16);
}

function fromLocalInputValue(val: string): number {
  const [datePart, timePart] = val.split('T');
  if (!datePart || !timePart) return Date.now() + 86_400_000;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined) return Date.now() + 86_400_000;
  return Date.UTC(y, m - 1, d, hh, mm, 0, 0) - 330 * 60_000;
}

export function DateTimeRange({
  branches,
  defaultBranchId,
  defaultStartAt,
  defaultEndAt,
  actionLabel = 'Show free cars',
}: {
  branches: BranchChoice[];
  defaultBranchId?: number;
  defaultStartAt: number;
  defaultEndAt: number;
  actionLabel?: string;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string>(
    defaultBranchId ? String(defaultBranchId) : 'all',
  );
  const [startStr, setStartStr] = useState<string>(() => toLocalInputValue(defaultStartAt));
  const [endStr, setEndStr] = useState<string>(() => toLocalInputValue(defaultEndAt));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const startAt = fromLocalInputValue(startStr);
    const endAt = fromLocalInputValue(endStr);
    const params = new URLSearchParams();
    if (branchId !== 'all') params.set('branch', branchId);
    params.set('start', String(startAt));
    params.set('end', String(endAt));
    router.push(`/cars?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSearch}
      className="grid gap-3 rounded-m border border-line bg-surface p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"
    >
      <label className="space-y-1 text-xs font-medium text-ink">
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <MapPin className="h-3.5 w-3.5" /> Pick-up hub
        </span>
        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="h-11 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm text-ink"
        >
          <option value="all">All Bengaluru hubs</option>
          {branches.map((b) => (
            <option key={b.id} value={String(b.id)}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1 text-xs font-medium text-ink">
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <Calendar className="h-3.5 w-3.5" /> Pick-up
        </span>
        <input
          type="datetime-local"
          required
          value={startStr}
          onChange={(e) => setStartStr(e.target.value)}
          className="h-11 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm text-ink tabular-nums"
        />
      </label>

      <label className="space-y-1 text-xs font-medium text-ink">
        <span className="inline-flex items-center gap-1.5 text-ink-muted">
          <Calendar className="h-3.5 w-3.5" /> Return
        </span>
        <input
          type="datetime-local"
          required
          value={endStr}
          onChange={(e) => setEndStr(e.target.value)}
          className="h-11 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm text-ink tabular-nums"
        />
      </label>

      <Button type="submit" size="lg" className="h-11 px-5">
        <span>{actionLabel}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
