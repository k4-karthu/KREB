'use client';

import { Popover as RadixPopover } from 'radix-ui';
import type { ReactNode } from 'react';

export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  showArrow?: boolean;
  className?: string;
}

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
  side = 'bottom',
  align = 'center',
  sideOffset = 6,
  showArrow = true,
  className = '',
}: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={sideOffset}
          className={`z-50 rounded-s border border-border bg-surface-raised p-4 text-text-1 shadow-e2 transition-all duration-200 ease-out focus:outline-none data-[state=closed]:opacity-0 data-[state=closed]:scale-95 data-[state=open]:opacity-100 data-[state=open]:scale-100 ${className}`.trim()}
        >
          {children}
          {showArrow && <RadixPopover.Arrow className="fill-surface-raised" />}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export const PopoverRoot = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverPortal = RadixPopover.Portal;
export const PopoverContent = RadixPopover.Content;
export const PopoverArrow = RadixPopover.Arrow;
export const PopoverClose = RadixPopover.Close;
