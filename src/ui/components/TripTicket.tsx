import Link from 'next/link';
import { MoneyText } from '../primitives/MoneyText';
import { Plate } from '../primitives/Plate';
import { StatusBadge } from '../primitives/StatusBadge';

export interface TripTicketData {
  code: string;
  vehicleTitle: string;
  vehiclePlate: string;
  paintHex: string;
  pickupLabel: string;
  returnLabel: string;
  branchName: string;
  status: string;
  totalMinor: number;
  currency?: string;
}

export function TripTicket({ trip }: { trip: TripTicketData }) {
  return (
    <article className="rounded-m border border-stone-200 bg-sheet p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Plate code={trip.code} size="sm" />
          <StatusBadge status={trip.status} />
          <Plate code={trip.vehiclePlate} paintHex={trip.paintHex} size="sm" />
        </div>
        <h3 className="text-1 font-bold text-petrol-800">{trip.vehicleTitle}</h3>
        <p className="text-m1 text-stone-500">
          {trip.pickupLabel} to {trip.returnLabel} at {trip.branchName}
        </p>
      </div>

      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
        <MoneyText
          amountMinor={trip.totalMinor}
          currency={trip.currency ?? 'INR'}
          className="text-1 font-bold text-petrol-800"
        />
        <Link
          href={`/trips/${trip.code}`}
          className="inline-flex h-9 items-center rounded-m border border-petrol-800 px-3 text-m1 font-medium text-petrol-800 hover:bg-stone-200"
        >
          Open trip
        </Link>
      </div>
    </article>
  );
}
