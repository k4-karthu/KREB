'use client';

import { X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { DUR, EASE } from '../tokens/motion';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className = '',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <RadixDialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DUR.fast / 1000, ease: EASE.out }}
                  className="fixed inset-0 bg-[rgb(var(--shadow-ink)/0.6)]"
                />
              </RadixDialog.Overlay>

              <RadixDialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: DUR.base / 1000, ease: EASE.out }}
                  className={`relative z-10 w-full max-w-lg rounded-m border border-border bg-surface-raised p-6 shadow-e3 focus:outline-none ${className}`.trim()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      {title && (
                        <RadixDialog.Title className="font-display text-h4 font-semibold text-text-1">
                          {title}
                        </RadixDialog.Title>
                      )}
                      {description && (
                        <RadixDialog.Description className="text-body-s text-text-2">
                          {description}
                        </RadixDialog.Description>
                      )}
                    </div>
                    <RadixDialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close dialog"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xs text-text-2 hover:bg-surface-sunken hover:text-text-1 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer transition-colors"
                      >
                        <X size={18} weight="bold" />
                      </button>
                    </RadixDialog.Close>
                  </div>

                  <div className="mt-4 text-body text-text-1">{children}</div>

                  {footer && (
                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </RadixDialog.Content>
            </div>
          )}
        </AnimatePresence>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogRoot = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogClose = RadixDialog.Close;
