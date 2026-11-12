import type { MinorUnits } from '@/domain/shared/money';

export type SlipKind = 'quote' | 'booking' | 'handover_out' | 'handover_in' | 'invoice';

export type SlipLineKind =
  | 'base'
  | 'rule'
  | 'tier_discount'
  | 'addon'
  | 'protection'
  | 'fee'
  | 'promo'
  | 'tax'
  | 'post_rental'
  | 'adjustment';

export interface SlipLine {
  id?: string;
  kind: SlipLineKind;
  label: string;
  detail?: string;
  quantity?: number;
  unitMinor?: MinorUnits;
  amountMinor: MinorUnits;
  isCredit?: boolean;
}

export interface SlipFuelReading {
  kind: 'eighths' | 'percent';
  level: number;
  label: string;
}

export interface SlipDamageMark {
  zone: string;
  kind: 'scratch' | 'dent' | 'chip' | 'crack' | 'stain' | 'missing' | 'other';
  severity: 1 | 2 | 3;
  note?: string;
}

export interface SlipInspectionBlock {
  type: 'handover_out' | 'handover_in';
  odometerKm: number;
  fuel: SlipFuelReading;
  cleanliness?: 'clean' | 'acceptable' | 'dirty';
  inspectedAt: number;
  inspectorName?: string;
  damageMarks: SlipDamageMark[];
  notes?: string;
}

export interface SlipMetaRow {
  label: string;
  value: string;
  mono?: boolean;
}

export interface SlipData {
  kind: SlipKind;
  title: string;
  referenceCode: string;
  issuedAt: number;
  currency: string;
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
  isCreditNote?: boolean;
  inspection?: SlipInspectionBlock;
  meta: SlipMetaRow[];
  barcodeSeed: string;
  statusLabel?: string;
}
