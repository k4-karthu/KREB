import type { ReactNode } from 'react';

export interface SpecRow {
  label: string;
  value: ReactNode;
}

export interface SpecSheetProps {
  rows: SpecRow[];
  columns?: 1 | 2;
  className?: string;
}

/**
 * Kerb v3 SpecSheet:
 * 2-col label/value specs grid styled with border-subtle and tabular-nums.
 */
export function SpecSheet({ rows, columns = 1, className = '' }: SpecSheetProps) {
  if (columns === 2) {
    return (
      <dl className={`grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 ${className}`.trim()}>
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 border-b border-border-subtle pb-2.5"
          >
            <dt className="text-label-s text-text-3">{row.label}</dt>
            <dd className="text-right text-body-s font-medium text-text-1 tabular-nums">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl
      className={`divide-y divide-border-subtle border-y border-border-subtle ${className}`.trim()}
    >
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-label-s text-text-3">{row.label}</dt>
          <dd className="text-right text-body-s font-medium text-text-1 tabular-nums">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
