'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/ui/primitives/Button';
import { Plate } from '@/ui/primitives/Plate';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

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

  async function setState(vehicleId: number, opsState: string) {
    await fetch('/api/admin/ops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_ops_state', vehicleId, opsState }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Turnaround & bay readiness
        </h1>
        <p className="text-sm text-ink-muted">
          Track vehicles moving through wash, inspection, and ready-line release.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <div key={v.id} className="space-y-3 rounded-m border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <Plate code={v.plate} paintHex={v.paint_hex} size="sm" />
              <StatusBadge status={v.ops_state} />
            </div>
            <div>
              <div className="font-semibold text-ink">
                {v.make} {v.model}
              </div>
              <div className="text-xs text-ink-muted">{v.branch_name}</div>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['ready', 'cleaning', 'inspection', 'hold'] as const).map((st) => (
                <Button
                  key={st}
                  type="button"
                  size="sm"
                  variant={v.ops_state === st ? 'primary' : 'secondary'}
                  onClick={() => void setState(v.id, st)}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
