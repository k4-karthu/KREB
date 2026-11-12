interface PlateProps {
  code: string;
  paintHex?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Registration-style plate badge for booking codes and vehicle plates (§11.3).
 * Allowlisted for uppercase in slop-check.ts.
 */
export function Plate({ code, paintHex, size = 'md', className = '' }: PlateProps) {
  const sizeClass =
    size === 'lg'
      ? 'px-3 py-1.5 text-2'
      : size === 'sm'
        ? 'px-2 py-0.5 text-m1'
        : 'px-2.5 py-1 text-0';

  return (
    <span
      className={`font-plate uppercase tabular-nums inline-flex items-center gap-2 rounded-s border border-petrol-800 bg-sheet text-petrol-800 ${sizeClass} ${className}`.trim()}
    >
      {paintHex && (
        <span
          aria-hidden="true"
          className="inline-block w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0"
          style={{ backgroundColor: paintHex }}
        />
      )}
      <span>{code}</span>
    </span>
  );
}
