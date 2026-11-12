'use client';

import type { ReactNode } from 'react';
import { Switch as RACSwitch, type SwitchProps as RACSwitchProps } from 'react-aria-components';

export interface SwitchProps extends Omit<RACSwitchProps, 'children'> {
  label?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Switch({ label, description, children, className = '', ...props }: SwitchProps) {
  const content = label || children;

  return (
    <RACSwitch
      className={`group flex items-center justify-between gap-3 cursor-pointer select-none min-h-11 py-2 data-[disabled]:cursor-not-allowed ${className}`.trim()}
      {...props}
    >
      {(content || description) && (
        <div className="flex flex-col">
          {content && (
            <span className="text-body-s font-medium text-text-1 group-data-[disabled]:text-text-disabled">
              {content}
            </span>
          )}
          {description && <span className="text-caption text-text-3 mt-0.5">{description}</span>}
        </div>
      )}

      <div
        className="relative inline-flex items-center w-11 h-6 rounded-full bg-surface-sunken border border-border p-0.5 shrink-0 transition-colors duration-160 ease-out group-data-[selected]:bg-accent group-data-[selected]:border-accent group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-accent-subtle group-data-[disabled]:opacity-40"
        aria-hidden="true"
      >
        <div className="w-5 h-5 rounded-full bg-surface shadow-e1 transition-transform duration-160 ease-out group-data-[selected]:translate-x-5" />
      </div>
    </RACSwitch>
  );
}
