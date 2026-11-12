import type { QuoteComputationResult, QuoteLineItem } from '@/domain/pricing/pricing';
import { assertMinor, type MinorUnits } from '@/domain/shared/money';
import type { SlipDamageMark, SlipData, SlipFuelReading, SlipLine, SlipMetaRow } from './types';

function formatSlipDateTime(epochMs: number): string {
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

export function formatFuelReading(kind: 'eighths' | 'percent', level: number): SlipFuelReading {
  if (kind === 'percent') {
    const clamped = Math.max(0, Math.min(100, Math.round(level)));
    return { kind, level: clamped, label: `${clamped}%` };
  }
  const clamped = Math.max(0, Math.min(8, Math.round(level)));
  return { kind, level: clamped, label: `${clamped}/8` };
}

function mapQuoteLine(line: QuoteLineItem, index: number): SlipLine {
  assertMinor(line.amountMinor, `quote.lines[${index}].amountMinor`);
  const isCredit = line.amountMinor < 0 || line.kind === 'tier_discount' || line.kind === 'promo';
  return {
    id: `q-${index}-${line.kind}`,
    kind: line.kind,
    label: line.label,
    quantity: line.quantity,
    unitMinor: line.unitMinor,
    amountMinor: line.amountMinor,
    isCredit,
  };
}

function buildTripMeta(params: {
  branchPickup: string;
  branchReturn: string;
  startAt: number;
  endAt: number;
  billableDays: number;
  vehiclePlate?: string;
}): SlipMetaRow[] {
  const rows: SlipMetaRow[] = [
    { label: 'Pick-up', value: `${params.branchPickup} · ${formatSlipDateTime(params.startAt)}` },
    { label: 'Return', value: `${params.branchReturn} · ${formatSlipDateTime(params.endAt)}` },
    {
      label: 'Duration',
      value: `${params.billableDays} ${params.billableDays === 1 ? 'day' : 'days'}`,
    },
  ];
  if (params.vehiclePlate) {
    rows.push({ label: 'Plate', value: params.vehiclePlate, mono: true });
  }
  return rows;
}

export interface QuoteSlipInput {
  referenceCode: string;
  quote: QuoteComputationResult;
  vehicleName: string;
  vehiclePlate?: string;
  vehicleCategory?: string;
  branchPickup: string;
  branchReturn: string;
  startAt: number;
  endAt: number;
  issuedAt?: number;
  currency?: string;
  fuelReading?: SlipFuelReading;
}

export function slipFromQuote(input: QuoteSlipInput): SlipData {
  const issuedAt = input.issuedAt ?? Date.now();
  const currency = input.currency ?? 'INR';
  const lines = input.quote.lines.map(mapQuoteLine);

  const meta = buildTripMeta({
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.quote.billableDays,
    vehiclePlate: input.vehiclePlate,
  });
  if (input.fuelReading) {
    meta.push({ label: 'Charge / Fuel', value: input.fuelReading.label, mono: true });
  }

  return {
    kind: 'quote',
    title: 'PRICE QUOTE',
    referenceCode: input.referenceCode,
    issuedAt,
    currency,
    vehicleName: input.vehicleName,
    vehiclePlate: input.vehiclePlate,
    vehicleCategory: input.vehicleCategory,
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.quote.billableDays,
    lines,
    subtotalMinor: input.quote.subtotalMinor,
    taxMinor: input.quote.taxMinor,
    totalMinor: input.quote.totalMinor,
    depositMinor: input.quote.depositMinor,
    meta,
    barcodeSeed: `QUOTE-${input.referenceCode}-${input.quote.totalMinor}`,
    statusLabel: 'Estimate valid for 15 min',
  };
}

export interface BookingSlipInput {
  code: string;
  status: string;
  currency?: string;
  vehicleName: string;
  vehiclePlate?: string;
  vehicleCategory?: string;
  branchPickup: string;
  branchReturn: string;
  startAt: number;
  endAt: number;
  billableDays: number;
  customerName?: string;
  lines: SlipLine[];
  subtotalMinor: MinorUnits;
  taxMinor: MinorUnits;
  totalMinor: MinorUnits;
  depositMinor?: MinorUnits;
  cancelDeadlineAt?: number;
  paymentSummary?: string;
  issuedAt?: number;
}

export function slipFromBooking(input: BookingSlipInput): SlipData {
  const issuedAt = input.issuedAt ?? Date.now();
  const currency = input.currency ?? 'INR';
  const meta = buildTripMeta({
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.billableDays,
    vehiclePlate: input.vehiclePlate,
  });

  if (input.customerName) {
    meta.push({ label: 'Driver', value: input.customerName });
  }
  if (input.cancelDeadlineAt !== undefined) {
    meta.push({
      label: 'Free cancel until',
      value: formatSlipDateTime(input.cancelDeadlineAt),
    });
  }
  if (input.paymentSummary) {
    meta.push({ label: 'Payment', value: input.paymentSummary, mono: true });
  }

  return {
    kind: 'booking',
    title: 'BOOKING SLIP',
    referenceCode: input.code,
    issuedAt,
    currency,
    vehicleName: input.vehicleName,
    vehiclePlate: input.vehiclePlate,
    vehicleCategory: input.vehicleCategory,
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.billableDays,
    customerName: input.customerName,
    lines: input.lines,
    subtotalMinor: input.subtotalMinor,
    taxMinor: input.taxMinor,
    totalMinor: input.totalMinor,
    depositMinor: input.depositMinor,
    cancelDeadlineAt: input.cancelDeadlineAt,
    paymentSummary: input.paymentSummary,
    meta,
    barcodeSeed: `BKG-${input.code}-${input.totalMinor}`,
    statusLabel: input.status.toUpperCase(),
  };
}

export interface InspectionSlipInput {
  publicId: string;
  bookingCode: string;
  type: 'handover_out' | 'handover_in';
  vehicleName: string;
  vehiclePlate?: string;
  vehicleCategory?: string;
  branchPickup: string;
  branchReturn: string;
  startAt: number;
  endAt: number;
  billableDays: number;
  customerName?: string;
  odometerKm: number;
  fuelKind: 'eighths' | 'percent';
  fuelLevel: number;
  cleanliness?: 'clean' | 'acceptable' | 'dirty';
  damageMarks: SlipDamageMark[];
  notes?: string;
  inspectedAt: number;
  inspectorName?: string;
  depositMinor?: MinorUnits;
  extraCharges?: SlipLine[];
  currency?: string;
}

export function slipFromInspection(input: InspectionSlipInput): SlipData {
  const currency = input.currency ?? 'INR';
  const fuel = formatFuelReading(input.fuelKind, input.fuelLevel);
  const lines = input.extraCharges ?? [];
  const totalMinor = lines.reduce((sum, line) => sum + line.amountMinor, 0);
  const taxMinor = lines
    .filter((l) => l.kind === 'tax')
    .reduce((sum, line) => sum + line.amountMinor, 0);
  const subtotalMinor = totalMinor - taxMinor;

  const meta: SlipMetaRow[] = [
    { label: 'Booking', value: input.bookingCode, mono: true },
    { label: 'Odometer', value: `${input.odometerKm.toLocaleString('en-IN')} km`, mono: true },
    { label: 'Fuel / Charge', value: fuel.label, mono: true },
  ];
  if (input.vehiclePlate) {
    meta.push({ label: 'Plate', value: input.vehiclePlate, mono: true });
  }
  if (input.cleanliness) {
    meta.push({ label: 'Cabin', value: input.cleanliness });
  }
  if (input.inspectorName) {
    meta.push({ label: 'Inspector', value: input.inspectorName });
  }

  return {
    kind: input.type,
    title: input.type === 'handover_out' ? 'CHECK-OUT SLIP' : 'CHECK-IN SLIP',
    referenceCode: input.publicId,
    issuedAt: input.inspectedAt,
    currency,
    vehicleName: input.vehicleName,
    vehiclePlate: input.vehiclePlate,
    vehicleCategory: input.vehicleCategory,
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.billableDays,
    customerName: input.customerName,
    lines,
    subtotalMinor,
    taxMinor,
    totalMinor,
    depositMinor: input.depositMinor,
    inspection: {
      type: input.type,
      odometerKm: input.odometerKm,
      fuel,
      cleanliness: input.cleanliness,
      inspectedAt: input.inspectedAt,
      inspectorName: input.inspectorName,
      damageMarks: input.damageMarks,
      notes: input.notes,
    },
    meta,
    barcodeSeed: `INSP-${input.bookingCode}-${input.publicId}`,
    statusLabel: input.type === 'handover_out' ? 'VEHICLE HANDED OVER' : 'VEHICLE RETURNED',
  };
}

export interface InvoiceSlipInput {
  series: string;
  fiscalYear: number;
  number: number;
  kind: 'invoice' | 'credit_note';
  bookingCode: string;
  issuedAt: number;
  currency?: string;
  vehicleName: string;
  vehiclePlate?: string;
  vehicleCategory?: string;
  branchPickup: string;
  branchReturn: string;
  startAt: number;
  endAt: number;
  billableDays: number;
  customerName?: string;
  lines: SlipLine[];
  subtotalMinor: MinorUnits;
  taxMinor: MinorUnits;
  totalMinor: MinorUnits;
  paymentSummary?: string;
}

export function slipFromInvoice(input: InvoiceSlipInput): SlipData {
  const currency = input.currency ?? 'INR';
  const paddedNo = String(input.number).padStart(4, '0');
  const referenceCode = `${input.series}/${input.fiscalYear}/${paddedNo}`;
  const isCreditNote = input.kind === 'credit_note';

  const meta = buildTripMeta({
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.billableDays,
    vehiclePlate: input.vehiclePlate,
  });
  meta.unshift({ label: 'Booking', value: input.bookingCode, mono: true });
  if (input.customerName) {
    meta.push({ label: 'Billed to', value: input.customerName });
  }
  if (input.paymentSummary) {
    meta.push({ label: 'Settlement', value: input.paymentSummary, mono: true });
  }

  return {
    kind: 'invoice',
    title: isCreditNote ? 'CREDIT NOTE' : 'TAX INVOICE',
    referenceCode,
    issuedAt: input.issuedAt,
    currency,
    vehicleName: input.vehicleName,
    vehiclePlate: input.vehiclePlate,
    vehicleCategory: input.vehicleCategory,
    branchPickup: input.branchPickup,
    branchReturn: input.branchReturn,
    startAt: input.startAt,
    endAt: input.endAt,
    billableDays: input.billableDays,
    customerName: input.customerName,
    lines: input.lines,
    subtotalMinor: input.subtotalMinor,
    taxMinor: input.taxMinor,
    totalMinor: input.totalMinor,
    paymentSummary: input.paymentSummary,
    isCreditNote,
    meta,
    barcodeSeed: `INV-${referenceCode}-${input.bookingCode}`,
    statusLabel: isCreditNote ? 'REFUND ISSUED' : 'PAID IN FULL',
  };
}
