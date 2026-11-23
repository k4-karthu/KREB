'use client';

import { CalendarDate, type DateValue } from '@internationalized/date';
import { ArrowClockwise, ArrowRight, EnvelopeSimple } from '@phosphor-icons/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { EmptyState } from '@/ui/data/EmptyState';
import { VehicleTile, type VehicleTileData } from '@/ui/data/VehicleTile';
import { Button } from '@/ui/primitives/Button';
import { Chip } from '@/ui/primitives/Chips';
import { DateRangePicker } from '@/ui/primitives/DateRangePicker';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { Select } from '@/ui/primitives/Select';
import { Slider } from '@/ui/primitives/Slider';
import { TextField } from '@/ui/primitives/TextField';
import type { BranchOption } from './page';

function epochMsToCalendarDate(ms: number): CalendarDate {
  const d = new Date(ms + 330 * 60_000);
  return new CalendarDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function calendarDateToEpochMs(date: DateValue, hour = 10, minute = 0): number {
  const istOffsetMs = 330 * 60_000;
  const utcMs = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0);
  return utcMs - istOffsetMs;
}

const CATEGORIES = [
  { id: 'all', label: 'All styles' },
  { id: 'ev', label: 'Electric' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'suv', label: 'SUV' },
  { id: 'sedan', label: 'Sedan' },
  { id: 'hatchback', label: 'Hatchback' },
  { id: 'muv', label: 'MUV' },
  { id: 'van', label: 'Van / 9S' },
];

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
  branches: BranchOption[];
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
  const [isPending, startTransition] = useTransition();

  const [branchKey, setBranchKey] = useState<string>(
    selectedBranchId ? String(selectedBranchId) : 'all',
  );
  const [dateRange, setDateRange] = useState<{ start: DateValue; end: DateValue }>(() => ({
    start: epochMsToCalendarDate(startAt),
    end: epochMsToCalendarDate(endAt),
  }));

  const maxAvailableDailyRupees = useMemo(() => {
    if (vehicles.length === 0) return 25000;
    const rates = vehicles.map((v) => Math.round(v.dailyMinor / 100));
    return Math.max(10000, ...rates);
  }, [vehicles]);

  const [maxPrice, setMaxPrice] = useState<number>(() => maxAvailableDailyRupees);
  const [seatingFilter, setSeatingFilter] = useState<'all' | '5' | '7plus'>('all');
  const [depositFilter, setDepositFilter] = useState<'all' | 'low'>('all');
  const [transmissionFilter, setTransmissionFilter] = useState<string>(selectedTransmission);
  const [categoryFilter, setCategoryFilter] = useState<string>(selectedCategory);
  const [fuelFilter, setFuelFilter] = useState<string>(selectedFuel);

  useEffect(() => {
    setTransmissionFilter(selectedTransmission);
  }, [selectedTransmission]);

  useEffect(() => {
    setCategoryFilter(selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    setFuelFilter(selectedFuel);
  }, [selectedFuel]);

  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: vehicles.length };
    for (const v of vehicles) {
      const cat = v.category.toLowerCase();
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const dailyRupees = Math.round(v.dailyMinor / 100);
      if (dailyRupees > maxPrice) return false;
      if (seatingFilter === '5' && v.seats !== 5) return false;
      if (seatingFilter === '7plus' && (!v.seats || v.seats < 7)) return false;
      if (depositFilter === 'low' && v.dailyMinor > 500000) return false;
      if (
        transmissionFilter !== 'all' &&
        v.transmission?.toLowerCase() !== transmissionFilter.toLowerCase()
      ) {
        return false;
      }
      if (categoryFilter !== 'all' && v.category?.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (fuelFilter !== 'all' && v.fuelType?.toLowerCase() !== fuelFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [
    vehicles,
    maxPrice,
    seatingFilter,
    depositFilter,
    transmissionFilter,
    categoryFilter,
    fuelFilter,
  ]);

  function updateFilter(key: string, value: string) {
    if (key === 'transmission') setTransmissionFilter(value);
    if (key === 'category') setCategoryFilter(value);
    if (key === 'fuel') setFuelFilter(value);

    const next = new URLSearchParams(searchParams.toString());
    if (!next.has('start')) next.set('start', String(startAt));
    if (!next.has('end')) next.set('end', String(endAt));
    if (value && value !== 'all') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    startTransition(() => {
      router.replace(`/cars?${next.toString()}`, { scroll: false });
    });
  }

  function applyDateAndBranch() {
    const next = new URLSearchParams(searchParams.toString());
    if (branchKey && branchKey !== 'all') {
      next.set('branch', branchKey);
    } else {
      next.delete('branch');
    }
    const newStart = calendarDateToEpochMs(dateRange.start, 10, 0);
    const newEnd = calendarDateToEpochMs(dateRange.end, 10, 0);
    next.set('start', String(newStart));
    next.set('end', String(newEnd));
    startTransition(() => {
      router.replace(`/cars?${next.toString()}`, { scroll: false });
    });
  }

  function resetAllFilters() {
    setTransmissionFilter('all');
    setCategoryFilter('all');
    setFuelFilter('all');
    setSeatingFilter('all');
    setDepositFilter('all');
    setMaxPrice(maxAvailableDailyRupees);

    const next = new URLSearchParams();
    next.set('start', String(startAt));
    next.set('end', String(endAt));
    if (selectedBranchId) next.set('branch', String(selectedBranchId));
    startTransition(() => {
      router.replace(`/cars?${next.toString()}`, { scroll: false });
    });
  }

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    transmissionFilter !== 'all' ||
    fuelFilter !== 'all' ||
    selectedSort !== 'recommended' ||
    seatingFilter !== 'all' ||
    depositFilter !== 'all' ||
    maxPrice < maxAvailableDailyRupees;

  async function handleWaitlistSubmit() {
    if (!waitlistEmail.trim() || waitlistLoading) return;
    setWaitlistLoading(true);
    try {
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
    } finally {
      setWaitlistLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-h1 font-bold tracking-tight text-text-1">
            Available fleet
          </h1>
          <span className="text-body-s font-medium text-text-3">
            {filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehicle' : 'vehicles'} ready
            for rental
          </span>
        </div>
        <p className="text-body text-text-2">
          Transparent whole-rupee daily rates with insurance and roadside coverage included.
        </p>
      </div>

      {/* Date & Hub Bar with Primitives */}
      <div className="rounded-m border border-border bg-surface p-4 shadow-e0">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
          <div className="md:col-span-4 min-w-0">
            <Select
              label="Pick-up hub"
              placeholder="Select hub location"
              selectedKey={branchKey}
              onSelectionChange={(key) => setBranchKey(String(key))}
              options={[
                { id: 'all', label: 'All Bengaluru hubs', description: 'Across all 5 city hubs' },
                ...branches.map((b) => ({
                  id: String(b.id),
                  label: b.name,
                  description: b.city,
                })),
              ]}
            />
          </div>

          <div className="md:col-span-5 min-w-0">
            <DateRangePicker
              label="Rental dates"
              value={dateRange}
              onChange={(range) => {
                if (range?.start && range?.end) {
                  setDateRange({ start: range.start, end: range.end });
                }
              }}
            />
          </div>

          <div className="md:col-span-3 min-w-0">
            <Button
              type="button"
              variant="racing"
              size="md"
              disabled={isPending}
              onClick={applyDateAndBranch}
              className="w-full"
            >
              <span>{isPending ? 'Updating...' : 'Update fleet'}</span>
              <ArrowRight size={16} weight="bold" />
            </Button>
          </div>
        </div>

        {validationMessage && (
          <div className="mt-3 rounded-s border border-warning/30 bg-warning-subtle px-3 py-2 text-label-s font-medium text-warning">
            {validationMessage}
          </div>
        )}
      </div>

      {/* Main Filter Section */}
      <div className="space-y-5 rounded-m border border-border-subtle bg-surface p-5 shadow-e0">
        {/* Category Chips Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-label-s font-medium text-text-3">
            <span>Body style</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-label-s font-medium text-accent hover:underline cursor-pointer"
              >
                <ArrowClockwise size={14} weight="bold" />
                <span>Reset all filters</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                variant="filter"
                size="sm"
                selected={categoryFilter === cat.id}
                onSelect={() =>
                  updateFilter('category', categoryFilter === cat.id ? 'all' : cat.id)
                }
                count={categoryCounts[cat.id]}
              >
                {cat.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Transmission, Fuel, Sort, Price controls */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border-subtle pt-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Gearbox SegmentedControl */}
            <div className="flex flex-col gap-1.5">
              <span className="text-caption font-medium text-text-2">Transmission</span>
              <SegmentedControl
                name="transmission"
                aria-label="Filter transmission"
                value={transmissionFilter}
                onValueChange={(val) => updateFilter('transmission', val)}
                options={[
                  { value: 'all', label: 'All gearboxes' },
                  { value: 'automatic', label: 'Automatic' },
                  { value: 'manual', label: 'Manual' },
                ]}
              />
            </div>

            {/* Fuel Type Select */}
            <div className="w-36">
              <Select
                label="Fuel type"
                aria-label="Filter fuel type"
                selectedKey={fuelFilter}
                onSelectionChange={(key) => updateFilter('fuel', String(key))}
                options={[
                  { id: 'all', label: 'Any fuel' },
                  { id: 'petrol', label: 'Petrol' },
                  { id: 'diesel', label: 'Diesel' },
                  { id: 'electric', label: 'Electric' },
                  { id: 'hybrid', label: 'Hybrid' },
                  { id: 'cng', label: 'CNG' },
                ]}
              />
            </div>

            {/* Sort Select */}
            <div className="w-44">
              <Select
                label="Sort order"
                aria-label="Sort vehicles"
                selectedKey={selectedSort}
                onSelectionChange={(key) => updateFilter('sort', String(key))}
                options={[
                  { id: 'recommended', label: 'Recommended' },
                  { id: 'price_asc', label: 'Price: low to high' },
                  { id: 'price_desc', label: 'Price: high to low' },
                ]}
              />
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="w-full sm:w-64">
            <Slider
              label="Max daily rate"
              minValue={2000}
              maxValue={maxAvailableDailyRupees}
              step={500}
              value={maxPrice}
              onChange={(val) => setMaxPrice(Array.isArray(val) ? val[0] : val)}
              formatOptions={{ style: 'currency', currency: 'INR', maximumFractionDigits: 0 }}
            />
          </div>
        </div>

        {/* Quick Commercial Filter Pills (Transmission, Seating & Deposit) */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          <span className="text-label-s font-technical text-text-3 mr-1">Quick filters:</span>
          <button
            type="button"
            onClick={() =>
              updateFilter('transmission', transmissionFilter === 'automatic' ? 'all' : 'automatic')
            }
            aria-pressed={transmissionFilter === 'automatic'}
            className={`rounded-xs border px-3 py-1 text-caption font-technical font-medium transition-all ${
              transmissionFilter === 'automatic'
                ? 'border-racing-green bg-racing-green-subtle text-racing-green font-semibold shadow-e0'
                : 'border-border bg-surface-sunken text-text-2 hover:border-border-strong hover:bg-surface'
            }`}
          >
            Automatic
          </button>
          <button
            type="button"
            onClick={() =>
              updateFilter('transmission', transmissionFilter === 'manual' ? 'all' : 'manual')
            }
            aria-pressed={transmissionFilter === 'manual'}
            className={`rounded-xs border px-3 py-1 text-caption font-technical font-medium transition-all ${
              transmissionFilter === 'manual'
                ? 'border-racing-green bg-racing-green-subtle text-racing-green font-semibold shadow-e0'
                : 'border-border bg-surface-sunken text-text-2 hover:border-border-strong hover:bg-surface'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setSeatingFilter(seatingFilter === '5' ? 'all' : '5')}
            aria-pressed={seatingFilter === '5'}
            className={`rounded-xs border px-3 py-1 text-caption font-technical font-medium transition-all ${
              seatingFilter === '5'
                ? 'border-racing-green bg-racing-green-subtle text-racing-green font-semibold shadow-e0'
                : 'border-border bg-surface-sunken text-text-2 hover:border-border-strong hover:bg-surface'
            }`}
          >
            5 Seats
          </button>
          <button
            type="button"
            onClick={() => setSeatingFilter(seatingFilter === '7plus' ? 'all' : '7plus')}
            aria-pressed={seatingFilter === '7plus'}
            className={`rounded-xs border px-3 py-1 text-caption font-technical font-medium transition-all ${
              seatingFilter === '7plus'
                ? 'border-racing-green bg-racing-green-subtle text-racing-green font-semibold shadow-e0'
                : 'border-border bg-surface-sunken text-text-2 hover:border-border-strong hover:bg-surface'
            }`}
          >
            7+ Seats
          </button>
          <button
            type="button"
            onClick={() => setDepositFilter(depositFilter === 'low' ? 'all' : 'low')}
            aria-pressed={depositFilter === 'low'}
            className={`rounded-xs border px-3 py-1 text-caption font-technical font-medium transition-all ${
              depositFilter === 'low'
                ? 'border-cognac bg-cognac-subtle text-cognac font-semibold shadow-e0'
                : 'border-border bg-surface-sunken text-text-2 hover:border-border-strong hover:bg-surface'
            }`}
          >
            Low deposit (≤ ₹10k)
          </button>
        </div>
      </div>

      {/* Vehicles Grid / Empty State */}
      {filteredVehicles.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            iconName="car"
            heading="No matching vehicles for these exact dates"
            description="Try adjusting your body style, increasing the price range, or clearing filters."
            action={{
              label: 'Reset all filters',
              onClick: resetAllFilters,
            }}
          />

          <div className="mx-auto max-w-md rounded-m border border-border bg-surface p-5 text-center shadow-e0 space-y-3">
            <h4 className="text-body-s font-semibold text-text-1">Join vehicle alert list</h4>
            <p className="text-caption text-text-2">
              Receive an automated notification if a vehicle becomes available on your dates.
            </p>
            {waitlistSent ? (
              <div className="rounded-s border border-racing-green-tint bg-racing-green-subtle px-3 py-2 text-caption font-medium text-racing-green">
                You are on the alert list for these trip dates.
              </div>
            ) : (
              <div className="flex gap-2">
                <TextField
                  aria-label="Email address"
                  placeholder="name@example.com"
                  value={waitlistEmail}
                  onChange={setWaitlistEmail}
                  prefix={<EnvelopeSimple size={16} className="text-text-3" />}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="racing"
                  disabled={waitlistLoading || !waitlistEmail.trim()}
                  onClick={() => void handleWaitlistSubmit()}
                >
                  <span>{waitlistLoading ? 'Saving...' : 'Notify me'}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((v, idx) => (
            <VehicleTile
              key={v.slug}
              vehicle={v}
              priority={idx < 6}
              href={`/cars/${v.slug}?start=${startAt}&end=${endAt}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
