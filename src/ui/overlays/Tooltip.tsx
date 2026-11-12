'use client';

import { Tooltip as RadixTooltip } from 'radix-ui';
import type { ReactNode } from 'react';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  sideOffset = 4,
  delayDuration = 150,
  className = '',
}: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            className={`z-50 rounded-xs border border-border bg-surface-raised px-2.5 py-1 text-label-s text-text-1 shadow-e1 transition-all duration-150 ease-out select-none data-[state=closed]:opacity-0 data-[state=delayed-open]:opacity-100 ${className}`.trim()}
          >
            {content}
            <RadixTooltip.Arrow className="fill-surface-raised" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

export const TooltipProvider = RadixTooltip.Provider;
export const TooltipRoot = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipPortal = RadixTooltip.Portal;
export const TooltipContent = RadixTooltip.Content;
export const TooltipArrow = RadixTooltip.Arrow;
