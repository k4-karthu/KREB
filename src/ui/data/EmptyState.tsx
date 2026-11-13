'use client';

import { Calendar, Car, MagnifyingGlass, Receipt, Ticket } from '@phosphor-icons/react';
import React, { type ElementType, type ReactNode } from 'react';

export type EmptyStateIconName = 'car' | 'magnifying-glass' | 'receipt' | 'calendar' | 'ticket';

const ICON_MAP: Record<EmptyStateIconName, ElementType> = {
  car: Car,
  'magnifying-glass': MagnifyingGlass,
  receipt: Receipt,
  calendar: Calendar,
  ticket: Ticket,
};

export interface EmptyStateProps {
  icon?: ElementType | ReactNode;
  iconName?: EmptyStateIconName;
  heading: ReactNode;
  description?: ReactNode;
  action?:
    | ReactNode
    | {
        label: string;
        onClick: () => void;
        icon?: ReactNode;
      };
  className?: string;
}

export function EmptyState({
  icon,
  iconName,
  heading,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  const renderIcon = () => {
    if (iconName && ICON_MAP[iconName]) {
      const ResolvedIcon = ICON_MAP[iconName];
      return <ResolvedIcon size={28} className="text-text-3" />;
    }

    if (React.isValidElement(icon)) {
      return icon;
    }

    if (
      typeof icon === 'function' ||
      (typeof icon === 'object' && icon !== null && '$$typeof' in icon)
    ) {
      return React.createElement(icon as ElementType, { size: 28, className: 'text-text-3' });
    }

    return <MagnifyingGlass size={28} className="text-text-3" />;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-m border border-border-subtle bg-surface p-8 text-center shadow-e0 ${className}`.trim()}
    >
      <div
        aria-hidden="true"
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-text-3"
      >
        {renderIcon()}
      </div>

      <h3 className="font-display text-h4 font-semibold text-text-1">{heading}</h3>

      {description && <p className="mt-1.5 max-w-sm text-body-s text-text-2">{description}</p>}

      {action && (
        <div className="mt-5">
          {typeof action === 'object' && action !== null && 'label' in action && 'onClick' in action
            ? (() => {
                const act = action as {
                  label: string;
                  onClick: () => void;
                  icon?: ReactNode;
                };
                return (
                  <button
                    type="button"
                    onClick={act.onClick}
                    className="inline-flex items-center justify-center gap-2 rounded-s bg-accent px-4 py-2 text-label-m font-medium text-on-accent transition-colors hover:bg-accent-hover cursor-pointer shadow-e1"
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </button>
                );
              })()
            : (action as ReactNode)}
        </div>
      )}
    </div>
  );
}
