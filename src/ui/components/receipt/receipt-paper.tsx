'use client';

/*
 * Thermal receipt paper layout for all 5 Kerb SlipKind modes.
 * Zigzag conic-gradient tear mask & thermal paper aesthetic adapted from
 * aqkprogrammer/receipt-printer (MIT License, Copyright (c) 2026 Abdul Qadir Khan).
 */

import { useMemo } from 'react';
import { formatMoney } from '@/domain/shared/money';
import {
  generateBarcodeBars,
  generateQrMatrix,
  PAPER_BG,
  PAPER_INK,
  RECEIPT_MAX_WIDTH,
  RECEIPT_TOOTH_PX,
} from './constants';
import type { SlipData } from './types';

export interface ReceiptPaperProps {
  slip: SlipData;
  /** Whether to show the top torn zigzag edge (default true) */
  tornTop?: boolean;
  /** Whether to show the bottom torn zigzag edge (default true) */
  tornBottom?: boolean;
  className?: string;
}

function formatDateTime(epochMs: number): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(epochMs));
}

function ZigzagEdge({ position }: { position: 'top' | 'bottom' }) {
  const teeth = 18;
  const toothWidth = RECEIPT_MAX_WIDTH / teeth;
  const h = RECEIPT_TOOTH_PX;
  const points: string[] = [];

  if (position === 'top') {
    points.push(`M 0 ${h}`);
    for (let i = 0; i < teeth; i++) {
      const xMid = (i + 0.5) * toothWidth;
      const xEnd = (i + 1) * toothWidth;
      points.push(`L ${xMid.toFixed(2)} 0 L ${xEnd.toFixed(2)} ${h}`);
    }
    points.push('Z');
  } else {
    points.push('M 0 0');
    for (let i = 0; i < teeth; i++) {
      const xMid = (i + 0.5) * toothWidth;
      const xEnd = (i + 1) * toothWidth;
      points.push(`L ${xMid.toFixed(2)} ${h} L ${xEnd.toFixed(2)} 0`);
    }
    points.push('Z');
  }

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${RECEIPT_MAX_WIDTH} ${h}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height: `${h}px` }}
    >
      <path d={points.join(' ')} fill={PAPER_BG} />
    </svg>
  );
}

function DashedRule() {
  return (
    <hr
      style={{
        height: 0,
        margin: '12px 0',
        border: 0,
        borderTop: '1px dashed rgba(20, 22, 26, 0.24)',
      }}
    />
  );
}

