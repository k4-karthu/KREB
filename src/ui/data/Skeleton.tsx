export type SkeletonVariant = 'line' | 'block' | 'circle';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  width?: string;
  height?: string;
}

const VARIANT_DEFAULTS: Record<SkeletonVariant, string> = {
  line: 'h-4 w-full rounded-xs',
  block: 'h-32 w-full rounded-s',
  circle: 'h-10 w-10 rounded-full shrink-0',
};

/**
 * Kerb v3 Skeleton:
 * Subtle shimmer placeholder on surface-sunken base with border-subtle shimmer.
 */
export function Skeleton({ variant = 'line', className = '', width, height }: SkeletonProps) {
  const defaultClass = VARIANT_DEFAULTS[variant];

  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={`animate-pulse border border-border-subtle/60 bg-surface-sunken ${defaultClass} ${className}`.trim()}
    />
  );
}
