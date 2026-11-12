import Link from 'next/link';
import { MoneyText } from '../primitives/MoneyText';
import { Plate } from '../primitives/Plate';
import { StatusBadge } from '../primitives/StatusBadge';
import { derivePaintTokens } from '../tokens/contrast';

export interface VehicleTileData {
  slug: string;
  make: string;
  model: string;
  variant?: string | null;
  year: number;
  plate: string;
  category: string;
  transmission: string;
  fuelType: string;
  seats: number;
  paintName: string;
  paintHex: string;
  primaryImageUrl?: string | null;
  primaryImageAlt?: string | null;
  totalMinor: number;
  dailyMinor: number;
  days: number;
  availabilityLabel?: string;
}

interface VehicleTileProps {
  vehicle: VehicleTileData;
  href: string;
  currency?: string;
}

/**
 * Primary catalog & availability lane vehicle card (§11.9).
 * Flat at rest (no shadow), image zoom inside overflow-hidden frame only.
 */
export function VehicleTile({ vehicle, href, currency = 'INR' }: VehicleTileProps) {
  const { paint, paintInk } = derivePaintTokens(vehicle.paintHex);

  return (
    <Link
      href={href}
      className="group block rounded-l border border-stone-200 bg-sheet overflow-hidden focus-visible:outline-none"
    >
      <div className="relative aspect-3/2 w-full overflow-hidden bg-stone-200">
        {vehicle.primaryImageUrl ? (
          <img
            src={vehicle.primaryImageUrl}
            alt={
              vehicle.primaryImageAlt ?? `${vehicle.make} ${vehicle.model} in ${vehicle.paintName}`
            }
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-102"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col justify-between p-4"
            style={{ backgroundColor: paint, color: paintInk }}
          >
            <span className="font-display-wide text-2">
              {vehicle.make} {vehicle.model}
            </span>
            <Plate code={vehicle.plate} size="sm" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-1 font-bold text-petrol-800">
              {vehicle.make} {vehicle.model}
              {vehicle.variant ? ` ${vehicle.variant}` : ''}
            </h3>
            <p className="text-m1 text-stone-500 mt-0.5">
              {vehicle.seats} seats, {vehicle.transmission}, {vehicle.fuelType}
            </p>
          </div>
          <StatusBadge status="ready" labelOverride={vehicle.availabilityLabel ?? 'Free'} />
        </div>

        <div className="flex items-baseline justify-between border-t border-stone-200 pt-3">
          <div>
            <MoneyText
              amountMinor={vehicle.totalMinor}
              currency={currency}
              size="large"
              className="text-2 text-petrol-800"
            />
            <span className="ml-1.5 text-m1 text-stone-500">
              for {vehicle.days} {vehicle.days === 1 ? 'day' : 'days'}
            </span>
          </div>
          <span className="text-m1 text-stone-500 tabular-nums">
            <MoneyText amountMinor={vehicle.dailyMinor} currency={currency} /> / day
          </span>
        </div>
      </div>
    </Link>
  );
}