export function ReceiptPaper({
  slip,
  tornTop = true,
  tornBottom = true,
  className = '',
}: ReceiptPaperProps) {
  const bars = useMemo(() => generateBarcodeBars(slip.barcodeSeed, 260), [slip.barcodeSeed]);
  const qrMatrix = useMemo(
    () => (slip.kind === 'booking' ? generateQrMatrix(slip.referenceCode) : null),
    [slip.kind, slip.referenceCode],
  );

  const totalLabel = slip.isCreditNote
    ? 'CREDIT TOTAL'
    : slip.kind === 'quote'
      ? 'ESTIMATED TOTAL'
      : slip.kind === 'handover_out'
        ? 'CHARGES DUE'
        : slip.kind === 'handover_in'
          ? 'SETTLEMENT DUE'
          : 'TOTAL PAID';

  return (
    <div
      className={`w-full ${className}`}
      style={{
        maxWidth: `${RECEIPT_MAX_WIDTH}px`,
        filter: 'drop-shadow(0 14px 20px rgb(var(--shadow-ink) / 0.16))',
      }}
    >
      {tornTop ? <ZigzagEdge position="top" /> : null}
      <article
        aria-label={`${slip.title} ${slip.referenceCode}`}
        className="font-mono"
        style={{
          backgroundColor: PAPER_BG,
          color: PAPER_INK,
          fontSize: '11px',
          lineHeight: 1.5,
          fontVariantNumeric: 'tabular-nums',
          paddingTop: '18px',
          paddingBottom: '18px',
          paddingLeft: '18px',
          paddingRight: '18px',
        }}
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-2">
          <div>
            <p
              className="font-bold"
              style={{ fontSize: '13px', letterSpacing: '0.12em', color: PAPER_INK }}
            >
              KERB
            </p>
            <p style={{ fontSize: '10px', letterSpacing: '0.08em', opacity: 0.72 }}>{slip.title}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold" style={{ fontSize: '10.5px', color: PAPER_INK }}>
              {slip.referenceCode}
            </p>
            <p style={{ fontSize: '9.5px', opacity: 0.68 }}>{formatDateTime(slip.issuedAt)}</p>
          </div>
        </header>

        <DashedRule />

        {/* Vehicle lead */}
        <div>
          <p className="font-bold" style={{ fontSize: '12px', letterSpacing: '0.03em' }}>
            {slip.vehicleName}
          </p>
          <p style={{ fontSize: '10px', opacity: 0.74 }}>
            {slip.vehiclePlate ? `${slip.vehiclePlate} · ` : ''}
            {slip.billableDays} {slip.billableDays === 1 ? 'day' : 'days'}
            {slip.vehicleCategory ? ` · ${slip.vehicleCategory}` : ''}
          </p>
        </div>

        {/* Inspection condition grid (handover_out / handover_in) */}
        {slip.inspection ? (
          <>
            <DashedRule />
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-3" style={{ fontSize: '10.5px' }}>
              <div>
                <span style={{ opacity: 0.65 }}>ODOMETER</span>
                <p className="font-semibold">
                  {slip.inspection.odometerKm.toLocaleString('en-IN')} km
                </p>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>FUEL / CHARGE</span>
                <p className="font-semibold">{slip.inspection.fuel.label}</p>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>CABIN</span>
                <p className="font-semibold">{slip.inspection.cleanliness ?? 'clean'}</p>
              </div>
              <div>
                <span style={{ opacity: 0.65 }}>DAMAGE MARKS</span>
                <p className="font-semibold">{slip.inspection.damageMarks.length}</p>
              </div>
            </div>

            {slip.inspection.damageMarks.length > 0 ? (
              <ul className="mt-2 space-y-1" style={{ fontSize: '10px' }}>
                {slip.inspection.damageMarks.map((mark, idx) => (
                  <li key={`${mark.zone}-${idx}`} className="flex justify-between gap-2">
                    <span>
                      [{mark.kind}] {mark.zone.replaceAll('_', ' ')} (S{mark.severity})
                    </span>
                    {mark.note ? (
                      <span className="text-right" style={{ opacity: 0.72 }}>
                        {mark.note}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {slip.inspection.notes ? (
              <p className="mt-2" style={{ fontSize: '10px', opacity: 0.75 }}>
                Note: {slip.inspection.notes}
              </p>
            ) : null}

            <div
              className="mt-3 pt-2 flex justify-between"
              style={{
                borderTop: '1px dotted rgba(20, 22, 26, 0.3)',
                fontSize: '9.5px',
                opacity: 0.75,
              }}
            >
              <span>Inspector: {slip.inspection.inspectorName ?? 'Branch Staff'}</span>
              <span>Signed: {slip.customerName ?? 'Driver'}</span>
            </div>
          </>
        ) : null}

        {/* Line items */}
        {slip.lines.length > 0 ? (
          <>
            <DashedRule />
            <div className="space-y-1">
              {slip.lines.map((line, idx) => (
                <div
                  key={line.id ?? `${line.kind}-${idx}`}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span style={{ opacity: line.kind === 'tax' ? 0.78 : 0.92 }}>{line.label}</span>
                  <span
                    className="whitespace-nowrap font-semibold"
                    style={{ opacity: line.isCredit ? 0.85 : 1 }}
                  >
                    {formatMoney(line.amountMinor, slip.currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <DashedRule />

        {/* Grand total */}
        <div
          className="flex items-baseline justify-between gap-3 font-bold"
          style={{ fontSize: '13px', letterSpacing: '0.04em' }}
        >
          <span>{totalLabel}</span>
          <span style={{ fontSize: '15px' }}>{formatMoney(slip.totalMinor, slip.currency)}</span>
        </div>

        {slip.depositMinor !== undefined && slip.depositMinor > 0 ? (
          <div
            className="mt-1 flex items-baseline justify-between gap-3"
            style={{ fontSize: '10.5px', opacity: 0.75 }}
          >
            <span>Refundable security deposit</span>
            <span>{formatMoney(slip.depositMinor, slip.currency)}</span>
          </div>
        ) : null}

        <DashedRule />

        {/* Meta rows */}
        <dl className="space-y-1" style={{ fontSize: '10px' }}>
          {slip.meta.map((row) => (
            <div key={`${row.label}-${row.value}`} className="flex justify-between gap-3">
              <dt style={{ opacity: 0.68 }}>{row.label}</dt>
              <dd className="text-right font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* Booking QR block */}
        {qrMatrix ? (
          <div className="mt-3 flex flex-col items-center">
            <svg
              role="img"
              aria-label={`Booking QR code for ${slip.referenceCode}`}
              viewBox="0 0 21 21"
              width={64}
              height={64}
              shapeRendering="crispEdges"
            >
              {qrMatrix.map((row, rIdx) =>
                row.map((filled, cIdx) =>
                  filled ? (
                    <rect
                      key={`${rIdx}-${cIdx}`}
                      x={cIdx}
                      y={rIdx}
                      width={1}
                      height={1}
                      fill={PAPER_INK}
                    />
                  ) : null,
                ),
              )}
            </svg>
          </div>
        ) : null}

        {/* Seeded Code-128-style barcode */}
        <div className="mt-4">
          <svg
            role="img"
            aria-label={`Barcode for ${slip.referenceCode}`}
            viewBox="0 0 260 40"
            className="w-full"
            style={{ height: '38px' }}
            preserveAspectRatio="none"
          >
            {bars.map((bar) => (
              <rect key={bar.x} x={bar.x} y={0} width={bar.width} height={40} fill={PAPER_INK} />
            ))}
          </svg>
          <p
            className="mt-1 text-center"
            style={{ fontSize: '9px', letterSpacing: '0.28em', opacity: 0.62 }}
          >
            {slip.referenceCode}
          </p>
        </div>

        {slip.statusLabel ? (
          <p
            className="mt-2 text-center font-semibold"
            style={{ fontSize: '9.5px', letterSpacing: '0.08em', opacity: 0.72 }}
          >
            {slip.statusLabel}
          </p>
        ) : null}
      </article>
      {tornBottom ? <ZigzagEdge position="bottom" /> : null}
    </div>
  );
}
