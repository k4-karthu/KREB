import type { QuoteComputationResult } from '@/domain/pricing/pricing';
import {
  formatFuelReading,
  slipFromBooking,
  slipFromInspection,
  slipFromInvoice,
  slipFromQuote,
} from '../adapters';
import type { SlipData } from '../types';

const DAY_MS = 86_400_000;
const BASE_TS = Date.UTC(2026, 10, 15, 4, 30, 0); // 15 Nov 2026 10:00 IST

// 1. 2-day hatchback quote
const twoDayHatchbackQuote: QuoteComputationResult = {
  billableDays: 2,
  baseTotalMinor: 440_000,
  subtotalMinor: 440_000,
  discountMinor: 0,
  taxMinor: 79_200,
  totalMinor: 519_200,
  depositMinor: 500_000,
  taxRateBp: 1800,
  lines: [
    {
      kind: 'base',
      label: '2 days × Standard daily rate',
      quantity: 2,
      unitMinor: 220_000,
      amountMinor: 440_000,
      taxable: true,
    },
    {
      kind: 'tax',
      label: 'GST (18%)',
      quantity: 1,
      unitMinor: 79_200,
      amountMinor: 79_200,
      taxable: false,
    },
  ],
};

export const quote2DayHatchback: SlipData = slipFromQuote({
  referenceCode: 'QT-2026-0101',
  quote: twoDayHatchbackQuote,
  vehicleName: 'Maruti Swift ZXi',
  vehiclePlate: 'KA-01-MJ-4821',
  vehicleCategory: 'hatchback',
  branchPickup: 'Indiranagar Hub',
  branchReturn: 'Indiranagar Hub',
  startAt: BASE_TS,
  endAt: BASE_TS + 2 * DAY_MS,
  issuedAt: BASE_TS - 3_600_000,
});

// 2. 3-day SUV with all line kinds (base, rule, tier_discount, addon, protection, fee, promo, tax)
const threeDaySuvQuote: QuoteComputationResult = {
  billableDays: 3,
  baseTotalMinor: 1_530_000,
  subtotalMinor: 1_617_000,
  discountMinor: 253_000,
  taxMinor: 291_060,
  totalMinor: 1_908_060,
  depositMinor: 1_000_000,
  taxRateBp: 1800,
  lines: [
    {
      kind: 'base',
      label: '2 days × Standard daily rate',
      quantity: 2,
      unitMinor: 480_000,
      amountMinor: 960_000,
      taxable: true,
    },
    {
      kind: 'rule',
      label: '1 day × Weekend demand',
      quantity: 1,
      unitMinor: 570_000,
      amountMinor: 570_000,
      taxable: true,
    },
    {
      kind: 'tier_discount',
      label: '3+ day rental discount',
      quantity: 1,
      unitMinor: -153_000,
      amountMinor: -153_000,
      taxable: true,
    },
    {
      kind: 'addon',
      label: 'Child ISOFIX seat (1 × 3 days)',
      quantity: 1,
      unitMinor: 35_000,
      amountMinor: 105_000,
      taxable: true,
    },
    {
      kind: 'protection',
      label: 'Zero-Excess Cover (3 days)',
      quantity: 3,
      unitMinor: 45_000,
      amountMinor: 135_000,
      taxable: true,
    },
    {
      kind: 'fee',
      label: 'One-way return fee',
      quantity: 1,
      unitMinor: 100_000,
      amountMinor: 100_000,
      taxable: true,
    },
    {
      kind: 'promo',
      label: 'Promo MONSOON10',
      quantity: 1,
      unitMinor: -100_000,
      amountMinor: -100_000,
      taxable: true,
    },
    {
      kind: 'tax',
      label: 'GST (18%)',
      quantity: 1,
      unitMinor: 291_060,
      amountMinor: 291_060,
      taxable: false,
    },
  ],
};

