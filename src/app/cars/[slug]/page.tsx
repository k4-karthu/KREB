import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReadConnection } from '@/db/client';
import { checkVehicleAvailable } from '@/domain/availability/availability';
import { loadAndPriceVehicle } from '@/domain/pricing/pricing';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import type { GalleryImageItem } from '@/ui/data/Gallery';
import { Plate } from '@/ui/data/Plate';
import type { SpecRow } from '@/ui/data/SpecSheet';
import {
  type AddonOption,
  type ProtectionOption,
  VehicleDetailClient,
} from './VehicleDetailClient';

interface RawVehicleImage {
  id: number;
  fileKey: string;
  altText: string | null;
  shotType: string | null;
  thumbhash: string | null;
}

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

  const rawImages = sqlite
    .prepare(
      'SELECT id, file_key AS fileKey, alt_text AS altText, shot_type AS shotType, thumbhash FROM vehicle_images WHERE vehicle_id = ? ORDER BY is_primary DESC, sort_order ASC',
    )
    .all(vehicle.id) as RawVehicleImage[];

  const galleryImages: GalleryImageItem[] = rawImages.map((img) => ({
    id: img.id,
    src: `/api/uploads/public/${img.fileKey}-1280.webp`,
    alt: img.altText || `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    thumbhash: img.thumbhash ?? undefined,
  }));

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
  const initialQuote = loadAndPriceVehicle(sqlite, {
    vehicleId: vehicle.id,
    pickupBranchId: vehicle.current_branch_id,
    returnBranchId: vehicle.current_branch_id,
    startAt,
    endAt,
    protectionPlanPublicId: protectionPlans[0]?.publicId,
    addonSelections: [],
  });

  const specItems: SpecRow[] = [
    { label: 'Body style', value: vehicle.category },
    { label: 'Transmission', value: vehicle.transmission },
    { label: 'Fuel & powertrain', value: vehicle.fuel_type },
    { label: 'Seating capacity', value: `${vehicle.seats} seats` },
    {
      label: 'Boot luggage space',
      value: vehicle.luggage_liters ? `${vehicle.luggage_liters} L` : 'Standard luggage capacity',
    },
    {
      label: 'Kilometre allowance',
      value: vehicle.km_per_day ? `${vehicle.km_per_day} km/day included` : 'Unlimited kilometres',
    },
    {
      label: 'Extra kilometre charge',
      value: vehicle.extra_km_minor
        ? `₹${Math.round(vehicle.extra_km_minor / 100)}/km`
        : 'No extra charge',
    },
    { label: 'Minimum driver age', value: `${vehicle.min_driver_age} years` },
    {
      label: 'Driving experience',
      value: `${vehicle.min_licence_years} year${vehicle.min_licence_years === 1 ? '' : 's'} licence`,
    },
    ...(vehicle.doors ? [{ label: 'Doors', value: `${vehicle.doors} doors` }] : []),
    ...(vehicle.range_km
      ? [{ label: 'Certified range', value: `${vehicle.range_km} km (WLTP)` }]
      : []),
    ...(vehicle.engine_cc
      ? [{ label: 'Engine displacement', value: `${vehicle.engine_cc} cc` }]
      : []),
    ...(vehicle.battery_kwh
      ? [{ label: 'Battery capacity', value: `${vehicle.battery_kwh} kWh` }]
      : []),
    { label: 'Exterior studio paint', value: vehicle.paint_name },
    { label: 'Pick-up hub location', value: vehicle.branch_name },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumbs"
          className="mb-6 flex items-center gap-2 text-label-s text-text-3"
        >
          <Link
            href={`/cars?start=${startAt}&end=${endAt}`}
            className="hover:text-text-1 transition-colors"
          >
            Available fleet
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-text-1 font-medium">
            {vehicle.make} {vehicle.model}
          </span>
        </nav>

        {/* Title Header with Plate */}
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-h2 sm:text-h1 font-bold tracking-tight text-text-1">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-body text-text-2">
              {vehicle.variant ? `${vehicle.variant} · ` : ''}
              {vehicle.category} — Pick-up at {vehicle.branch_name}
            </p>
          </div>
          <Plate code={vehicle.plate} size="md" />
        </header>

        {/* Client Interactive Configuration & Sticky Summary */}
        <VehicleDetailClient
          vehicle={{
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            variant: vehicle.variant,
            year: vehicle.year,
            plate: vehicle.plate,
            category: vehicle.category,
            transmission: vehicle.transmission,
            fuel_type: vehicle.fuel_type,
            branch_name: vehicle.branch_name,
            paint_name: vehicle.paint_name,
            paint_hex: vehicle.paint_hex,
          }}
          galleryImages={galleryImages}
          description={vehicle.description}
          specItems={specItems}
          siblingVariants={siblingVariants}
          features={features}
          reviews={reviews}
          pickupBranchId={vehicle.current_branch_id}
          startAt={startAt}
          endAt={endAt}
          initialAvailable={avail.ok}
          initialQuote={initialQuote}
          addons={addons}
          protectionPlans={protectionPlans}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
