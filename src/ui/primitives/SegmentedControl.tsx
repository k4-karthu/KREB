'use client';

import { motion } from 'motion/react';
import { ToggleGroup } from 'radix-ui';
import { type ReactNode, useId, useState } from 'react';
import { DUR, EASE } from '../tokens/motion';

export interface SegmentedControlOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options?: SegmentedControlOption[];
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
  name?: string;
}

export function SegmentedControl({
  value: controlledValue,
  defaultValue,
  onValueChange,
  options,
  children,
  className = '',
  disabled = false,
  'aria-label': ariaLabel = 'Segmented control',
  name,
}: SegmentedControlProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(
    defaultValue || options?.[0]?.value || '',
  );
  const activeValue = isControlled ? controlledValue : internalValue;
  const layoutId = useId();

  const handleValueChange = (val: string) => {
    if (!val) return; // Prevent deselecting in single mode
    if (!isControlled) {
      setInternalValue(val);
    }
    onValueChange?.(val);
  };

  return (
    <ToggleGroup.Root
      type="single"
      value={activeValue}
      onValueChange={handleValueChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 bg-surface-sunken border border-border rounded-s relative ${className}`.trim()}
    >
      {options
        ? options.map((opt) => {
            const isSelected = activeValue === opt.value;
            return (
              <ToggleGroup.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className={`group relative flex items-center justify-center min-h-11 px-4 py-2 text-body-s rounded-xs outline-none select-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSelected ? 'text-text-1 font-semibold' : 'text-text-2 hover:text-text-1'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId={`pill-${name || layoutId}`}
                    className="absolute inset-0 bg-surface rounded-xs shadow-e1 border border-border-subtle"
                    transition={{ duration: DUR.fast / 1000, ease: EASE.out }}
                  />
                )}
                <span className="relative z-10 truncate">{opt.label}</span>
              </ToggleGroup.Item>
            );
          })
        : children}
    </ToggleGroup.Root>
  );
}

export interface SegmentedControlItemProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControlItem({
  value,
  children,
  disabled = false,
  className = '',
}: SegmentedControlItemProps) {
  return (
    <ToggleGroup.Item
      value={value}
      disabled={disabled}
      className={`group relative flex items-center justify-center min-h-11 px-4 py-2 text-body-s rounded-xs outline-none select-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40 disabled:cursor-not-allowed data-[state=on]:bg-surface data-[state=on]:text-text-1 data-[state=on]:font-semibold data-[state=on]:shadow-e1 data-[state=off]:text-text-2 hover:data-[state=off]:text-text-1 ${className}`.trim()}
    >
      <span className="relative z-10 truncate">{children}</span>
    </ToggleGroup.Item>
  );
}
