import type { CancellationTier } from '@/config/settings';
import { applyBasisPointsHalfUp, type MinorUnits } from '@/domain/shared/money';

export interface CancellationPreview {
  refundPercent: number;
  refundMinor: MinorUnits;
  retainedMinor: MinorUnits;
  ruleLabel: string;
}

/**
 * Pure cancellation refund calculator (§4.5).
 * Used identically by the UI preview, cancellation action, and tests.
 */
export function computeCancellationRefund(params: {
  totalPaidMinor: MinorUnits;
  pickupAt: number;
  cancelledAt: number;
  tiers: CancellationTier[];
  adminInitiated?: boolean;
}): CancellationPreview {
  if (params.adminInitiated) {
    return {
      refundPercent: 100,
      refundMinor: params.totalPaidMinor,
      retainedMinor: 0,
      ruleLabel: 'Full refund (cancelled by operations)',
    };
  }

  const hoursBefore = (params.pickupAt - params.cancelledAt) / 3_600_000;
  const sorted = [...params.tiers].sort((a, b) => b.minHoursBefore - a.minHoursBefore);
  const matched = sorted.find((t) => hoursBefore >= t.minHoursBefore) ??
    sorted[sorted.length - 1] ?? {
      minHoursBefore: 0,
      refundPercent: 0,
      label: 'Less than 6 hours or no-show',
    };

  const refundMinor = applyBasisPointsHalfUp(params.totalPaidMinor, matched.refundPercent * 100);
  const retainedMinor = Math.max(0, params.totalPaidMinor - refundMinor);

  return {
    refundPercent: matched.refundPercent,
    refundMinor,
    retainedMinor,
    ruleLabel: matched.label,
  };
}
