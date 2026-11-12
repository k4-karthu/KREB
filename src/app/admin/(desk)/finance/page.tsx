import { getReadConnection } from '@/db/client';
import { requireStaffPage } from '@/server/auth';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';

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
        <h1 className="font-display text-h3 font-bold text-text-1">Finance & Transaction Ledger</h1>
        <p className="text-body-s text-text-3">
          Statutory integer-paise accounting logs, payment gateway captures, traffic challans, and
          incident damage recoveries.
        </p>
      </div>

      {/* Payment Ledger */}
      <section className="space-y-4">
        <h2 className="text-h4 font-display font-semibold text-text-1">Payment Transactions</h2>
        <div className="overflow-x-auto rounded-m border border-border bg-surface shadow-e0">
          <table className="w-full border-collapse text-left text-body-s">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/60 text-label-s font-semibold text-text-2 select-none">
                <th className="px-4 py-3">Booking Code</th>
                <th className="px-4 py-3">Payment Kind</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Captured Amount</th>
                <th className="px-4 py-3">Ledger Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {payments.map((p) => (
                <tr key={p.public_id} className="transition-colors hover:bg-surface-sunken/40">
                  <td className="px-4 py-3">
                    <Plate code={p.booking_code} size="sm" />
                  </td>
                  <td className="px-4 py-3 font-medium capitalize text-text-1">
                    {p.kind.replaceAll('_', ' ')}
                  </td>
                  <td className="px-4 py-3 text-caption text-text-3  tabular-nums">
                    {p.method ?? 'card'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-text-1">
                    <Price minorUnits={p.amount_minor} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Side-by-side Fines & Claims */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
          <h2 className="text-h4 font-display font-semibold text-text-1">
            Statutory Traffic Fines & Challans
          </h2>
          <div className="divide-y divide-border-subtle text-body-s">
            {fines.length === 0 ? (
              <p className="py-4 text-text-3">No outstanding traffic challans on record.</p>
            ) : (
              fines.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-text-1">
                      {f.plate} ({f.reference_no ?? 'Pending Notice'})
                    </div>
                    <div className="text-caption text-text-3">{f.place ?? 'Bengaluru RTO'}</div>
                  </div>
                  <div className="text-right">
                    <Price
                      minorUnits={f.amount_minor + f.admin_fee_minor}
                      className="font-bold text-text-1"
                    />
                    <div className="mt-0.5">
                      <StatusBadge status={f.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-m border border-border bg-surface p-5 shadow-e0">
          <h2 className="text-h4 font-display font-semibold text-text-1">Incident Damage Claims</h2>
          <div className="divide-y divide-border-subtle text-body-s">
            {claims.length === 0 ? (
              <p className="py-4 text-text-3">No active damage claims registered.</p>
            ) : (
              claims.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-semibold text-text-1">Booking #{c.booking_code}</div>
                    <div className="text-caption text-text-3">{c.description}</div>
                  </div>
                  <div className="text-right">
                    <Price
                      minorUnits={c.final_minor ?? c.estimate_minor}
                      className="font-bold text-text-1"
                    />
                    <div className="mt-0.5">
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
