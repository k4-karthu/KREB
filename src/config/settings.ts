import { z } from 'zod';

export const CancellationTierSchema = z.object({
  minHoursBefore: z.number().int().nonnegative(),
  refundPercent: z.number().int().min(0).max(100),
  label: z.string(),
});

export const LateFeePolicySchema = z.object({
  graceMinutes: z.number().int().min(0).default(59),
  hourlyPercentOfDaily: z.number().int().min(0).max(100).default(25),
  hourlyCapMaxMinutes: z.number().int().min(60).default(180),
  fullDayThresholdMinutes: z.number().int().min(60).default(180),
});

export const RentalSettingsSchema = z.object({
  currency: z.string().length(3).default('INR'),
  taxLabel: z.string().default('GST'),
  taxRateBp: z.number().int().min(0).max(5000).default(1800),
  turnaroundBufferMinutes: z.number().int().min(0).max(720).default(90),
  graceMinutes: z.number().int().min(0).max(240).default(59),
  minLeadTimeMinutes: z.number().int().min(0).max(10080).default(120),
  minDurationMinutes: z.number().int().min(60).max(1440).default(240),
  maxDurationMinutes: z.number().int().min(1440).max(129600).default(43200),
  holdTimeoutMinutes: z.number().int().min(5).max(120).default(15),
  quoteValidityMinutes: z.number().int().min(5).max(120).default(15),
  noShowReleaseMinutes: z.number().int().min(30).max(720).default(120),
  depositReleaseWorkingDays: z.number().int().min(1).max(30).default(5),
  oneWayEnabled: z.boolean().default(false),
  kycRequiredBeforePay: z.boolean().default(true),
  hourlyEnabled: z.boolean().default(false),
  fuelShortfallPerEighthMinor: z.number().int().min(0).default(65000),
  fuelShortfallPerPercentEvMinor: z.number().int().min(0).default(3500),
  refuelServiceFeeMinor: z.number().int().min(0).default(30000),
  lateFeePolicy: LateFeePolicySchema.default({
    graceMinutes: 59,
    hourlyPercentOfDaily: 25,
    hourlyCapMaxMinutes: 180,
    fullDayThresholdMinutes: 180,
  }),
  cancellationTiers: z.array(CancellationTierSchema).default([
    { minHoursBefore: 48, refundPercent: 100, label: 'More than 48 hours before pick-up' },
    { minHoursBefore: 24, refundPercent: 75, label: '24 to 48 hours before pick-up' },
    { minHoursBefore: 6, refundPercent: 50, label: '6 to 24 hours before pick-up' },
    { minHoursBefore: 0, refundPercent: 0, label: 'Less than 6 hours or no-show' },
  ]),
});

export type RentalSettings = z.infer<typeof RentalSettingsSchema>;
export type CancellationTier = z.infer<typeof CancellationTierSchema>;

export const DEFAULT_RENTAL_SETTINGS: RentalSettings = RentalSettingsSchema.parse({});
