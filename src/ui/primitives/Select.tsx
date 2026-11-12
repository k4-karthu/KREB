'use client';

import { CaretDown, Check } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  Button as RACButton,
  FieldError as RACFieldError,
  Label as RACLabel,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  type ListBoxItemProps as RACListBoxItemProps,
  Popover as RACPopover,
  Select as RACSelect,
  type SelectProps as RACSelectProps,
  SelectValue as RACSelectValue,
  Text as RACText,
} from 'react-aria-components';
import { DUR, EASE } from '../tokens/motion';

export interface SelectOption {
  id: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps<T extends object = SelectOption>
  extends Omit<RACSelectProps<T>, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  placeholder?: string;
  options?: SelectOption[];
  children?: ReactNode | ((item: T) => ReactNode);
  className?: string;
  triggerClassName?: string;
}

export interface SelectItemProps extends Omit<RACListBoxItemProps, 'children'> {
  children?: ReactNode;
}

export function SelectItem({ children, className = '', ...props }: SelectItemProps) {
  return (
    <RACListBoxItem
      className={`group flex items-center justify-between px-3 py-2 min-h-11 rounded-xs text-body-s text-text-1 cursor-pointer outline-none select-none transition-colors hover:bg-surface-sunken focus:bg-surface-sunken data-[selected]:bg-accent-subtle data-[selected]:text-accent data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed ${className}`.trim()}
      {...props}
    >
      {(itemState) => (
        <>
          <span className="truncate">{children}</span>
          {itemState.isSelected && (
            <Check size={16} weight="bold" className="text-accent shrink-0 ml-2" />
          )}
        </>
      )}
    </RACListBoxItem>
  );
}

export function Select<T extends object = SelectOption>({
  label,
  description,
  error,
  errorMessage,
  placeholder = 'Select an option',
  options,
  children,
  className = '',
  triggerClassName = '',
  isRequired,
  isInvalid,
  ...props
}: SelectProps<T>) {
  const errorText = error || errorMessage;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACSelect
      isRequired={isRequired}
      isInvalid={hasError}
      className={`flex flex-col gap-1.5 w-full ${className}`.trim()}
      {...props}
    >
      {({ isOpen }) => (
        <>
          {label && (
            <RACLabel className="text-caption font-medium text-text-2 flex items-center gap-1 select-none">
              <span>{label}</span>
              {isRequired && (
                <span className="text-danger leading-none" aria-hidden="true">
                  *
                </span>
              )}
            </RACLabel>
          )}

          <RACButton
            className={`group flex items-center justify-between w-full min-h-11 h-11 px-3 bg-surface border rounded-s text-body-s text-text-1 transition-colors duration-160 cursor-pointer outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              hasError
                ? 'border-danger focus-visible:ring-danger'
                : 'border-border hover:bg-surface-sunken hover:border-border-strong focus-visible:border-accent focus-visible:ring-accent-subtle data-[pressed]:bg-surface-sunken'
            } ${triggerClassName}`.trim()}
          >
            <RACSelectValue className="truncate text-left data-[placeholder]:text-text-disabled" />
            <CaretDown
              size={16}
              weight="bold"
              className={`text-text-3 shrink-0 ml-2 transition-transform duration-160 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
              aria-hidden="true"
            />
          </RACButton>

          {description && !errorText && (
            <RACText slot="description" className="text-caption text-text-3">
              {description}
            </RACText>
          )}

          {errorText ? (
            <p role="alert" className="text-caption text-danger font-medium">
              {errorText}
            </p>
          ) : (
            <RACFieldError className="text-caption text-danger font-medium" />
          )}

          <RACPopover
            offset={4}
            className="z-50 min-w-(--trigger-width) max-w-sm rounded-s border border-border bg-surface shadow-e2 overflow-hidden outline-none"
          >
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: DUR.fast / 1000, ease: EASE.out }}
              >
                <RACListBox className="p-1 max-h-60 overflow-y-auto outline-none">
                  {options
                    ? options.map((opt) => (
                        <SelectItem
                          key={opt.id}
                          id={opt.id}
                          textValue={opt.label}
                          isDisabled={opt.disabled}
                        >
                          <div>
                            <div>{opt.label}</div>
                            {opt.description && (
                              <div className="text-caption text-text-3">{opt.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    : (children as ReactNode)}
                </RACListBox>
              </motion.div>
            </AnimatePresence>
          </RACPopover>
        </>
      )}
    </RACSelect>
  );
}

export { RACSelectValue as SelectValue };
