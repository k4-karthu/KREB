import { getReadConnection } from '@/db/client';
import { ShowroomHall, type ShowroomVehicle } from '@/ui/components/collection/ShowroomHall';
import { HomeSearchWidget } from '@/ui/components/HomeSearchWidget';
import { LiveReceiptSection } from '@/ui/components/LiveReceiptSection';
import { SiteFooter } from '@/ui/components/SiteFooter';
import { SiteHeader } from '@/ui/components/SiteHeader';
import { Accordion, type AccordionItemData } from '@/ui/data/Accordion';

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

interface RawVehicleRow {
  id: number;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  luggageLiters: number | null;
  engineCc: number | null;
  batteryKwh: number | null;
  rangeKm: number | null;
  plate: string;
  dailyMinor: number;
  primaryImageUrl: string | null;
  primaryImageAlt: string | null;
  thumbhash: string | null;
}

interface RawBranchRow {
  id: number;
  slug: string;
  name: string;
  city: string;
  address: string;
  allows_after_hours: number;
}

const FAQ_ITEMS: AccordionItemData[] = [
  {
    id: 'cancellation',
    title: 'What is the cancellation and refund policy?',
    content: (
      <p className="text-body-s text-text-2">
        Full 100% refund for cancellations made more than 48 hours before scheduled pick-up.
        Cancellations between 24 and 48 hours receive a 75% refund, and between 6 and 24 hours
        receive a 50% refund. All refunds are initiated automatically to your original payment
        method.
      </p>
    ),
  },
  {
    id: 'grace-period',
    title: 'What happens if I encounter Outer Ring Road delays when returning?',
    content: (
      <p className="text-body-s text-text-2">
        Kerb provides an automatic 59-minute return grace period with zero late fees across all
        Bengaluru hubs. If you anticipate a longer delay, you can extend your rental window directly
        from your trips dashboard before scheduled return.
      </p>
    ),
  },
  {
    id: 'fuel-policy',
    title: 'How does the fuel and charge policy work?',
    content: (
      <p className="text-body-s text-text-2">
        Every vehicle is handed over with its fuel tank level logged in eighths on your physical and
        digital slip (or at 90%+ state of charge for electric vehicles). Simply return at the same
        level. If returned lower, fuel is billed at actual pump cost without surcharge.
      </p>
    ),
  },
  {
    id: 'deposit-release',
    title: 'When is the refundable security deposit returned?',
    content: (
      <p className="text-body-s text-text-2">
        Upon return walkaround and odometer confirmation, our counter agent completes the return
        slip. Clean, on-time returns trigger an automated deposit release within 5 working days.
      </p>
    ),
  },
  {
    id: 'required-docs',
    title: 'What documentation is required to drive?',
    content: (
      <p className="text-body-s text-text-2">
        A valid Indian driving licence (held for at least 1 year) and a government-issued photo ID.
        Documents are verified once via our secure KYC check, skipping counter checks on all
        subsequent bookings.
      </p>
    ),
  },
];

const SERVICE_STEPS = [
  {
    number: '01',
    title: 'Lock a signed quote',
    description:
      'Hold your exact car for 15 minutes while you review details and complete KYC. Zero price movement.',
  },
  {
    number: '02',
    title: 'Verify your licence once',
    description:
      'Verified drivers skip document queues on every future trip with secure encrypted storage.',
  },
  {
    number: '03',
    title: 'Walk-around together',
    description:
      'Odometer, fuel level by eighths, and existing marks are confirmed and signed digitally in 60 seconds.',
  },
  {
    number: '04',
    title: 'Automated deposit release',
    description:
      'On-time returns with matching fuel trigger an automatic security deposit release within 5 working days.',
  },
];

