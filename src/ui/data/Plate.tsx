export interface PlateProps {
  code: string;
  size?: 'sm' | 'md' | 'lg';
  paintHex?: string;
  className?: string;
}

const SIZE_CONTAINER = {
  sm: 'h-7 text-label-s',
  md: 'h-9 text-body font-bold',
  lg: 'h-11 text-h4 font-bold',
};

const STRIP_PADDING = {
  sm: 'px-1.5 py-0.5',
  md: 'px-2 py-1',
  lg: 'px-2.5 py-1.5',
};

/**
 * Kerb v3 Indian Registration Plate (§11.3):
 * White background, blue left IND strip, black registration code, font-mono permitted.
 */
export function Plate({ code, size = 'md', className = '' }: PlateProps) {
  return (
    <div
      role="img"
      aria-label={`Registration plate ${code}`}
      className={`inline-flex items-center overflow-hidden rounded-xs border border-border-strong bg-plate font-mono uppercase tabular-nums shadow-e0 select-none ${SIZE_CONTAINER[size]} ${className}`.trim()}
    >
      {/* Blue left IND international strip */}
      <div
        aria-hidden="true"
        className={`flex h-full flex-col items-center justify-center bg-accent text-on-accent ${STRIP_PADDING[size]}`}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-white opacity-80"
          style={{ marginBottom: 1 }}
        />
        <span
          className="font-bold leading-none tracking-tighter"
          style={{ fontSize: size === 'sm' ? 8 : 10 }}
        >
          IND
        </span>
      </div>

      {/* Plate Registration Code */}
      <span className="px-3 font-bold tracking-wider text-text-1">{code}</span>
    </div>
  );
}
