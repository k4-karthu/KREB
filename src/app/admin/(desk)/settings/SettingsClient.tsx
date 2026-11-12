'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import type { RentalSettings } from '@/config/settings';
import { Button } from '@/ui/primitives/Button';

export function SettingsClient({
  initialSettings,
  canEdit,
}: {
  initialSettings: RentalSettings;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<RentalSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setStatus('Failed to update settings');
      return;
    }
    setStatus('Rental rules updated and audited.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Rental policy & timings
        </h1>
        <p className="text-sm text-ink-muted">
          Controls turnaround buffers, grace periods, tax, and automatic cancellation refund
          windows.
        </p>
      </div>

      {status && (
        <p className="rounded-s border border-go-600 bg-go-100 px-3 py-2 text-sm text-petrol-800">
          {status}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-m border border-line bg-surface p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Tax rate (basis points, 1800 = 18%)</span>
            <input
              type="number"
              value={form.taxRateBp}
              onChange={(e) => setForm({ ...form, taxRateBp: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Return grace period (minutes)</span>
            <input
              type="number"
              value={form.graceMinutes}
              onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Turnaround buffer (minutes)</span>
            <input
              type="number"
              value={form.turnaroundBufferMinutes}
              onChange={(e) =>
                setForm({ ...form, turnaroundBufferMinutes: Number(e.target.value) })
              }
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Checkout hold duration (minutes)</span>
            <input
              type="number"
              value={form.holdTimeoutMinutes}
              onChange={(e) => setForm({ ...form, holdTimeoutMinutes: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Minimum lead time (minutes)</span>
            <input
              type="number"
              value={form.minLeadTimeMinutes}
              onChange={(e) => setForm({ ...form, minLeadTimeMinutes: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>No-show release window (minutes)</span>
            <input
              type="number"
              value={form.noShowReleaseMinutes}
              onChange={(e) => setForm({ ...form, noShowReleaseMinutes: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Refuel shortfall per 1/8 tank (paise)</span>
            <input
              type="number"
              value={form.fuelShortfallPerEighthMinor}
              onChange={(e) =>
                setForm({ ...form, fuelShortfallPerEighthMinor: Number(e.target.value) })
              }
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Refuel service fee (paise)</span>
            <input
              type="number"
              value={form.refuelServiceFeeMinor}
              onChange={(e) => setForm({ ...form, refuelServiceFeeMinor: Number(e.target.value) })}
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-ink">
            <span>Deposit release (working days)</span>
            <input
              type="number"
              value={form.depositReleaseWorkingDays}
              onChange={(e) =>
                setForm({ ...form, depositReleaseWorkingDays: Number(e.target.value) })
              }
              className="h-9 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm tabular-nums"
            />
          </label>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save policy settings'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
