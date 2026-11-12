'use client';

import { ArrowsClockwise } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plate } from '@/ui/data/Plate';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Button } from '@/ui/primitives/Button';

export interface TurnaroundRow {
  id: number;
  make: string;
  model: string;
  plate: string;
  paint_hex: string;
  ops_state: string;
  branch_name: string;
}

export function TurnaroundClient({ vehicles }: { vehicles: TurnaroundRow[] }) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function setState(vehicleId: number, opsState: string) {
    setUpdatingId(vehicleId);
    await fetch('/api/admin/ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_ops_state', vehicleId, opsState }),
    });
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h3 font-bold text-text-1">Turnaround & Bay Readiness</h1>
        <p className="text-body-s text-text-3">
          Track return vehicles moving through wash, inspection, detailing, and ready-line release.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.length === 0 ? (
          <div className="col-span-full rounded-m border border-border bg-surface p-12 text-center text-text-3">
            <ArrowsClockwise size={36} className="mx-auto text-text-3 mb-2" />
            <p className="font-semibold text-text-1">Bay queue is clear</p>
            <p className="text-body-s">
              All active vehicles are prepared and staged on the ready line.
            </p>
          </div>
        ) : (
          vehicles.map((v) => (
            <div
              key={v.id}
              className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0 transition-all hover:border-border-strong"
            >
              <div className="flex items-center justify-between gap-2">
                <Plate code={v.plate} size="sm" />
                <StatusBadge status={v.ops_state} />
              </div>

              <div>
                <div className="font-semibold text-text-1 text-body">
                  {v.make} {v.model}
                </div>
                <div className="text-caption text-text-3">Location: {v.branch_name}</div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-border-subtle">
                <span className="text-caption text-text-3 block">Update Bay Status:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(['ready', 'cleaning', 'inspection', 'hold'] as const).map((st) => (
                    <Button
                      key={st}
                      type="button"
                      size="sm"
                      variant={v.ops_state === st ? 'primary' : 'secondary'}
                      onClick={() => void setState(v.id, st)}
                      disabled={updatingId === v.id}
                      className="capitalize"
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
