'use client';

import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-petrol-950/60" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-m border border-stone-200 bg-sheet p-6 shadow-overlay">
          <div className="flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="text-2 font-bold text-petrol-800">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-m1 text-stone-500">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close dialog"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-petrol-800 hover:bg-stone-200 cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </RadixDialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
