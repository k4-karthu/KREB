/**
 * Static stone-200 placeholder block (no shimmer per §11.8).
 */
export function Skeleton({ className = 'h-6 w-full' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-s bg-stone-200 ${className}`.trim()} />;
}
