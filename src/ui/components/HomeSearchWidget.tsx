'use client';

import { CalendarDate, Time } from '@internationalized/date';
import { ArrowRight, Buildings, HouseLine } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { DateRange, DateValue, Key, TimeValue } from 'react-aria-components';
import { Button } from '../primitives/Button';
import { Combobox, type ComboboxOption } from '../primitives/Combobox';
import { DateRangePicker } from '../primitives/DateRangePicker';
import { TimePicker } from '../primitives/TimePicker';

export interface BranchSummary {
  id: number;
  slug?: string;
  name: string;
  city: string;
  address?: string;
}

export interface HomeSearchWidgetProps {
  branches: BranchSummary[];
  defaultBranchId?: number;
  defaultStartAt: number;
  defaultEndAt: number;
  className?: string;
}

function toCalendarDateAndTime(epochMs: number) {
  const d = new Date(epochMs + 330 * 60_000);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  return {
    date: new CalendarDate(year, month, day),
    time: new Time(hour, minute),
  };
}

function toEpochMs(date: DateValue, time: TimeValue): number {
  return Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute, 0) - 330 * 60_000;
}

const PRESETS = [
  { label: '24h Sprint', days: 1 },
  { label: 'Weekend 3D', days: 3 },
  { label: '7D Roadtrip', days: 7 },
  { label: 'Monthly 30D', days: 30 },
] as const;

export function HomeSearchWidget({
  branches,
  defaultBranchId,
  defaultStartAt,
  defaultEndAt,
  className = '',
}: HomeSearchWidgetProps) {
  const router = useRouter();

  const startInitial = toCalendarDateAndTime(defaultStartAt);
  const endInitial = toCalendarDateAndTime(defaultEndAt);

  const [deliveryMode, setDeliveryMode] = useState<'hub' | 'doorstep'>('hub');
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<Key | null>(
    defaultBranchId ? String(defaultBranchId) : 'all',
  );

  const [dateRange, setDateRange] = useState<DateRange>({
    start: startInitial.date,
    end: endInitial.date,
  });

  const [pickupTime, setPickupTime] = useState<TimeValue>(startInitial.time);
  const [returnTime, setReturnTime] = useState<TimeValue>(endInitial.time);

  const branchOptions: ComboboxOption[] = [
    { id: 'all', label: 'All Bengaluru hubs', description: 'Search across all pickup bays' },
    ...branches.map((b) => ({
      id: String(b.id),
      label: b.name,
      description: b.address ?? b.city,
    })),
  ];

  function applyPreset(days: number) {
    setActivePreset(days);
    setFormError(null);
    const baseStart = dateRange.start ?? toCalendarDateAndTime(Date.now() + 86_400_000).date;
    const startEpoch = toEpochMs(baseStart, pickupTime);
    const endEpoch = startEpoch + days * 86_400_000;
    const endObj = toCalendarDateAndTime(endEpoch);
    setDateRange({
      start: baseStart,
      end: endObj.date,
    });
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!dateRange.start || !dateRange.end) {
      setFormError('Please select both pick-up and return dates.');
      return;
    }
    setFormError(null);

    const startAt = toEpochMs(dateRange.start, pickupTime);
    const endAt = toEpochMs(dateRange.end, returnTime);

    const params = new URLSearchParams();
    if (selectedBranchId && selectedBranchId !== 'all') {
      params.set('branch', String(selectedBranchId));
    }
    if (deliveryMode === 'doorstep') {
      params.set('delivery', 'doorstep');
    }
    params.set('start', String(startAt));
    params.set('end', String(endAt));

    router.push(`/cars?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full rounded-m border border-border bg-surface p-4 md:p-6 shadow-e2 space-y-5 ${className}`.trim()}
    >
      {/* Top command strip: Delivery mode toggle & duration preset pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3.5">
        <div className="inline-flex rounded-s border border-border bg-surface-sunken p-1 shadow-e0">
          <button
            type="button"
            onClick={() => setDeliveryMode('hub')}
            aria-pressed={deliveryMode === 'hub'}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-caption font-medium rounded-xs transition-all ${
              deliveryMode === 'hub'
                ? 'bg-surface text-text-1 shadow-e1 border border-border-subtle font-semibold'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            <Buildings
              size={15}
              className={deliveryMode === 'hub' ? 'text-racing-cobalt' : 'text-text-3'}
            />
            <span>Hub pickup</span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMode('doorstep')}
            aria-pressed={deliveryMode === 'doorstep'}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-caption font-medium rounded-xs transition-all ${
              deliveryMode === 'doorstep'
                ? 'bg-surface text-text-1 shadow-e1 border border-border-subtle font-semibold'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            <HouseLine
              size={15}
              className={deliveryMode === 'doorstep' ? 'text-cognac' : 'text-text-3'}
            />
            <span>Doorstep delivery</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-0.5">
          <span className="text-label-s text-text-3 mr-1 font-technical tracking-wider shrink-0">
            PRESETS:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.days)}
              aria-pressed={activePreset === p.days}
              className={`rounded-xs border px-3 py-1.5 text-caption font-technical font-medium transition-all active:scale-98 shadow-e0 shrink-0 ${
                activePreset === p.days
                  ? 'border-cognac bg-cognac-subtle text-cognac font-semibold shadow-e0'
                  : 'border-border bg-surface-sunken text-text-2 hover:border-cognac hover:text-cognac hover:bg-surface'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 lg:grid-cols-12 gap-3.5 sm:gap-4 items-end">
        <div className="sm:col-span-6 lg:col-span-3 min-w-0">
          <Combobox
            label={deliveryMode === 'doorstep' ? 'Delivery region / hub base' : 'Pick-up hub'}
            placeholder="Select branch..."
            options={branchOptions}
            defaultSelectedKey={defaultBranchId ? String(defaultBranchId) : 'all'}
            selectedKey={selectedBranchId}
            onSelectionChange={(key) => setSelectedBranchId(key)}
          />
        </div>

        <div className="sm:col-span-6 lg:col-span-4 min-w-0">
          <DateRangePicker
            label="Rental dates"
            value={dateRange}
            onChange={(val) => {
              if (val) {
                setDateRange(val);
                setActivePreset(null);
              }
            }}
          />
        </div>

        <div className="sm:col-span-7 lg:col-span-3 min-w-0">
          <div className="grid grid-cols-2 gap-2">
            <TimePicker
              label="Pick-up"
              value={pickupTime}
              onChange={(val) => {
                if (val) setPickupTime(val);
              }}
            />
            <TimePicker
              label="Return"
              value={returnTime}
              onChange={(val) => {
                if (val) setReturnTime(val);
              }}
            />
          </div>
        </div>

        <div className="sm:col-span-5 lg:col-span-2 min-w-0">
          <Button
            type="submit"
            variant="racing"
            size="md"
            className="w-full"
            onClick={handleSubmit}
          >
            <span>Show cars</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {formError && (
        <div className="rounded-xs border border-danger/30 bg-danger-subtle px-3 py-1.5 text-caption font-medium text-danger">
          {formError}
        </div>
      )}
    </form>
  );
}
