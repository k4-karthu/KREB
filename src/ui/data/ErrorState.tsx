import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export interface ErrorStateProps {
  heading?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Kerb v3 ErrorState:
 * Danger-tinted empty state with Phosphor WarningCircle icon and subtle danger accents.
 */
export function ErrorState({
  heading = 'Unable to load content',
  description = 'Something went wrong while fetching this information. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  action,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center rounded-m border border-danger/25 bg-surface p-8 text-center ${className}`.trim()}
    >
      <div
        aria-hidden="true"
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-subtle text-danger"
      >
        <WarningCircle size={28} weight="fill" />
      </div>

      <h3 className="font-display text-h4 font-semibold text-text-1">{heading}</h3>

      {description && <p className="mt-1.5 max-w-sm text-body-s text-text-2">{description}</p>}

      {(onRetry || action) && (
        <div className="mt-5">
          {action ? (
            action
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-2 rounded-s border border-border bg-surface px-4 py-2 text-label-m font-medium text-text-1 transition-colors hover:bg-surface-sunken hover:border-border-strong cursor-pointer"
            >
              <ArrowClockwise size={16} />
              <span>{retryLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
