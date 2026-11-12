import Link from 'next/link';
import { getReadConnection } from '@/db/client';
import { searchAvailableVehicles } from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { AvailabilityLane } from '@/ui/components/AvailabilityLane';
import { DateTimeRange } from '@/ui/components/DateTimeRange';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import type { VehicleTileData } from '@/ui/components/VehicleTile';
import { LaneLine } from '@/ui/motion/LaneLine';
import { Plate } from '@/ui/primitives/Plate';

export const dynamic = 'force-dynamic';

function defaultSearchWindow() {
  const now = Date.now();
  const tomorrow10amIst =
    Math.floor((now + 86_400_000) / 86_400_000) * 86_400_000 + 4 * 3_600_000 + 1_800_000;
  return {
    startAt: tomorrow10amIst,
    endAt: tomorrow10amIst + 2 * 86_400_000,
  };
}

export default async function HomePage() {
  const { sqlite } = getReadConnection();
  const { startAt, endAt } = defaultSearchWindow();

  const branches = sqlite
    .prepare(
      'SELECT id, slug, name, city, address, allows_after_hours FROM branches WHERE deleted_at IS NULL AND is_active = 1 ORDER BY id ASC',
    )
    .all() as Array<{
    id: number;
    slug: string;
    name: string;
    city: string;
    address: string;
    allows_after_hours: number;
  }>;

  const available = searchAvailableVehicles(sqlite, {
    startAt,
    endAt,
    sort: 'recommended',
  }).slice(0, 6);

  const laneVehicles: VehicleTileData[] = available.map((veh) => {
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
      year: veh.year,
      plate: veh.plate,
      category: veh.category,
      transmission: veh.transmission,
      fuelType: veh.fuelType,
      seats: veh.seats,
      paintName: veh.paintName,
      paintHex: veh.paintHex,
      primaryImageUrl: veh.primaryImageUrl,
      primaryImageAlt: veh.primaryImageAlt,
      totalMinor: quote.totalMinor,
      dailyMinor: Math.round(quote.totalMinor / Math.max(1, quote.billableDays)),
      days: quote.billableDays,
      availabilityLabel: veh.branchName,
    };
  });

  const featured = laneVehicles[0];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="space-y-5 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-s border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
                <span>Bengaluru self-drive fleet</span>
                <span>18 inspected cars</span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                Cars that are genuinely free on your dates, priced to the last rupee.
              </h1>
              <p className="max-w-xl text-base text-ink-muted">
                Every vehicle shown is verified against live bay schedules and turnaround buffers.
                The figure on the result card is the exact amount you pay.
              </p>
            </div>

            {featured && (
              <div className="rounded-m border border-line bg-surface p-4 lg:col-span-5">
                <div className="relative aspect-3-2 overflow-hidden rounded-s bg-surface-subtle">
                  {featured.primaryImageUrl && (
                    <img
                      src={featured.primaryImageUrl}
                      alt={featured.primaryImageAlt ?? `${featured.make} ${featured.model}`}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-1 w-full"
                    style={{ backgroundColor: featured.paintHex }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-ink">
                      {featured.make} {featured.model}
                    </div>
                    <div className="text-xs text-ink-muted">{featured.availabilityLabel}</div>
                  </div>
                  <Plate code={featured.plate} size="sm" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-8">
            <DateTimeRange branches={branches} defaultStartAt={startAt} defaultEndAt={endAt} />
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <LaneLine />
        </div>

        {/* Live Availability Lane */}
        <section className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Ready for a 48-hour pick-up tomorrow
              </h2>
              <p className="text-sm text-ink-muted">
                All prices include 18% GST and standard roadside cover.
              </p>
            </div>
            <Link
              href={`/cars?start=${startAt}&end=${endAt}`}
              className="text-sm font-medium text-petrol-700 hover:underline"
            >
              Browse full available fleet
            </Link>
          </div>

          <AvailabilityLane vehicles={laneVehicles} startAt={startAt} endAt={endAt} />
        </section>

        {/* Fleet by use (Asymmetric 7/5) */}
        <section className="border-y border-line bg-surface-subtle py-14">
          <div className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
              Picked for how Bengaluru actually drives
            </h2>
            <div className="grid gap-5 md:grid-cols-12">
              <Link
                href={`/cars?category=hatchback&start=${startAt}&end=${endAt}`}
                className="flex flex-col justify-between rounded-m border border-line bg-surface p-6 hover:border-petrol-600 md:col-span-7"
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-petrol-700">CITY COMPACTS</span>
                  <h3 className="font-display text-xl font-bold text-ink">
                    Automatic hatchbacks for tight lanes
                  </h3>
                  <p className="text-sm text-ink-muted">
                    Swift AMT, i20 IVT, and Altroz Diesel. Short turning radii with Apple CarPlay
                    and FASTag ready.
                  </p>
                </div>
                <span className="mt-6 text-xs font-semibold text-ink">View hatchbacks</span>
              </Link>

              <Link
                href={`/cars?category=ev&start=${startAt}&end=${endAt}`}
                className="flex flex-col justify-between rounded-m border border-line bg-surface p-6 hover:border-petrol-600 md:col-span-5"
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-petrol-700">ELECTRIC</span>
                  <h3 className="font-display text-xl font-bold text-ink">
                    Unlimited-km quiet EVs
                  </h3>
                  <p className="text-sm text-ink-muted">
                    BYD Atto 3, IONIQ 5, and Nexon.ev handed over at 90%+ state of charge.
                  </p>
                </div>
                <span className="mt-6 text-xs font-semibold text-ink">View EVs</span>
              </Link>

              <Link
                href={`/cars?category=suv&start=${startAt}&end=${endAt}`}
                className="flex flex-col justify-between rounded-m border border-line bg-surface p-6 hover:border-petrol-600 md:col-span-5"
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-petrol-700">GHAT & HIGHWAY</span>
                  <h3 className="font-display text-xl font-bold text-ink">SUVs & AWD tourers</h3>
                  <p className="text-sm text-ink-muted">
                    XUV700 AWD, Creta Diesel AT, Hyryder Hybrid, and Thar 4x4 for Coorg or
                    Chikmagalur.
                  </p>
                </div>
                <span className="mt-6 text-xs font-semibold text-ink">View SUVs</span>
              </Link>

              <Link
                href={`/cars?category=sedan&start=${startAt}&end=${endAt}`}
                className="flex flex-col justify-between rounded-m border border-line bg-surface p-6 hover:border-petrol-600 md:col-span-7"
              >
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-petrol-700">LONG HAUL</span>
                  <h3 className="font-display text-xl font-bold text-ink">
                    Highway sedans & 7-seat MUVs
                  </h3>
                  <p className="text-sm text-ink-muted">
                    City e:HEV Hybrid, Slavia 1.5 TSI, and Innova Hycross with generous 521L boots
                    and captain seats.
                  </p>
                </div>
                <span className="mt-6 text-xs font-semibold text-ink">View sedans</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 4-step pickup sequence */}
        <section className="mx-auto max-w-6xl space-y-8 px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            Four minutes from curb to ignition
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                '01',
                'Lock a signed quote',
                'Hold your exact car for 15 minutes while you complete KYC and payment.',
              ],
              [
                '02',
                'Upload your licence once',
                'Verified drivers skip document checks on every future booking.',
              ],
              [
                '03',
                'Walk-around together',
                'Odometer, fuel eighths, and any existing marks are signed on a tablet.',
              ],
              [
                '04',
                'Automatic deposit release',
                'Clean on-time returns release the refundable hold within 5 working days.',
              ],
            ].map(([num, title, desc]) => (
              <div key={num} className="space-y-2 rounded-m border border-line bg-surface p-5">
                <span className="font-mono text-xs font-bold text-petrol-700">{num}</span>
                <h3 className="text-base font-semibold text-ink">{title}</h3>
                <p className="text-sm text-ink-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Branches & Policy summary */}
        <section className="border-t border-line bg-surface-subtle py-12">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink">Three Bengaluru hubs</h2>
              <div className="space-y-3">
                {branches.map((b) => (
                  <div key={b.id} className="rounded-s border border-line bg-surface p-3.5 text-sm">
                    <div className="flex items-center justify-between font-semibold text-ink">
                      <span>{b.name}</span>
                      {b.allows_after_hours === 1 && (
                        <span className="rounded-s bg-go-100 px-2 py-0.5 text-xs text-petrol-800">
                          After-hours ready
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">{b.address}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-ink">Plain-language rules</h2>
              <div className="space-y-2">
                <details className="rounded-s border border-line bg-surface p-3.5 text-sm">
                  <summary className="cursor-pointer font-medium text-ink">
                    Free cancellation up to 48 hours before pick-up
                  </summary>
                  <p className="mt-2 text-xs text-ink-muted">
                    100% refund more than 48 hours before pick-up, 75% between 24 and 48 hours, and
                    50% between 6 and 24 hours.
                  </p>
                </details>
                <details className="rounded-s border border-line bg-surface p-3.5 text-sm">
                  <summary className="cursor-pointer font-medium text-ink">
                    59-minute return grace period
                  </summary>
                  <p className="mt-2 text-xs text-ink-muted">
                    Stuck on Outer Ring Road? Up to 59 minutes past your scheduled return carries
                    zero late fee.
                  </p>
                </details>
                <details className="rounded-s border border-line bg-surface p-3.5 text-sm">
                  <summary className="cursor-pointer font-medium text-ink">
                    Same-level fuel policy
                  </summary>
                  <p className="mt-2 text-xs text-ink-muted">
                    Return with the same eighth-tank mark shown on your checkout sheet to avoid
                    refuelling charges.
                  </p>
                </details>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
