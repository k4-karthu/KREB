'use client';

import { X } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Drawer as VaulDrawer } from 'vaul';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  direction?: 'bottom' | 'right' | 'responsive';
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  direction = 'responsive',
  className = '',
}: DrawerProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 768px)');
    setIsDesktop(media.matches);

    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const effectiveDirection =
    direction === 'responsive' ? (isDesktop ? 'right' : 'bottom') : direction;

  const isSide = effectiveDirection === 'right';

  return (
    <VaulDrawer.Root
      open={open}
      onOpenChange={onOpenChange}
      direction={effectiveDirection}
      shouldScaleBackground={!isSide}
    >
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-50 bg-[rgb(var(--shadow-ink)/0.6)]" />
        <VaulDrawer.Content
          className={`fixed z-50 flex flex-col bg-surface-raised border-border shadow-e3 focus:outline-none ${
            isSide
              ? 'top-0 right-0 bottom-0 w-full max-w-md border-l p-6'
              : 'right-0 bottom-0 left-0 max-h-full rounded-t-xl border-t p-6'
          } ${className}`.trim()}
        >
          {!isSide && (
            <VaulDrawer.Handle className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              {title && (
                <VaulDrawer.Title className="font-display text-h4 font-semibold text-text-1">
                  {title}
                </VaulDrawer.Title>
              )}
              {description && (
                <VaulDrawer.Description className="text-body-s text-text-2">
                  {description}
                </VaulDrawer.Description>
              )}
            </div>

            <VaulDrawer.Close asChild>
              <button
                type="button"
                aria-label="Close drawer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xs text-text-2 hover:bg-surface-sunken hover:text-text-1 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer transition-colors"
              >
                <X size={18} weight="bold" />
              </button>
            </VaulDrawer.Close>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto text-body text-text-1">{children}</div>

          {footer && (
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-border-subtle pt-4">
              {footer}
            </div>
          )}
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}

export const DrawerRoot = VaulDrawer.Root;
export const DrawerTrigger = VaulDrawer.Trigger;
export const DrawerPortal = VaulDrawer.Portal;
export const DrawerOverlay = VaulDrawer.Overlay;
export const DrawerContent = VaulDrawer.Content;
export const DrawerTitle = VaulDrawer.Title;
export const DrawerDescription = VaulDrawer.Description;
export const DrawerClose = VaulDrawer.Close;
export const DrawerHandle = VaulDrawer.Handle;