export const quote3DaySuvAllLines: SlipData = slipFromQuote({
  referenceCode: 'QT-2026-0102',
  quote: threeDaySuvQuote,
  vehicleName: 'Mahindra XUV700 AX7L',
  vehiclePlate: 'KA-03-NR-9012',
  vehicleCategory: 'suv',
  branchPickup: 'Indiranagar Hub',
  branchReturn: 'Kempegowda Terminal',
  startAt: BASE_TS,
  endAt: BASE_TS + 3 * DAY_MS,
  issuedAt: BASE_TS - 3_600_000,
});

// 3. 1-day EV with percent charge
const oneDayEvQuote: QuoteComputationResult = {
  billableDays: 1,
  baseTotalMinor: 380_000,
  subtotalMinor: 425_000,
  discountMinor: 0,
  taxMinor: 76_500,
  totalMinor: 501_500,
  depositMinor: 800_000,
  taxRateBp: 1800,
  lines: [
    {
      kind: 'base',
      label: '1 day × Standard daily rate',
      quantity: 1,
      unitMinor: 380_000,
      amountMinor: 380_000,
      taxable: true,
    },
    {
      kind: 'fee',
      label: 'Prepaid fast-charge pack (92% SOC)',
      quantity: 1,
      unitMinor: 45_000,
      amountMinor: 45_000,
      taxable: true,
    },
    {
      kind: 'tax',
      label: 'GST (18%)',
      quantity: 1,
      unitMinor: 76_500,
      amountMinor: 76_500,
      taxable: false,
    },
  ],
};

export const quote1DayEvPercent: SlipData = slipFromQuote({
  referenceCode: 'QT-2026-0103',
  quote: oneDayEvQuote,
  vehicleName: 'Tata Nexon EV Max',
  vehiclePlate: 'KA-05-EV-2204',
  vehicleCategory: 'ev',
  branchPickup: 'Koramangala Depot',
  branchReturn: 'Koramangala Depot',
  startAt: BASE_TS,
  endAt: BASE_TS + DAY_MS,
  issuedAt: BASE_TS - 1_800_000,
  fuelReading: formatFuelReading('percent', 92),
});

// 4. Booking with cancel deadline
export const bookingWithCancelDeadline: SlipData = slipFromBooking({
  code: 'KRB-2026-1042',
  status: 'confirmed',
  currency: 'INR',
  vehicleName: 'Hyundai Creta SX(O)',
  vehiclePlate: 'KA-01-HP-7740',
  vehicleCategory: 'suv',
  branchPickup: 'Indiranagar Hub',
  branchReturn: 'Indiranagar Hub',
  startAt: BASE_TS + 2 * DAY_MS,
  endAt: BASE_TS + 5 * DAY_MS,
  billableDays: 3,
  customerName: 'Aarav Menon',
  depositMinor: 750_000,
  cancelDeadlineAt: BASE_TS + DAY_MS,
  paymentSummary: 'Visa •••• 4242 · AUTH 8F3K2P',
  issuedAt: BASE_TS,
  subtotalMinor: 1_230_000,
  taxMinor: 221_400,
  totalMinor: 1_451_400,
  lines: [
    {
      kind: 'base',
      label: '3 days × Standard daily rate',
      quantity: 3,
      unitMinor: 390_000,
      amountMinor: 1_170_000,
    },
    {
      kind: 'protection',
      label: 'Standard Cover (3 days)',
      quantity: 3,
      unitMinor: 20_000,
      amountMinor: 60_000,
    },
    {
      kind: 'tax',
      label: 'GST (18%)',
      quantity: 1,
      unitMinor: 221_400,
      amountMinor: 221_400,
    },
  ],
});

