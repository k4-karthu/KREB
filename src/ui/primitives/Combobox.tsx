'use client';

import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import {
  Button as RACButton,
  ComboBox as RACComboBox,
  type ComboBoxProps as RACComboBoxProps,
  FieldError as RACFieldError,
  Input as RACInput,
  Label as RACLabel,
  ListBox as RACListBox,
  ListBoxItem as RACListBoxItem,
  type ListBoxItemProps as RACListBoxItemProps,
  Popover as RACPopover,
  Text as RACText,
} from 'react-aria-components';
import { DUR, EASE } from '../tokens/motion';

export interface ComboboxOption {
  id: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ComboboxProps<T extends object = ComboboxOption>
  extends Omit<RACComboBoxProps<T>, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  placeholder?: string;
  options?: ComboboxOption[];
  children?: ReactNode | ((item: T) => ReactNode);
  className?: string;
  inputClassName?: string;
  showSearchIcon?: boolean;
}

export interface ComboboxItemProps extends Omit<RACListBoxItemProps, 'children'> {
  children?: ReactNode;
}

export function ComboboxItem({ children, className = '', ...props }: ComboboxItemProps) {
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

export function Combobox<T extends object = ComboboxOption>({
  label,
  description,
  error,
  errorMessage,
  placeholder = 'Search...',
  options,
  children,
  className = '',
  inputClassName = '',
  showSearchIcon = true,
  isRequired,
  isInvalid,
  ...props
}: ComboboxProps<T>) {
  const errorText = error || errorMessage;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACComboBox
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

          <div
            className={`relative flex items-center bg-surface-sunken border rounded-s min-h-11 h-11 transition-colors duration-160 ${
              hasError
                ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger-subtle'
                : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-subtle'
            }`}
          >
            {showSearchIcon && (
              <div className="pl-3 text-text-3 shrink-0 flex items-center select-none">
                <MagnifyingGlass size={16} aria-hidden="true" />
              </div>
            )}

            <RACInput
              placeholder={placeholder}
              className={`w-full h-11 bg-transparent px-3 text-body-s text-text-1 placeholder:text-text-disabled outline-none border-none disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`.trim()}
            />

            <RACButton
              aria-label="Show suggestions"
              className="px-3 h-11 flex items-center justify-center text-text-3 hover:text-text-1 cursor-pointer outline-none shrink-0"
            >
              <CaretDown
                size={16}
                weight="bold"
                className={`transition-transform duration-160 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                }`}
                aria-hidden="true"
              />
            </RACButton>
          </div>

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
                        <ComboboxItem
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
                        </ComboboxItem>
                      ))
                    : (children as ReactNode)}
                </RACListBox>
              </motion.div>
            </AnimatePresence>
          </RACPopover>
        </>
      )}
    </RACComboBox>
  );
}
