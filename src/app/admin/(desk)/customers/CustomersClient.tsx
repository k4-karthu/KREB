'use client';

import { CheckCircle, Prohibit, User } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Button } from '@/ui/primitives/Button';
import { TextField } from '@/ui/primitives/TextField';

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  is_blacklisted: number;
  blacklist_reason: string | null;
  licence_status: string | null;
  trip_count: number;
}

export function CustomersClient({
  customers,
  canBlacklist,
}: {
  customers: CustomerRow[];
  canBlacklist: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        Boolean(c.phone?.toLowerCase().includes(q)),
    );
  }, [customers, query]);

  async function toggleBlacklist(c: CustomerRow) {
    setUpdatingId(c.id);
    await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: c.id,
        blacklist: c.is_blacklisted !== 1,
        reason: c.is_blacklisted !== 1 ? 'Flagged by operations desk' : undefined,
      }),
    });
    setUpdatingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-h3 font-bold text-text-1">Customers Directory</h1>
          <p className="text-body-s text-text-3">
            {customers.length} registered drivers across all branches.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <TextField
            placeholder="Search by name, email, or phone..."
            value={query}
            onChange={setQuery}
            aria-label="Search customers"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-m border border-border bg-surface overflow-hidden shadow-e0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-body-s">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/60 text-label-s font-semibold text-text-2 select-none">
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Licence Status</th>
                <th className="px-4 py-3">Completed Trips</th>
                <th className="px-4 py-3">Status</th>
                {canBlacklist && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-body-s text-text-3">
                    No customers found matching search query.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-sunken/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-sunken border border-border-subtle flex items-center justify-center text-text-2 shrink-0">
                          <User size={16} weight="bold" />
                        </div>
                        <div>
                          <div className="font-semibold text-text-1">{c.name}</div>
                          <div className="text-caption text-text-3">{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-2 tabular-nums text-caption">
                      {c.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.licence_status ?? 'unverified'} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-text-1 tabular-nums">
                      {c.trip_count}
                    </td>
                    <td className="px-4 py-3">
                      {c.is_blacklisted === 1 ? (
                        <div className="inline-flex items-center gap-1.5 text-danger font-medium text-caption">
                          <Prohibit size={14} weight="bold" />
                          <span>Flagged</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-text-2 font-medium text-caption">
                          <CheckCircle size={14} weight="bold" className="text-success" />
                          <span>Active Driver</span>
                        </div>
                      )}
                    </td>
                    {canBlacklist && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={c.is_blacklisted === 1 ? 'secondary' : 'danger'}
                          onClick={() => void toggleBlacklist(c)}
                          disabled={updatingId === c.id}
                        >
                          {c.is_blacklisted === 1 ? 'Clear Flag' : 'Flag Driver'}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
