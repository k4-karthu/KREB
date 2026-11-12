import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { checkVehicleAvailable } from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { Gallery, type GalleryImage } from '@/ui/components/Gallery';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { SpecSheet } from '@/ui/components/SpecSheet';
import { Plate } from '@/ui/primitives/Plate';
import {
  type AddonOption,
  type ProtectionOption,
  VehicleDetailClient,
} from './VehicleDetailClient';

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const now = Date.now();
  const defaultStart =
    Math.floor((now + 86_400_000) / 86_400_000) * 86_400_000 + 4 * 3_600_000 + 1_800_000;
  const startAt = Number(sp.start) > now ? Number(sp.start) : defaultStart;
  const endAt = Number(sp.end) > startAt ? Number(sp.end) : startAt + 2 * 86_400_000;

  const { sqlite } = getReadConnection();
  const vehicle = sqlite
    .prepare(
      `
    SELECT v.*, b.name AS branch_name, b.address AS branch_address, b.slug AS branch_slug
    FROM vehicles v
    JOIN branches b ON b.id = v.current_branch_id
    WHERE v.slug = ? AND v.deleted_at IS NULL AND v.lifecycle = 'active'
  `,
    )
    .get(slug) as
    | {
        id: number;
        make: string;
        model: string;
        variant: string | null;
        year: number;
        plate: string;
        category: string;
        transmission: string;
        fuel_type: string;
        seats: number;
        doors: number | null;
        luggage_liters: number | null;
        engine_cc: number | null;
        battery_kwh: number | null;
        range_km: number | null;
        paint_name: string;
        paint_hex: string;
        km_per_day: number | null;
        extra_km_minor: number;
        min_driver_age: number;
        min_licence_years: number;
        current_branch_id: number;
        branch_name: string;
        branch_address: string;
        description: string | null;
      }
    | undefined;

  if (!vehicle) {
    notFound();
  }

  const images = sqlite
    .prepare(
      'SELECT id, file_key AS fileKey, alt_text AS altText, shot_type AS shotType FROM vehicle_images WHERE vehicle_id = ? ORDER BY is_primary DESC, sort_order ASC',
    )
    .all(vehicle.id) as GalleryImage[];

  const features = sqlite
    .prepare(
      'SELECT f.label FROM vehicle_features vf JOIN features f ON f.id = vf.feature_id WHERE vf.vehicle_id = ? ORDER BY f.sort_order ASC',
    )
    .all(vehicle.id) as Array<{ label: string }>;

  const reviews = sqlite
    .prepare(
      `
    SELECT r.rating_condition, r.rating_clean, r.rating_pickup, r.comment, u.name AS author_name
    FROM reviews r
    JOIN user u ON u.id = r.user_id
    WHERE r.vehicle_id = ? AND r.status = 'published'
    ORDER BY r.created_at DESC
    LIMIT 6
  `,
    )
    .all(vehicle.id) as Array<{
    rating_condition: number;
    rating_clean: number;
    rating_pickup: number;
    comment: string | null;
    author_name: string;
  }>;

  const addons = sqlite
    .prepare(
      'SELECT public_id AS publicId, name, description, price_type AS priceType, price_minor AS priceMinor, max_qty AS maxQty FROM addons WHERE is_active = 1 AND deleted_at IS NULL ORDER BY id ASC',
    )
    .all() as AddonOption[];

  const protectionPlans = sqlite
    .prepare(
      'SELECT public_id AS publicId, tier, name, summary, per_day_minor AS perDayMinor, excess_minor AS excessMinor FROM protection_plans WHERE is_active = 1 ORDER BY tier ASC',
    )
    .all() as ProtectionOption[];

  const siblingVariants = sqlite
    .prepare(
      `
    SELECT slug, variant, transmission, fuel_type, paint_name, paint_hex
    FROM vehicles
    WHERE make = ? AND model = ? AND id != ? AND lifecycle = 'active' AND deleted_at IS NULL
    ORDER BY id ASC
  `,
    )
    .all(vehicle.make, vehicle.model, vehicle.id) as Array<{
    slug: string;
    variant: string | null;
    transmission: string;
    fuel_type: string;
    paint_name: string;
    paint_hex: string;
  }>;

  const avail = checkVehicleAvailable(sqlite, vehicle.id, startAt, endAt);
  const quote = loadAndPriceVehicle(sqlite, {
    vehicleId: vehicle.id,
    pickupBranchId: vehicle.current_branch_id,
    returnBranchId: vehicle.current_branch_id,
    startAt,
    endAt,
    protectionPlanPublicId: protectionPlans[0]?.publicId,
    addonSelections: [],
  });

  const specItems = [
    { label: 'Transmission', value: vehicle.transmission },
    { label: 'Fuel', value: vehicle.fuel_type },
    { label: 'Seats', value: `${vehicle.seats}` },
    {
      label: 'Boot space',
      value: vehicle.luggage_liters ? `${vehicle.luggage_liters} L` : 'Standard',
    },
    {
      label: 'Distance limit',
      value: vehicle.km_per_day ? `${vehicle.km_per_day} km/day` : 'Unlimited km',
    },
    { label: 'Minimum age', value: `${vehicle.min_driver_age} years` },
    ...(vehicle.range_km ? [{ label: 'Certified range', value: `${vehicle.range_km} km` }] : []),
    ...(vehicle.engine_cc ? [{ label: 'Displacement', value: `${vehicle.engine_cc} cc` }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4 text-xs text-ink-muted">
          <Link href={`/cars?start=${startAt}&end=${endAt}`} className="hover:text-ink">
            Available fleet
          </Link>{' '}
          /{' '}
          <span className="text-ink">
            {vehicle.make} {vehicle.model}
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-7">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                  <p className="text-sm text-ink-muted">
                    {vehicle.variant ?? vehicle.category} — Pick-up at {vehicle.branch_name}
                  </p>
                </div>
                <Plate code={vehicle.plate} paintHex={vehicle.paint_hex} />
              </div>

              <Gallery
                images={images}
                paintName={vehicle.paint_name}
                paintHex={vehicle.paint_hex}
                vehicleTitle={`${vehicle.make} ${vehicle.model}`}
              />
            </div>

            {vehicle.description && (
              <p className="text-base leading-relaxed text-ink">{vehicle.description}</p>
            )}

            {siblingVariants.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-ink">
                  Other {vehicle.make} {vehicle.model} options
                </h2>
                <div className="flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center gap-2 rounded-s border border-petrol-600 bg-petrol-100 px-3 py-2 text-xs font-semibold text-petrol-900">
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-line"
                      style={{ backgroundColor: vehicle.paint_hex }}
                    />
                    {vehicle.variant ?? 'Standard'} ({vehicle.transmission}, {vehicle.fuel_type})
                  </span>
                  {siblingVariants.map((sv) => (
                    <Link
                      key={sv.slug}
                      href={`/cars/${sv.slug}?start=${startAt}&end=${endAt}`}
                      className="inline-flex items-center gap-2 rounded-s border border-line bg-surface px-3 py-2 text-xs font-medium text-ink hover:border-petrol-600"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-line"
                        style={{ backgroundColor: sv.paint_hex }}
                      />
                      {sv.variant ?? 'Standard'} ({sv.transmission}, {sv.fuel_type})
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-ink">Technical sheet</h2>
              <SpecSheet rows={specItems} />
            </section>

            {features.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-ink">Equipment included</h2>
                <div className="flex flex-wrap gap-2">
                  {features.map((f) => (
                    <span
                      key={f.label}
                      className="rounded-s border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink"
                    >
                      {f.label}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {reviews.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold text-ink">Verified driver notes</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {reviews.map((rev, i) => (
                    <div
                      key={`${rev.author_name}-${i}`}
                      className="rounded-m border border-line bg-surface p-4 text-sm"
                    >
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span className="font-semibold text-ink">{rev.author_name}</span>
                        <span>Condition {rev.rating_condition}/5</span>
                      </div>
                      {rev.comment && <p className="mt-2 text-xs text-ink-muted">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:col-span-5">
            <VehicleDetailClient
              vehicleId={vehicle.id}
              pickupBranchId={vehicle.current_branch_id}
              startAt={startAt}
              endAt={endAt}
              initialAvailable={avail.ok}
              initialLines={quote.lines}
              initialTotalMinor={quote.totalMinor}
              initialDepositMinor={quote.depositMinor}
              addons={addons}
              protectionPlans={protectionPlans}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
