import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface StatusBadgeProps {
  status?: string;
  tone?: StatusTone;
  label?: ReactNode;
  variant?: 'surface' | 'transparent';
  className?: string;
}

const STATUS_TONE_MAP: Record<string, { label: string; tone: StatusTone }> = {
  confirmed: { label: 'Confirmed', tone: 'success' },
  active: { label: 'Active', tone: 'success' },
  completed: { label: 'Completed', tone: 'success' },
  verified: { label: 'Verified', tone: 'success' },
  ready: { label: 'Ready', tone: 'success' },
  succeeded: { label: 'Paid', tone: 'success' },

  pending: { label: 'Pending review', tone: 'warning' },
  pending_payment: { label: 'Awaiting payment', tone: 'warning' },
  pending_approval: { label: 'Requested', tone: 'warning' },
  returned: { label: 'Returned', tone: 'warning' },
  cleaning: { label: 'Cleaning', tone: 'warning' },
  inspection: { label: 'Inspection', tone: 'warning' },

  rejected: { label: 'Rejected', tone: 'danger' },
  failed: { label: 'Failed', tone: 'danger' },
  overdue: { label: 'Overdue', tone: 'danger' },
  no_show: { label: 'No-show', tone: 'danger' },
  hold: { label: 'On hold', tone: 'danger' },
  maintenance: { label: 'Maintenance', tone: 'danger' },

  cancelled: { label: 'Cancelled', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const DOT_TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-text-3',
};

/**
 * Kerb v3 StatusBadge (§4.5):
 * Green appears ONLY as a small 6px dot — NEVER as a badge fill/surface.
 * Background is strictly transparent or surface.
 */
export function StatusBadge({
  status,
  tone: toneOverride,
  label: labelOverride,
  variant = 'surface',
  className = '',
}: StatusBadgeProps) {
  const mapped = status ? STATUS_TONE_MAP[status] : undefined;
  const tone = toneOverride ?? mapped?.tone ?? 'neutral';
  const label = labelOverride ?? mapped?.label ?? status ?? 'Unknown';

  const bgClass =
    variant === 'surface'
      ? 'bg-surface border border-border-subtle shadow-e0'
      : 'bg-transparent border border-transparent';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-s px-2 py-0.5 text-label-s font-medium text-text-2 ${bgClass} ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_TONE_CLASSES[tone]}`}
      />
      <span>{label}</span>
    </span>
  );
}
