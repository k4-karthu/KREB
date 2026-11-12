export interface SpecRow {
  label: string;
  value: string;
}

export function SpecSheet({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="divide-y divide-stone-200 border-y border-stone-200">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-m1 text-stone-500">{row.label}</dt>
          <dd className="text-0 font-medium text-petrol-800 tabular-nums text-right">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
