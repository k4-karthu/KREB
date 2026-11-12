import { MagnifyingGlass } from '@phosphor-icons/react';
import type { ComponentType, ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ComponentType<{ size?: number; className?: string }> | ReactNode;
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
  icon: IconComponent = MagnifyingGlass,
  heading,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  // Render icon whether it is a component or React element
  const renderIcon = () => {
    if (!IconComponent) return null;
    if (typeof IconComponent === 'function') {
      const Component = IconComponent;
      return <Component size={28} className="text-text-3" />;
    }
    return IconComponent;
  };

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-m border border-border-subtle bg-surface p-8 text-center ${className}`.trim()}
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
          {typeof action === 'object' &&
          'label' in (action as Record<string, unknown>) &&
          'onClick' in (action as Record<string, unknown>)
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
                    className="inline-flex items-center justify-center gap-2 rounded-s bg-accent px-4 py-2 text-label-m font-medium text-on-accent transition-colors hover:bg-accent-hover cursor-pointer"
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