// 5. Check-out with 3 damage marks
export const handoverOutWith3DamageMarks: SlipData = slipFromInspection({
  publicId: 'INSP-OUT-0401',
  bookingCode: 'KRB-2026-1042',
  type: 'handover_out',
  vehicleName: 'Hyundai Creta SX(O)',
  vehiclePlate: 'KA-01-HP-7740',
  vehicleCategory: 'suv',
  branchPickup: 'Indiranagar Hub',
  branchReturn: 'Indiranagar Hub',
  startAt: BASE_TS + 2 * DAY_MS,
  endAt: BASE_TS + 5 * DAY_MS,
  billableDays: 3,
  customerName: 'Aarav Menon',
  odometerKm: 18_420,
  fuelKind: 'eighths',
  fuelLevel: 8,
  cleanliness: 'clean',
  inspectedAt: BASE_TS + 2 * DAY_MS,
  inspectorName: 'Rohan Nair',
  depositMinor: 750_000,
  damageMarks: [
    {
      zone: 'front_bumper_left',
      kind: 'scratch',
      severity: 1,
      note: '4cm light scuff near fog lamp',
    },
    {
      zone: 'rear_door_right',
      kind: 'dent',
      severity: 2,
      note: 'Small parking ding above handle',
    },
    {
      zone: 'windshield_lower',
      kind: 'chip',
      severity: 1,
      note: 'Pinhead stone chip, passenger side',
    },
  ],
  notes: 'Spare wheel, jack, and warning triangle verified in boot.',
});

// 6. Check-in with late fee & fuel shortfall
export const handoverInLateAndFuelShortfall: SlipData = slipFromInspection({
  publicId: 'INSP-IN-0402',
  bookingCode: 'KRB-2026-1042',
  type: 'handover_in',
  vehicleName: 'Hyundai Creta SX(O)',
  vehiclePlate: 'KA-01-HP-7740',
  vehicleCategory: 'suv',
  branchPickup: 'Indiranagar Hub',
  branchReturn: 'Indiranagar Hub',
  startAt: BASE_TS + 2 * DAY_MS,
  endAt: BASE_TS + 5 * DAY_MS,
  billableDays: 3,
  customerName: 'Aarav Menon',
  odometerKm: 18_915,
  fuelKind: 'eighths',
  fuelLevel: 5,
  cleanliness: 'acceptable',
  inspectedAt: BASE_TS + 5 * DAY_MS + 7_200_000,
  inspectorName: 'Rohan Nair',
  depositMinor: 750_000,
  damageMarks: [
    {
      zone: 'front_bumper_left',
      kind: 'scratch',
      severity: 1,
      note: 'Pre-existing mark at check-out',
    },
  ],
  extraCharges: [
    {
      kind: 'post_rental',
      label: 'Late return fee (2h past grace)',
      quantity: 1,
      unitMinor: 120_000,
      amountMinor: 120_000,
    },
    {
      kind: 'post_rental',
      label: 'Fuel shortfall (3/8 tank @ ₹500/8th)',
      quantity: 3,
      unitMinor: 50_000,
      amountMinor: 150_000,
    },
    {
      kind: 'tax',
      label: 'GST on post-rental charges (18%)',
      quantity: 1,
      unitMinor: 48_600,
      amountMinor: 48_600,
    },
  ],
});

// 7. Invoice with credit note
export const invoiceWithCreditNote: SlipData = slipFromInvoice({
  series: 'KRB-CN',
  fiscalYear: 2026,
  number: 18,
  kind: 'credit_note',
  bookingCode: 'KRB-2026-0988',
  issuedAt: BASE_TS + 6 * DAY_MS,
  currency: 'INR',
  vehicleName: 'Honda City ZX CVT',
  vehiclePlate: 'KA-02-MM-3109',
  vehicleCategory: 'sedan',
  branchPickup: 'Whitefield Hub',
  branchReturn: 'Whitefield Hub',
  startAt: BASE_TS,
  endAt: BASE_TS + 4 * DAY_MS,
  billableDays: 4,
  customerName: 'Meera Krishnan',
  paymentSummary: 'Refunded to Visa •••• 4242',
  subtotalMinor: -250_000,
  taxMinor: -45_000,
  totalMinor: -295_000,
  lines: [
    {
      kind: 'adjustment',
      label: 'Early return credit (1 unused day)',
      quantity: 1,
      unitMinor: -250_000,
      amountMinor: -250_000,
      isCredit: true,
    },
    {
      kind: 'tax',
      label: 'GST reversal (18%)',
      quantity: 1,
      unitMinor: -45_000,
      amountMinor: -45_000,
      isCredit: true,
    },
  ],
});

