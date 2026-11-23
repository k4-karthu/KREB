'use client';

import { CalendarPlus, CheckCircle, FileText, Info } from '@phosphor-icons/react';
import Link from 'next/link';
import { ReceiptAnimation } from '@/ui/components/receipt/ReceiptAnimation';
import type { SlipData } from '@/ui/components/receipt/types';
import { Plate } from '@/ui/data/Plate';
import { Price } from '@/ui/data/Price';
import { StatusBadge } from '@/ui/data/StatusBadge';
import { Stepper } from '@/ui/data/Stepper';

const CHECKOUT_STEPS = [
  { id: 'driver', label: 'Driver Details', description: 'Licence & contact' },
  { id: 'protection', label: 'Protection & Addons', description: 'Excess & options' },
  { id: 'payment', label: 'Payment', description: 'Instant hold' },
  { id: 'confirmation', label: 'Confirmation', description: 'Official slip' },
];

export interface BookingConfirmedClientProps {
  booking: {
    code: string;
    status: string;
    startAt: number;
    endAt: number;
    totalMinor: number;
    depositMinor: number;
    year: number;
    make: string;
    model: string;
    plate: string;
    category: string;
    branchName: string;
    branchAddress: string;
    driverName: string;
    driverEmail: string;
  };
  licenceStatus: string | null;
  slip: SlipData;
}

export function BookingConfirmedClient({
  booking,
  licenceStatus,
  slip,
}: BookingConfirmedClientProps) {
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      {/* Completed Stepper */}
      <div className="rounded-m border border-border-subtle bg-surface p-5 shadow-e0">
        <Stepper steps={CHECKOUT_STEPS} currentStep={3} />
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Left column: Confirmation overview and quick actions */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-m border border-border bg-surface p-6 shadow-e1 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-label-s font-semibold text-success">
                  <CheckCircle size={18} weight="fill" />
                  Reservation confirmed & locked
                </div>
                <h1 className="font-display text-h2 font-bold text-text-1">
                  {booking.year} {booking.make} {booking.model}
                </h1>
                <p className="text-body-s text-text-2 capitalize">
                  {booking.category} category · {booking.branchName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Plate code={booking.plate} size="md" />
                <StatusBadge status={booking.status} />
              </div>
            </div>

            {/* Pick-up and Return details */}
            <div className="grid gap-4 rounded-s border border-border-subtle bg-surface-sunken/40 p-4 sm:grid-cols-2 text-body-s">
              <div>
                <span className="block text-label-s text-text-3">Pick-up schedule</span>
                <span className="font-semibold text-text-1">{fmtDate(booking.startAt)}</span>
                <span className="block text-caption text-text-2 mt-0.5">{booking.branchName}</span>
                <span className="block text-caption text-text-3">{booking.branchAddress}</span>
              </div>
              <div>
                <span className="block text-label-s text-text-3">Return schedule</span>
                <span className="font-semibold text-text-1">{fmtDate(booking.endAt)}</span>
                <span className="block text-caption text-text-2 mt-0.5">{booking.branchName}</span>
                <span className="block text-caption text-text-3">Standard depot return</span>
              </div>
            </div>

            {/* Financial summary snapshot */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-s border border-border-subtle bg-surface p-4">
              <div>
                <span className="block text-label-s text-text-3">Total paid (incl. 18% GST)</span>
                <Price amountMinor={booking.totalMinor} size="lg" />
              </div>
              <div className="text-right">
                <span className="block text-label-s text-text-3">Refundable security hold</span>
                <Price amountMinor={booking.depositMinor} size="sm" />
                <span className="block text-caption text-text-3">Released post-inspection</span>
              </div>
            </div>

            {/* Driver KYC notice if pending */}
            {licenceStatus === 'pending_approval' && (
              <div className="flex items-start gap-3 rounded-s border border-warning/40 bg-warning-subtle/30 p-4 text-body-s text-text-1">
                <Info size={20} weight="bold" className="text-warning shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-1">Licence verification pending</span>
                  <p className="mt-1 text-text-2">
                    Our concierge desk will review your driving licence before pick-up. You can
                    track verification status in your account dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* Next actions */}
            <div className="flex flex-wrap gap-3 border-t border-border-subtle pt-4">
              <Link
                href={`/trips/${booking.code}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-s bg-racing-green px-5 text-label-s font-semibold text-on-racing-green transition-colors hover:bg-racing-green-light shadow-e1 cursor-pointer"
              >
                <FileText size={18} weight="bold" />
                <span>View trip details & timeline</span>
              </Link>
              <a
                href={`/api/ics/${booking.code}`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-s border border-border bg-surface px-4 text-label-s font-medium text-text-1 transition-colors hover:bg-surface-sunken cursor-pointer"
              >
                <CalendarPlus size={18} weight="bold" />
                <span>Add to calendar (.ics)</span>
              </a>
              <Link
                href="/cars"
                className="inline-flex h-10 items-center justify-center rounded-s border border-border bg-surface px-4 text-label-s font-medium text-text-2 transition-colors hover:bg-surface-sunken cursor-pointer"
              >
                Browse fleet
              </Link>
            </div>
          </div>
        </div>

        {/* Right column: Animated Thermal Receipt Printer */}
        <aside className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full text-center mb-3">
            <span className="text-label-s text-text-3">Official thermal booking receipt</span>
          </div>
          <ReceiptAnimation slip={slip} autoPrint={true} />
        </aside>
      </div>
    </div>
  );
}
