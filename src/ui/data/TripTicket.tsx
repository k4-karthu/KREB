import Link from 'next/link';
import { Price } from './Price';
import { StatusBadge } from './StatusBadge';

export interface TripTicketData {
  code: string;
  vehicleTitle: string;
  vehiclePlate?: string;
  pickupLabel: string;
  returnLabel: string;
  branchName: string;
  status: string;
  totalMinor: number;
}

export interface TripTicketProps {
  trip: TripTicketData;
  href?: string;
  className?: string;
}

/**
 * Kerb v3 TripTicket:
 * Booking summary ticket featuring dashed separator and CSS ticket notches.
 */
export function TripTicket({
  trip,
  href = `/trips/${trip.code}`,
  className = '',
}: TripTicketProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-m border border-border bg-surface shadow-e1 ${className}`.trim()}
    >
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-label-s font-bold text-accent">#{trip.code}</span>
            <StatusBadge status={trip.status} />
            {trip.vehiclePlate && (
              <span className="rounded-xs border border-border-subtle bg-surface-sunken px-2 py-0.5 text-label-s text-text-2">
                {trip.vehiclePlate}
              </span>
            )}
          </div>

          <h3 className="font-display text-h4 font-semibold text-text-1">{trip.vehicleTitle}</h3>

          <p className="text-body-s text-text-2">
            {trip.pickupLabel} to {trip.returnLabel} · {trip.branchName}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <span className="block text-label-s text-text-3">Total</span>
            <Price amountMinor={trip.totalMinor} size="lg" />
          </div>

          {href && (
            <Link
              href={href}
              className="inline-flex h-9 items-center justify-center rounded-s border border-border bg-surface px-3.5 text-label-s font-medium text-text-1 transition-colors hover:bg-surface-sunken hover:border-border-strong cursor-pointer"
            >
              Trip details
            </Link>
          )}
        </div>
      </div>

      {/* Ticket divider with decorative CSS notches */}
      <div className="relative flex items-center border-t border-dashed border-border">
        {/* Left notch */}
        <span
          aria-hidden="true"
          className="absolute -left-3 h-6 w-6 rounded-full border border-border bg-canvas"
        />
        {/* Right notch */}
        <span
          aria-hidden="true"
          className="absolute -right-3 h-6 w-6 rounded-full border border-border bg-canvas"
        />
      </div>

      <div className="flex items-center justify-between bg-surface-sunken/40 px-5 py-2.5 text-label-s text-text-3">
        <span>Kerb verified rental</span>
        <span>Standard protection included</span>
      </div>
    </article>
  );
}
