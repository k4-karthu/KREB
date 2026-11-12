'use client';

import { CheckCircle, Info, Warning, WarningCircle } from '@phosphor-icons/react';
import type { ComponentProps } from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

export type ToasterProps = ComponentProps<typeof SonnerToaster>;

export function Toaster({ ...props }: ToasterProps) {
  return (
    <SonnerToaster
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-s border border-border border-l-4 bg-surface-raised p-4 text-text-1 shadow-e2 border-l-accent font-text text-body-s',
          title: 'font-medium text-text-1 text-label-m',
          description: 'text-text-2 text-body-s mt-0.5',
          actionButton:
            'inline-flex items-center justify-center rounded-xs bg-accent px-3 py-1.5 text-label-s font-medium text-on-accent hover:bg-accent-hover transition-colors',
          cancelButton:
            'inline-flex items-center justify-center rounded-xs bg-surface-sunken px-3 py-1.5 text-label-s font-medium text-text-2 hover:text-text-1 transition-colors',
          closeButton: 'text-text-3 hover:text-text-1 rounded-xs p-1 transition-colors',
          success: 'border-l-success',
          warning: 'border-l-warning',
          error: 'border-l-danger',
          info: 'border-l-accent',
        },
      }}
      icons={{
        success: <CheckCircle size={20} weight="fill" className="text-success shrink-0" />,
        warning: <Warning size={20} weight="fill" className="text-warning shrink-0" />,
        error: <WarningCircle size={20} weight="fill" className="text-danger shrink-0" />,
        info: <Info size={20} weight="fill" className="text-accent shrink-0" />,
      }}
      {...props}
    />
  );
}

export const toast = sonnerToast;