// 8. Long vehicle name
const longVehicleQuote: QuoteComputationResult = {
  billableDays: 2,
  baseTotalMinor: 2_800_000,
  subtotalMinor: 2_800_000,
  discountMinor: 0,
  taxMinor: 504_000,
  totalMinor: 3_304_000,
  depositMinor: 2_500_000,
  taxRateBp: 1800,
  lines: [
    {
      kind: 'base',
      label: '2 days × Executive chauffeur-class rate',
      quantity: 2,
      unitMinor: 1_400_000,
      amountMinor: 2_800_000,
      taxable: true,
    },
    {
      kind: 'tax',
      label: 'GST (18%)',
      quantity: 1,
      unitMinor: 504_000,
      amountMinor: 504_000,
      taxable: false,
    },
  ],
};

export const quoteLongVehicleName: SlipData = slipFromQuote({
  referenceCode: 'QT-2026-0108',
  quote: longVehicleQuote,
  vehicleName: 'Mercedes-Benz Maybach GLS 600 4MATIC Executive Edition',
  vehiclePlate: 'KA-01-LX-0001',
  vehicleCategory: 'luxury',
  branchPickup: 'UB City Concierge',
  branchReturn: 'Kempegowda Terminal',
  startAt: BASE_TS,
  endAt: BASE_TS + 2 * DAY_MS,
  issuedAt: BASE_TS - 900_000,
});

// 9. 30-day quote
const thirtyDayQuote: QuoteComputationResult = {
  billableDays: 30,
  baseTotalMinor: 6_600_000,
  subtotalMinor: 5_280_000,
  discountMinor: 1_320_000,
  taxMinor: 950_400,
  totalMinor: 6_230_400,
  depositMinor: 1_000_000,
  taxRateBp: 1800,
  lines: [
    {
      kind: 'base',
      label: '30 days × Standard daily rate',
      quantity: 30,
      unitMinor: 220_000,
      amountMinor: 6_600_000,
      taxable: true,
    },
    {
      kind: 'tier_discount',
      label: '30+ day rental discount (20%)',
      quantity: 1,
      unitMinor: -1_320_000,
      amountMinor: -1_320_000,
      taxable: true,
    },
    {
      kind: 'tax',
      label: 'GST (18%)',
      quantity: 1,
      unitMinor: 950_400,
      amountMinor: 950_400,
      taxable: false,
    },
  ],
};

export const quote30Day: SlipData = slipFromQuote({
  referenceCode: 'QT-2026-0109',
  quote: thirtyDayQuote,
  vehicleName: 'Kia Carens Prestige Plus',
  vehiclePlate: 'KA-04-TR-5582',
  vehicleCategory: 'mpv',
  branchPickup: 'Indiranagar Hub',
  branchReturn: 'Indiranagar Hub',
  startAt: BASE_TS,
  endAt: BASE_TS + 30 * DAY_MS,
  issuedAt: BASE_TS - 900_000,
});

export const ALL_SLIP_FIXTURES: Record<string, SlipData> = {
  quote2DayHatchback,
  quote3DaySuvAllLines,
  quote1DayEvPercent,
  bookingWithCancelDeadline,
  handoverOutWith3DamageMarks,
  handoverInLateAndFuelShortfall,
  invoiceWithCreditNote,
  quoteLongVehicleName,
  quote30Day,
};
