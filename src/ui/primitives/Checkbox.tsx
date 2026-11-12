'use client';

import { Check, Minus } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import {
  Checkbox as RACCheckbox,
  type CheckboxProps as RACCheckboxProps,
} from 'react-aria-components';

export interface CheckboxProps extends Omit<RACCheckboxProps, 'children'> {
  label?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Checkbox({
  label,
  description,
  children,
  className = '',
  ...props
}: CheckboxProps) {
  const content = label || children;

  return (
    <RACCheckbox
      className={`group flex items-start gap-3 cursor-pointer select-none min-h-11 py-2.5 data-[disabled]:cursor-not-allowed ${className}`.trim()}
      {...props}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <div
            className="w-5 h-5 mt-0.5 rounded-xs border border-border bg-surface-sunken flex items-center justify-center shrink-0 transition-colors duration-100 group-data-[selected]:bg-accent group-data-[selected]:border-accent group-data-[indeterminate]:bg-accent group-data-[indeterminate]:border-accent group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-accent-subtle group-data-[focus-visible]:border-accent group-data-[disabled]:opacity-40"
            aria-hidden="true"
          >
            {isSelected && !isIndeterminate && (
              <Check size={14} weight="bold" className="text-on-accent" />
            )}
            {isIndeterminate && <Minus size={14} weight="bold" className="text-on-accent" />}
          </div>

          {(content || description) && (
            <div className="flex flex-col">
              {content && (
                <span className="text-body-s font-medium text-text-1 group-data-[disabled]:text-text-disabled">
                  {content}
                </span>
              )}
              {description && (
                <span className="text-caption text-text-3 mt-0.5">{description}</span>
              )}
            </div>
          )}
        </>
      )}
    </RACCheckbox>
  );
}
