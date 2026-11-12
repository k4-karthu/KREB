'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/ui/primitives/Button';
import { StatusBadge } from '@/ui/primitives/StatusBadge';

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

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${c.name} ${c.email} ${c.phone ?? ''}`.toLowerCase().includes(q);
  });

  async function toggleBlacklist(c: CustomerRow) {
    await fetch('/api/admin/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: c.id,
        blacklist: c.is_blacklisted !== 1,
        reason: c.is_blacklisted !== 1 ? 'Flagged by operations desk' : undefined,
      }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Customers directory
          </h1>
          <p className="text-sm text-ink-muted">{customers.length} registered drivers.</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone..."
          className="h-10 w-64 rounded-s border border-line bg-surface px-3 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-m border border-line bg-surface">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-subtle text-xs font-semibold text-ink-muted">
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">KYC</th>
              <th className="px-4 py-3">Trips</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{c.name}</div>
                  <div className="text-xs text-ink-muted">{c.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">{c.phone ?? 'N/A'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.licence_status ?? 'pending'} />
                </td>
                <td className="px-4 py-3 tabular-nums text-ink-muted">{c.trip_count}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.is_blacklisted ? 'hold' : 'active'} />
                </td>
                <td className="px-4 py-3 text-right">
                  {canBlacklist && (
                    <Button
                      type="button"
                      size="sm"
                      variant={c.is_blacklisted ? 'secondary' : 'danger'}
                      onClick={() => void toggleBlacklist(c)}
                    >
                      {c.is_blacklisted ? 'Unblock' : 'Restrict'}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
