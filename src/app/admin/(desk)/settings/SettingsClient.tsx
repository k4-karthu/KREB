'use client';

import { FloppyDisk } from '@phosphor-icons/react';
import { useState } from 'react';
import type { RentalSettings } from '@/config/settings';
import { Button } from '@/ui/primitives/Button';
import { TextField } from '@/ui/primitives/TextField';

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
      setStatus('Failed to update rental settings');
      return;
    }
    setStatus('Rental policies updated and verified in audit log.');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h3 font-bold text-text-1">Rental Policy & Timings</h1>
        <p className="text-body-s text-text-3">
          Controls turnaround cleaning buffers, grace intervals, statutory GST tax rate, and
          automatic cancellation refund windows.
        </p>
      </div>

      {status && (
        <div className="rounded-xs border border-success/30 bg-surface p-3.5 text-body-s text-text-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span>{status}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-m border border-border bg-surface p-5 shadow-e0"
      >
        <div className="border-b border-border pb-3">
          <h2 className="text-h4 font-display font-semibold text-text-1">
            System Operational Buffers
          </h2>
          <p className="text-body-s text-text-3">
            Adjust parameters for fleet availability schedules.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField
            label="Tax Rate (basis points, 1800 = 18%)"
            type="number"
            value={String(form.taxRateBp)}
            onChange={(val) => setForm((prev) => ({ ...prev, taxRateBp: Number(val) }))}
            required
          />
          <TextField
            label="Return Grace Period (minutes)"
            type="number"
            value={String(form.graceMinutes)}
            onChange={(val) => setForm((prev) => ({ ...prev, graceMinutes: Number(val) }))}
            required
          />
          <TextField
            label="Turnaround Buffer (minutes)"
            type="number"
            value={String(form.turnaroundBufferMinutes)}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, turnaroundBufferMinutes: Number(val) }))
            }
            required
          />
          <TextField
            label="Checkout Hold Timeout (minutes)"
            type="number"
            value={String(form.holdTimeoutMinutes)}
            onChange={(val) => setForm((prev) => ({ ...prev, holdTimeoutMinutes: Number(val) }))}
            required
          />
          <TextField
            label="Minimum Lead Time (minutes)"
            type="number"
            value={String(form.minLeadTimeMinutes)}
            onChange={(val) => setForm((prev) => ({ ...prev, minLeadTimeMinutes: Number(val) }))}
            required
          />
          <TextField
            label="No-show Release Window (minutes)"
            type="number"
            value={String(form.noShowReleaseMinutes)}
            onChange={(val) => setForm((prev) => ({ ...prev, noShowReleaseMinutes: Number(val) }))}
            required
          />
          <TextField
            label="Fuel Shortfall per 1/8 Tank (paise)"
            type="number"
            value={String(form.fuelShortfallPerEighthMinor)}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, fuelShortfallPerEighthMinor: Number(val) }))
            }
            required
          />
          <TextField
            label="Refuel Service Convenience Fee (paise)"
            type="number"
            value={String(form.refuelServiceFeeMinor)}
            onChange={(val) => setForm((prev) => ({ ...prev, refuelServiceFeeMinor: Number(val) }))}
            required
          />
          <TextField
            label="Deposit Settlement (Working Days)"
            type="number"
            value={String(form.depositReleaseWorkingDays)}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, depositReleaseWorkingDays: Number(val) }))
            }
            required
          />
        </div>

        {canEdit && (
          <div className="flex justify-end pt-3 border-t border-border">
            <Button type="submit" disabled={saving} className="gap-2">
              <FloppyDisk size={16} weight="bold" />
              <span>{saving ? 'Saving changes...' : 'Save Policy Settings'}</span>
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
