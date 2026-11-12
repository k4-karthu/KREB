'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { MoneyText } from '@/ui/primitives/MoneyText';

const ZONES = [
  { id: 'front_bumper', label: 'Front bumper' },
  { id: 'rear_bumper', label: 'Rear bumper' },
  { id: 'left_doors', label: 'Left doors' },
  { id: 'right_doors', label: 'Right doors' },
  { id: 'windscreen', label: 'Windscreen' },
  { id: 'wheels', label: 'Wheels & tyres' },
] as const;

interface DamageMarkInput {
  zone: string;
  kind: 'scratch' | 'dent' | 'chip' | 'crack';
  severity: number;
  note: string;
}

export function HandoverClient({
  code,
  mode,
  defaultOdometerKm,
  defaultFuelLevel,
}: {
  code: string;
  mode: 'checkout' | 'checkin';
  defaultOdometerKm: number;
  defaultFuelLevel: number;
}) {
  const router = useRouter();
  const [odometerKm, setOdometerKm] = useState(defaultOdometerKm);
  const [fuelLevel, setFuelLevel] = useState(defaultFuelLevel);
  const [cleanliness, setCleanliness] = useState<'clean' | 'acceptable' | 'dirty'>('clean');
  const [notes, setNotes] = useState('');
  const [marks, setMarks] = useState<DamageMarkInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraChargesMinor, setExtraChargesMinor] = useState<number | null>(null);

  function addMark(zone: string) {
    setMarks((prev) => [
      ...prev,
      { zone, kind: 'scratch', severity: 1, note: 'Minor surface mark' },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/staff/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          mode,
          odometerKm: Number(odometerKm),
          fuelKind: 'eighths',
          fuelLevel: Number(fuelLevel),
          cleanliness,
          notes: notes.trim() || undefined,
          damageMarks: marks,
        }),
      });
      const data = (await res.json()) as { extraChargesMinor?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Handover failed');
      if (mode === 'checkin' && (data.extraChargesMinor ?? 0) > 0) {
        setExtraChargesMinor(data.extraChargesMinor ?? 0);
        return;
      }
      router.push('/staff');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (extraChargesMinor !== null) {
    return (
      <div className="space-y-4 rounded-m border border-line bg-surface p-6">
        <h2 className="font-display text-xl font-bold text-ink">Check-in recorded</h2>
        <p className="text-sm text-ink-muted">
          Computed extra charges (late/fuel):{' '}
          <MoneyText amountMinor={extraChargesMinor} className="font-bold text-ink" />
        </p>
        <Button type="button" onClick={() => router.push('/staff')}>
          Back to bay queue
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-m border border-line bg-surface p-5">
      {error && (
        <p className="rounded-s border border-stop-600 bg-stop-100 px-3 py-2 text-xs text-stop-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium text-ink">
          <span>Odometer reading (km)</span>
          <input
            type="number"
            required
            min={defaultOdometerKm}
            value={odometerKm}
            onChange={(e) => setOdometerKm(Number(e.target.value))}
            className="h-11 w-full rounded-s border border-line bg-surface-subtle px-3 font-mono text-base"
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-ink">
          <span>Cleanliness</span>
          <select
            value={cleanliness}
            onChange={(e) => setCleanliness(e.target.value as 'clean' | 'acceptable' | 'dirty')}
            className="h-11 w-full rounded-s border border-line bg-surface-subtle px-3 text-sm"
          >
            <option value="clean">Clean</option>
            <option value="acceptable">Acceptable</option>
            <option value="dirty">Needs deep clean</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-ink">Fuel gauge (eighths: {fuelLevel}/8)</div>
        <div className="grid grid-cols-9 gap-1">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFuelLevel(n)}
              className={`h-10 rounded-s border text-xs font-mono font-semibold ${
                fuelLevel === n
                  ? 'border-petrol-600 bg-petrol-800 text-surface'
                  : 'border-line bg-surface-subtle text-ink'
              }`}
            >
              {n}/8
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-ink">Tap a zone to log a new mark (if any)</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ZONES.map((z) => (
            <button
              key={z.id}
              type="button"
              onClick={() => addMark(z.id)}
              className="rounded-s border border-line bg-surface-subtle px-3 py-2 text-left text-xs font-medium text-ink hover:border-petrol-600"
            >
              + {z.label}
            </button>
          ))}
        </div>
        {marks.length > 0 && (
          <div className="space-y-2 pt-2">
            {marks.map((m, idx) => (
              <div
                key={`${m.zone}-${idx}`}
                className="flex items-center justify-between rounded-s border border-amber-600 bg-amber-100 px-3 py-2 text-xs text-petrol-950"
              >
                <span>
                  {m.zone.replace('_', ' ')} ({m.kind}, severity {m.severity})
                </span>
                <button
                  type="button"
                  onClick={() => setMarks((prev) => prev.filter((_, i) => i !== idx))}
                  className="underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="block space-y-1 text-xs font-medium text-ink">
        <span>Handover notes</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Spare wheel, jack, FASTag and cabin verified with driver."
          className="w-full rounded-s border border-line bg-surface-subtle p-2.5 text-sm"
        />
      </label>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting
          ? 'Saving inspection...'
          : mode === 'checkout'
            ? 'Complete check-out & release keys'
            : 'Complete check-in & inspect'}
      </Button>
    </form>
  );
}
