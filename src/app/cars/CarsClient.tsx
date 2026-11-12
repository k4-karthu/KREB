'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { type BranchChoice, DateTimeRange } from '@/ui/components/DateTimeRange';
import { VehicleTile, type VehicleTileData } from '@/ui/components/VehicleTile';
import { Button } from '@/ui/primitives/Button';

export function CarsClient({
  branches,
  vehicles,
  startAt,
  endAt,
  selectedBranchId,
  selectedCategory,
  selectedTransmission,
  selectedFuel,
  selectedSort,
  validationMessage,
}: {
  branches: BranchChoice[];
  vehicles: VehicleTileData[];
  startAt: number;
  endAt: number;
  selectedBranchId?: number;
  selectedCategory: string;
  selectedTransmission: string;
  selectedFuel: string;
  selectedSort: string;
  validationMessage?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSent, setWaitlistSent] = useState(false);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (!next.has('start')) next.set('start', String(startAt));
    if (!next.has('end')) next.set('end', String(endAt));
    if (value && value !== 'all') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    router.push(`/cars?${next.toString()}`);
  }

  async function submitWaitlist(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: waitlistEmail,
        category: selectedCategory !== 'all' ? selectedCategory : null,
        startAt,
        endAt,
      }),
    });
    if (res.ok) {
      setWaitlistSent(true);
      setWaitlistEmail('');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Available fleet</h1>
        <DateTimeRange
          branches={branches}
          defaultBranchId={selectedBranchId}
          defaultStartAt={startAt}
          defaultEndAt={endAt}
          actionLabel="Update dates"
        />
        {validationMessage && (
          <p className="rounded-s border border-amber-600 bg-amber-100 px-3 py-2 text-sm text-petrol-950">
            {validationMessage}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Category"
            value={selectedCategory}
            onChange={(e) => updateFilter('category', e.target.value)}
            className="h-9 rounded-s border border-line bg-surface px-3 text-xs font-medium text-ink"
          >
            <option value="all">All body styles</option>
            <option value="hatchback">Hatchback</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="muv">MUV</option>
            <option value="luxury">Luxury</option>
            <option value="ev">Electric</option>
            <option value="van">Van</option>
          </select>

          <select
            aria-label="Transmission"
            value={selectedTransmission}
            onChange={(e) => updateFilter('transmission', e.target.value)}
            className="h-9 rounded-s border border-line bg-surface px-3 text-xs font-medium text-ink"
          >
            <option value="all">Any gearbox</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>

          <select
            aria-label="Fuel type"
            value={selectedFuel}
            onChange={(e) => updateFilter('fuel', e.target.value)}
            className="h-9 rounded-s border border-line bg-surface px-3 text-xs font-medium text-ink"
          >
            <option value="all">Any fuel</option>
            <option value="petrol">Petrol</option>
            <option value="diesel">Diesel</option>
            <option value="hybrid">Hybrid</option>
            <option value="electric">Electric</option>
            <option value="cng">CNG</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">
            {vehicles.length} {vehicles.length === 1 ? 'car' : 'cars'} free
          </span>
          <select
            aria-label="Sort"
            value={selectedSort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="h-9 rounded-s border border-line bg-surface px-3 text-xs font-medium text-ink"
          >
            <option value="recommended">Recommended</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <div className="space-y-5 rounded-m border border-line bg-surface p-8 text-center">
          <h2 className="font-display text-xl font-bold text-ink">
            No matching cars are free for those exact filters
          </h2>
          <p className="mx-auto max-w-md text-sm text-ink-muted">
            Try clearing a body style filter, switching pickup hub, or leave your email and we will
            alert you if a booking cancels.
          </p>
          {waitlistSent ? (
            <p className="text-sm font-medium text-petrol-700">
              You are on the notification list for these dates.
            </p>
          ) : (
            <form
              onSubmit={submitWaitlist}
              className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row"
            >
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 flex-1 rounded-s border border-line bg-surface-subtle px-3 text-sm"
              />
              <Button type="submit">Notify me</Button>
            </form>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleTile
              key={v.slug}
              vehicle={v}
              href={`/cars/${v.slug}?start=${startAt}&end=${endAt}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
