import Link from 'next/link';
import { CarStudioImage } from '../components/CarStudioImage';
import { Price } from './Price';
import { StatusBadge } from './StatusBadge';

export interface VehicleTileData {
  slug: string;
  make: string;
  model: string;
  variant?: string | null;
  category: string;
  transmission?: string;
  fuelType?: string;
  seats?: number;
  primaryImageUrl?: string | null;
  primaryImageAlt?: string | null;
  thumbhash?: string | null;
  dailyMinor: number;
  status?: string;
}

export interface VehicleTileProps {
  vehicle: VehicleTileData;
  href?: string;
  className?: string;
  priority?: boolean;
}

/**
 * Kerb v3 VehicleTile:
 * 3:2 CarStudioImage card, vehicle name, category, price/day, and hover e2 elevation lift.
 */
export function VehicleTile({
  vehicle,
  href = `/cars/${vehicle.slug}`,
  className = '',
  priority = false,
}: VehicleTileProps) {
  const title = `${vehicle.make} ${vehicle.model}`;

  const content = (
    <article
      className={`group block overflow-hidden rounded-l border border-border bg-surface shadow-e0 transition-all duration-200 ease-out hover:border-titanium-dark/40 hover:shadow-e2 ${className}`.trim()}
    >
      <div className="relative aspect-3/2 w-full overflow-hidden bg-plate">
        {vehicle.primaryImageUrl ? (
          <CarStudioImage
            src={vehicle.primaryImageUrl}
            alt={vehicle.primaryImageAlt ?? title}
            thumbhash={vehicle.thumbhash ?? undefined}
            priority={priority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-sunken text-label-s text-text-3">
            No image available
          </div>
        )}

        {vehicle.status && (
          <div className="absolute top-3 right-3">
            <StatusBadge status={vehicle.status} />
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-label-s font-medium text-text-3">
              <span>{vehicle.category}</span>
              {vehicle.variant && (
                <>
                  <span className="text-border-strong font-technical">{'//'}</span>
                  <span className="truncate">{vehicle.variant}</span>
                </>
              )}
            </div>
            <h3 className="font-display text-h4 font-semibold text-text-1 group-hover:text-racing-cobalt transition-colors mt-0.5">
              {title}
            </h3>
          </div>

          <div className="text-right shrink-0">
            <Price amountMinor={vehicle.dailyMinor} period="/day" size="md" />
          </div>
        </div>

        {(vehicle.transmission || vehicle.fuelType || vehicle.seats) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3.5 text-label-s text-text-2">
            {vehicle.transmission && (
              <span className="rounded-xs border border-border-subtle bg-surface-sunken px-2 py-0.5 font-technical text-caption">
                {vehicle.transmission}
              </span>
            )}
            {vehicle.fuelType && (
              <span className="rounded-xs border border-border-subtle bg-surface-sunken px-2 py-0.5 font-technical text-caption">
                {vehicle.fuelType}
              </span>
            )}
            {vehicle.seats && (
              <span className="rounded-xs border border-border-subtle bg-surface-sunken px-2 py-0.5 font-technical text-caption tabular-nums">
                {vehicle.seats} seats
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block focus-visible:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
