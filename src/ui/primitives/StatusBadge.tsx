import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Wrench,
  XCircle,
} from 'lucide-react';

export type StatusTone = 'go' | 'amber' | 'stop' | 'neutral' | 'info';

const TONE_CLASSES: Record<StatusTone, string> = {
  go: 'bg-go-100 text-petrol-800 border-go-600',
  amber: 'bg-amber-100 text-petrol-950 border-amber-600',
  stop: 'bg-stop-100 text-stop-600 border-stop-600',
  neutral: 'bg-stone-200 text-petrol-800 border-stone-300',
  info: 'bg-sheet text-petrol-600 border-petrol-500',
};

const STATUS_MAP: Record<
  string,
  {
    label: string;
    tone: StatusTone;
    icon: 'check' | 'clock' | 'warn' | 'stop' | 'wrench' | 'clean';
  }
> = {
  confirmed: { label: 'Confirmed', tone: 'go', icon: 'check' },
  active: { label: 'Active', tone: 'info', icon: 'check' },
  taken: { label: 'Taken · On route', tone: 'info', icon: 'check' },
  on_route: { label: 'On route', tone: 'info', icon: 'check' },
  completed: { label: 'Completed', tone: 'go', icon: 'check' },
  returned: { label: 'Returned', tone: 'amber', icon: 'clock' },
  pending_payment: { label: 'Awaiting payment', tone: 'amber', icon: 'clock' },
  pending_approval: { label: 'Requested', tone: 'amber', icon: 'warn' },
  pending: { label: 'Pending review', tone: 'amber', icon: 'clock' },
  verified: { label: 'Verified', tone: 'go', icon: 'check' },
  rejected: { label: 'Rejected', tone: 'stop', icon: 'stop' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'stop' },
  expired: { label: 'Expired', tone: 'stop', icon: 'stop' },
  no_show: { label: 'No-show', tone: 'stop', icon: 'warn' },
  overdue: { label: 'Overdue', tone: 'stop', icon: 'warn' },
  ready: { label: 'Ready', tone: 'go', icon: 'check' },
  cleaning: { label: 'Cleaning', tone: 'amber', icon: 'clean' },
  inspection: { label: 'Inspection', tone: 'amber', icon: 'warn' },
  hold: { label: 'On hold', tone: 'stop', icon: 'stop' },
  maintenance: { label: 'Maintenance', tone: 'stop', icon: 'wrench' },
  succeeded: { label: 'Paid', tone: 'go', icon: 'check' },
  failed: { label: 'Failed', tone: 'stop', icon: 'stop' },
};

function renderIcon(kind: string) {
  const cls = 'w-3.5 h-3.5 shrink-0';
  switch (kind) {
    case 'check':
      return <CheckCircle2 className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'clock':
      return <Clock className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'warn':
      return <AlertCircle className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'stop':
      return <XCircle className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'wrench':
      return <Wrench className={cls} strokeWidth={1.75} aria-hidden="true" />;
    case 'clean':
      return <Sparkles className={cls} strokeWidth={1.75} aria-hidden="true" />;
    default:
      return <ShieldAlert className={cls} strokeWidth={1.75} aria-hidden="true" />;
  }
}

interface StatusBadgeProps {
  status: string;
  labelOverride?: string;
  toneOverride?: StatusTone;
  className?: string;
}

export function StatusBadge({
  status,
  labelOverride,
  toneOverride,
  className = '',
}: StatusBadgeProps) {
  const mapped = STATUS_MAP[status] ?? {
    label: status,
    tone: 'neutral' as StatusTone,
    icon: 'clock',
  };
  const tone = toneOverride ?? mapped.tone;
  const label = labelOverride ?? mapped.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-s border px-2 py-0.5 text-m1 font-medium ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      {renderIcon(mapped.icon)}
      <span>{label}</span>
    </span>
  );
}
