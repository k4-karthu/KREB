'use client';

import { CalendarDate, Time } from '@internationalized/date';
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dateRange.start || !dateRange.end) return;

    const startAt = toEpochMs(dateRange.start, pickupTime);
    const endAt = toEpochMs(dateRange.end, returnTime);

    const params = new URLSearchParams();
    if (selectedBranchId && selectedBranchId !== 'all') {
      params.set('branch', String(selectedBranchId));
    }
    params.set('start', String(startAt));
    params.set('end', String(endAt));

    router.push(`/cars?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full rounded-m border border-border bg-surface p-4 md:p-6 shadow-e2 ${className}`.trim()}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-4">
          <Combobox
            label="Pick-up hub"
            placeholder="Select branch..."
            options={branchOptions}
            defaultSelectedKey={defaultBranchId ? String(defaultBranchId) : 'all'}
            selectedKey={selectedBranchId}
            onSelectionChange={(key) => setSelectedBranchId(key)}
          />
        </div>

        <div className="md:col-span-3">
          <DateRangePicker
            label="Rental dates"
            value={dateRange}
            onChange={(val) => {
              if (val) setDateRange(val);
            }}
          />
        </div>

        <div className="md:col-span-3 grid grid-cols-2 gap-2">
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

        <div className="md:col-span-2">
          <Button type="submit" variant="primary" size="md" className="w-full">
            Show cars
          </Button>
        </div>
      </div>
    </form>
  );
}
