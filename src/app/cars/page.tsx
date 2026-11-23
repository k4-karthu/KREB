import { Suspense } from 'react';
import { getReadConnection } from '@/db/client';
import {
  searchAvailableVehicles,
  validateBranchHoursAndLimits,
} from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import type { VehicleTileData } from '@/ui/data/VehicleTile';
import { CarsClient } from './CarsClient';

export const dynamic = 'force-dynamic';

export interface BranchOption {
  id: number;
  name: string;
  city: string;
}

export default async function CarsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const now = Date.now();
  const defaultStart =
    Math.floor((now + 86_400_000) / 86_400_000) * 86_400_000 + 4 * 3_600_000 + 1_800_000;
  const startAt = Number(sp.start) > 0 ? Number(sp.start) : defaultStart;
  const endAt = Number(sp.end) > startAt ? Number(sp.end) : startAt + 2 * 86_400_000;

  const branchId = sp.branch ? Number(sp.branch) : undefined;
  const category = typeof sp.category === 'string' ? sp.category : 'all';
  const transmission = typeof sp.transmission === 'string' ? sp.transmission : 'all';
  const fuel = typeof sp.fuel === 'string' ? sp.fuel : 'all';
  const sort = sp.sort === 'price_asc' || sp.sort === 'price_desc' ? sp.sort : 'recommended';

  const { sqlite } = getReadConnection();
  const branches = sqlite
    .prepare(
      'SELECT id, name, city FROM branches WHERE deleted_at IS NULL AND is_active = 1 ORDER BY id ASC',
    )
    .all() as BranchOption[];

  let validationMessage: string | undefined;
  if (branchId) {
    const val = validateBranchHoursAndLimits(sqlite, branchId, branchId, startAt, endAt);
    if (!val.ok) validationMessage = val.message;
  }

  const available = searchAvailableVehicles(sqlite, {
    startAt,
    endAt,
    pickupBranchId: branchId,
    category: category !== 'all' ? category : undefined,
    transmission: transmission !== 'all' ? transmission : undefined,
    fuelType: fuel !== 'all' ? fuel : undefined,
    sort,
  });

  const pricedTiles: VehicleTileData[] = available.map((veh) => {
    const quote = loadAndPriceVehicle(sqlite, {
      vehicleId: veh.id,
      pickupBranchId: veh.currentBranchId,
      returnBranchId: veh.currentBranchId,
      startAt,
      endAt,
      addonSelections: [],
    });
    return {
      slug: veh.slug,
      make: veh.make,
      model: veh.model,
      variant: veh.variant,
      category: veh.category,
      transmission: veh.transmission,
      fuelType: veh.fuelType,
      seats: veh.seats,
      primaryImageUrl: veh.primaryImageUrl,
      primaryImageAlt: veh.primaryImageAlt,
      thumbhash: veh.primaryThumbhash,
      dailyMinor: Math.round(quote.totalMinor / Math.max(1, quote.billableDays)),
      status: 'ready',
    };
  });

  if (sort === 'price_asc') {
    pricedTiles.sort((a, b) => a.dailyMinor - b.dailyMinor);
  } else if (sort === 'price_desc') {
    pricedTiles.sort((a, b) => b.dailyMinor - a.dailyMinor);
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-7xl px-4 py-16 text-center text-body-s text-text-3 sm:px-6">
              Loading available fleet...
            </div>
          }
        >
          <CarsClient
            branches={branches}
            vehicles={pricedTiles}
            startAt={startAt}
            endAt={endAt}
            selectedBranchId={branchId}
            selectedCategory={category}
            selectedTransmission={transmission}
            selectedFuel={fuel}
            selectedSort={sort}
            validationMessage={validationMessage}
          />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