export default async function HomePage() {
  const { sqlite } = getReadConnection();
  const { startAt, endAt } = defaultSearchWindow();

  const branches = sqlite
    .prepare(
      'SELECT id, slug, name, city, address, allows_after_hours FROM branches WHERE deleted_at IS NULL AND is_active = 1 ORDER BY id ASC',
    )
    .all() as RawBranchRow[];

  const rawVehicles = sqlite
    .prepare(`
      SELECT
        v.id,
        v.slug,
        v.make,
        v.model,
        v.variant,
        v.year,
        v.category,
        v.transmission,
        v.fuel_type AS fuelType,
        v.seats,
        v.luggage_liters AS luggageLiters,
        v.engine_cc AS engineCc,
        v.battery_kwh AS batteryKwh,
        v.range_km AS rangeKm,
        v.plate,
        rp.base_daily_minor AS dailyMinor,
        CASE
          WHEN vi.file_key IS NOT NULL THEN '/api/uploads/public/' || vi.file_key || '-1280.webp'
          ELSE NULL
        END AS primaryImageUrl,
        vi.alt_text AS primaryImageAlt,
        vi.thumbhash
      FROM vehicles v
      JOIN rate_plans rp ON rp.id = v.rate_plan_id
      LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_primary = 1
      WHERE v.deleted_at IS NULL AND v.lifecycle = 'active'
      ORDER BY v.id ASC
    `)
    .all() as RawVehicleRow[];

  const showroomVehicles: ShowroomVehicle[] = rawVehicles.map((v) => ({
    id: v.id,
    slug: v.slug,
    make: v.make,
    model: v.model,
    variant: v.variant,
    year: v.year,
    category: v.category,
    transmission: v.transmission,
    fuelType: v.fuelType,
    seats: v.seats,
    dailyMinor: v.dailyMinor,
    primaryImageUrl: v.primaryImageUrl,
    primaryImageAlt: v.primaryImageAlt ?? `${v.make} ${v.model}`,
    thumbhash: v.thumbhash ?? undefined,
    plate: v.plate,
    specs: {
      rangeKm: v.rangeKm ?? undefined,
      batteryKwh: v.batteryKwh ?? undefined,
      luggageLiters: v.luggageLiters ?? undefined,
      engineCc: v.engineCc ?? undefined,
    },
  }));

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text-1">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section: 12-column grid, display-xl Bricolage Grotesque typography, zero native controls */}
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
          <div className="space-y-6 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-xs border border-border bg-surface px-3 py-1 text-caption font-medium text-text-3">
              <span>Bengaluru verified self-drive fleet</span>
              <span aria-hidden="true">|</span>
              <span>18 inspected cars</span>
            </div>

            <h1
              className="font-display font-bold text-text-1"
              style={{
                fontSize: 'clamp(2.5rem, 5.5vw, 4.75rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.02em',
              }}
            >
              Cars that are genuinely free on your dates, priced to the last rupee.
            </h1>

            <p className="max-w-2xl text-body-l text-text-2">
              Every vehicle shown is verified against live bay schedules and turnaround buffers. The
              figure on the result card is the exact amount you pay.
            </p>
          </div>

          <div className="mt-10">
            <HomeSearchWidget branches={branches} defaultStartAt={startAt} defaultEndAt={endAt} />
          </div>
        </section>

        {/* Showroom Hall: Flagship collection hall with category rail and car studio plate presentation */}
        <section className="border-t border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
            <div className="space-y-3 max-w-2xl">
              <span className="text-caption font-semibold text-accent">Fleet showroom</span>
              <h2 className="font-display text-h1 font-bold tracking-tight text-text-1">
                Explore the Bengaluru fleet
              </h2>
              <p className="text-body text-text-2">
                Real physical inventory with verified paint finishes, registration plates, and
                transparent daily rates.
              </p>
            </div>

            <ShowroomHall vehicles={showroomVehicles.length > 0 ? showroomVehicles : undefined} />
          </div>
        </section>

        {/* Live Interactive Receipt Preview Section: Thermal quote slip with live calculations */}
        <LiveReceiptSection />

        {/* Service Steps: Editorial sequence from curb to ignition */}
        <section className="border-t border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="space-y-3 max-w-2xl mb-12">
              <span className="text-caption font-semibold text-accent">Rental sequence</span>
              <h2 className="font-display text-h1 font-bold tracking-tight text-text-1">
                Four minutes from curb to ignition
              </h2>
              <p className="text-body text-text-2">
                A structured handover designed around clarity, recorded vehicle condition, and rapid
                bay dispatch.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-4">
              {SERVICE_STEPS.map((step) => (
                <div key={step.number} className="space-y-3 border-t-2 border-accent pt-4">
                  <span className="font-display text-caption font-bold text-accent">
                    Step {step.number}
                  </span>
                  <h3 className="font-display text-body-l font-semibold text-text-1">
                    {step.title}
                  </h3>
                  <p className="text-body-s text-text-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Branch Locations Section: Three Bengaluru hubs with clean calm typography */}
        <section className="border-t border-border bg-surface-sunken py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="space-y-3 max-w-2xl mb-12">
              <span className="text-caption font-semibold text-accent">Pickup network</span>
              <h2 className="font-display text-h1 font-bold tracking-tight text-text-1">
                Three Bengaluru hubs
              </h2>
              <p className="text-body text-text-2">
                Strategically located for city errands, tech corridors, and terminal departures.
                Every hub features dedicated parking bays and staff inspection lanes.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="rounded-m border border-border bg-surface p-6 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <h3 className="font-display text-h3 font-semibold text-text-1">{b.name}</h3>
                    <p className="text-body-s text-text-2">{b.address}</p>
                  </div>

                  <div className="pt-6 border-t border-border-subtle mt-6 space-y-1.5 text-caption text-text-3">
                    <div>
                      Operating hours:{' '}
                      {b.allows_after_hours === 1
                        ? '24/7 (After-hours ready)'
                        : '06:00 – 23:00 daily'}
                    </div>
                    <div>Dedicated handover bays</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section: Accordion with plain-language rules */}
        <section className="border-t border-border bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="space-y-3 max-w-2xl mb-10">
              <span className="text-caption font-semibold text-accent">Plain-language rules</span>
              <h2 className="font-display text-h1 font-bold tracking-tight text-text-1">
                Frequently asked questions
              </h2>
              <p className="text-body text-text-2">
                Transparent terms with zero hidden fees and automated deposit release.
              </p>
            </div>

            <Accordion items={FAQ_ITEMS} allowsMultiple />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
