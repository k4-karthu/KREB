'use client';

import { CaretDown, CaretLeft, CaretRight, CaretUp, CaretUpDown } from '@phosphor-icons/react';
import { type ColumnDef, createTableHook, flexRender, stockFeatures } from '@tanstack/react-table';
import { useState } from 'react';

export type TableFeaturesType = typeof stockFeatures;

export const { useAppTable, createAppColumnHelper } = createTableHook({
  features: stockFeatures,
});

export interface TableProps<TData extends object> {
  data: TData[];
  // biome-ignore lint/suspicious/noExplicitAny: TanStack ColumnDef type variance
  columns: ColumnDef<TableFeaturesType, TData, any>[];
  pageSize?: number;
  className?: string;
}

export function Table<TData extends object>({
  data,
  columns,
  pageSize = 10,
  className = '',
}: TableProps<TData>) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  const table = useAppTable({
    data,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  return (
    <div
      className={`rounded-m border border-border bg-surface overflow-hidden shadow-e0 ${className}`.trim()}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-body-s">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-surface-sunken/50">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`px-4 py-3 text-label-s font-semibold text-text-2 select-none ${
                        canSort ? 'cursor-pointer hover:text-text-1' : ''
                      }`}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          <span className="text-text-3">
                            {isSorted === 'asc' ? (
                              <CaretUp size={14} weight="bold" />
                            ) : isSorted === 'desc' ? (
                              <CaretDown size={14} weight="bold" />
                            ) : (
                              <CaretUpDown size={14} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-body-s text-text-3"
                >
                  No records to display.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-surface-sunken/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-text-1">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-3 text-label-s text-text-2">
        <div className="flex items-center gap-2">
          <span>
            Page{' '}
            <strong className="text-text-1 tabular-nums">
              {table.state.pagination.pageIndex + 1}
            </strong>{' '}
            of <strong className="text-text-1 tabular-nums">{table.getPageCount() || 1}</strong>
          </span>
          <span className="text-text-disabled">·</span>
          <span className="tabular-nums">{data.length} total</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xs border border-border-subtle text-text-2 hover:bg-surface-sunken hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <CaretLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xs border border-border-subtle text-text-2 hover:bg-surface-sunken hover:text-text-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <CaretRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
