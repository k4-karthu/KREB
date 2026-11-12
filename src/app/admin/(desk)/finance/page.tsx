import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { MoneyText } from '@/ui/primitives/MoneyText';
import { Plate } from '@/ui/primitives/Plate';

export default async function AdminFinancePage() {
  await requireStaffPage('reports.view');
  const { sqlite } = getReadConnection();

  const payments = sqlite
    .prepare(
      `
    SELECT p.public_id, p.kind, p.status, p.amount_minor, p.method, p.reason, p.created_at, b.code AS booking_code
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    ORDER BY p.created_at DESC
    LIMIT 60
  `,
    )
    .all() as Array<{
    public_id: string;
    kind: string;
    status: string;
    amount_minor: number;
    method: string | null;
    reason: string | null;
    created_at: number;
    booking_code: string;
  }>;

  const fines = sqlite
    .prepare(
      `
    SELECT f.*, v.plate
    FROM fines f JOIN vehicles v ON v.id = f.vehicle_id
    ORDER BY f.created_at DESC LIMIT 20
  `,
    )
    .all() as Array<{
    id: number;
    reference_no: string | null;
    place: string | null;
    amount_minor: number;
    admin_fee_minor: number;
    status: string;
    plate: string;
  }>;

  const claims = sqlite
    .prepare(
      `
    SELECT dc.*, b.code AS booking_code
    FROM damage_claims dc JOIN bookings b ON b.id = dc.booking_id
    ORDER BY dc.opened_at DESC LIMIT 20
  `,
    )
    .all() as Array<{
    id: number;
    description: string;
    estimate_minor: number;
    final_minor: number | null;
    status: string;
    booking_code: string;
  }>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          Finance, fines & damage claims
        </h1>
        <p className="text-sm text-ink-muted">
          Immutable integer-paise payment ledger, traffic challans, and damage recoveries.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink">Recent payment ledger</h2>
        <div className="overflow-x-auto rounded-m border border-line bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-subtle text-xs font-semibold text-ink-muted">
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.map((p) => (
                <tr key={p.public_id}>
                  <td className="px-4 py-3">
                    <Plate code={p.booking_code} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink">{p.kind.replaceAll('_', ' ')}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{p.method ?? 'card'}</td>
                  <td className="px-4 py-3">
                    <MoneyText amountMinor={p.amount_minor} className="font-medium" />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3 rounded-m border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Traffic fines & tolls</h2>
          <div className="divide-y divide-line text-sm">
            {fines.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-medium text-ink">
                    {f.plate} ({f.reference_no ?? 'Pending ref'})
                  </div>
                  <div className="text-xs text-ink-muted">{f.place ?? 'Bengaluru'}</div>
                </div>
                <div className="text-right">
                  <MoneyText amountMinor={f.amount_minor + f.admin_fee_minor} />
                  <div className="text-xs text-ink-muted">{f.status}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-m border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Damage claims</h2>
          <div className="divide-y divide-line text-sm">
            {claims.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5">
                <div>
                  <div className="font-medium text-ink">{c.booking_code}</div>
                  <div className="text-xs text-ink-muted">{c.description}</div>
                </div>
                <div className="text-right">
                  <MoneyText amountMinor={c.final_minor ?? c.estimate_minor} />
                  <div className="text-xs text-ink-muted">{c.status.replaceAll('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
