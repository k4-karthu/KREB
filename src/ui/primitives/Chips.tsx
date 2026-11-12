'use client';

import { Check, X } from '@phosphor-icons/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ChipVariant = 'default' | 'filter' | 'removable';
export type ChipSize = 'sm' | 'md';

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onRemove?: () => void;
  icon?: ReactNode;
  count?: number | string;
  children: ReactNode;
  className?: string;
}

export function Chip({
  variant = 'default',
  size = 'md',
  selected = false,
  onSelect,
  onRemove,
  icon,
  count,
  children,
  className = '',
  disabled = false,
  onClick,
  ...props
}: ChipProps) {
  const isFilter = variant === 'filter';
  const isRemovable = variant === 'removable' || Boolean(onRemove);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (isFilter) {
      onSelect?.(!selected);
    }
    onClick?.(e);
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    onRemove?.();
  };

  const sizeClasses =
    size === 'sm'
      ? 'h-8 px-2.5 text-caption gap-1.5 after:absolute after:-inset-1.5'
      : 'h-11 px-4 text-body-s gap-2';

  const stateClasses = selected
    ? 'bg-accent-subtle text-accent border-accent font-medium shadow-e1'
    : 'bg-surface text-text-2 border-border hover:text-text-1 hover:border-border-strong data-[pressed]:bg-surface-sunken';

  if (isRemovable) {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-full border transition-all duration-100 ease-out select-none ${sizeClasses} ${stateClasses} ${className}`.trim()}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          className="truncate bg-transparent border-none outline-none cursor-pointer text-inherit font-inherit p-0"
          {...props}
        >
          {children}
        </button>
        {count !== undefined && (
          <span className="px-1.5 py-0.5 rounded-full text-caption tabular-nums font-semibold bg-surface-sunken text-text-2">
            {count}
          </span>
        )}
        <button
          type="button"
          aria-label="Remove"
          disabled={disabled}
          onClick={handleRemove}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-surface-sunken text-text-3 hover:text-text-1 cursor-pointer transition-colors border-none bg-transparent flex items-center justify-center"
        >
          <X size={12} weight="bold" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isFilter ? selected : undefined}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center rounded-full border transition-all duration-100 ease-out select-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${stateClasses} ${className}`.trim()}
      {...props}
    >
      {selected && isFilter && <Check size={14} weight="bold" className="text-accent shrink-0" />}
      {!selected && icon && <span className="shrink-0">{icon}</span>}

      <span className="truncate">{children}</span>

      {count !== undefined && (
        <span
          className={`px-1.5 py-0.5 rounded-full text-caption tabular-nums font-semibold ${
            selected ? 'bg-accent text-on-accent' : 'bg-surface-sunken text-text-2'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export interface ChipGroupProps {
  label?: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
}

export function ChipGroup({
  label,
  children,
  className = '',
  'aria-label': ariaLabel,
}: ChipGroupProps) {
  return (
    <fieldset
      aria-label={label || ariaLabel || 'Filter chips'}
      className={`flex flex-wrap items-center gap-2 border-0 p-0 m-0 ${className}`.trim()}
    >
      {label && (
        <legend className="text-caption font-medium text-text-3 mr-1 select-none float-left leading-8">
          {label}:
        </legend>
      )}
      {children}
    </fieldset>
  );
}

export { Chip as FilterChip };
