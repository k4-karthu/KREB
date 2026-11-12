'use client';

import { Minus, Plus } from '@phosphor-icons/react';
import {
  Button as RACButton,
  FieldError as RACFieldError,
  Input as RACInput,
  Label as RACLabel,
  NumberField as RACNumberField,
  type NumberFieldProps as RACNumberFieldProps,
  Text as RACText,
} from 'react-aria-components';

export interface NumberFieldProps extends Omit<RACNumberFieldProps, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  className?: string;
  inputClassName?: string;
}

export function NumberField({
  label,
  description,
  error,
  errorMessage,
  className = '',
  inputClassName = '',
  isRequired,
  isInvalid,
  ...props
}: NumberFieldProps) {
  const errorText = error || errorMessage;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACNumberField
      isRequired={isRequired}
      isInvalid={hasError}
      className={`flex flex-col gap-1.5 w-full ${className}`.trim()}
      {...props}
    >
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
        className={`relative flex items-center bg-surface-sunken border rounded-s min-h-11 h-11 overflow-hidden transition-colors duration-160 ${
          hasError
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger-subtle'
            : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-subtle'
        }`}
      >
        <RACButton
          slot="decrement"
          aria-label="Decrease value"
          className="w-11 h-11 flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-surface transition-colors cursor-pointer outline-none select-none disabled:opacity-40 disabled:cursor-not-allowed border-r border-border shrink-0 focus-visible:bg-surface"
        >
          <Minus size={16} weight="bold" />
        </RACButton>

        <RACInput
          className={`w-full h-11 bg-transparent px-3 text-center text-body-s font-medium text-text-1 tabular-nums outline-none border-none disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`.trim()}
        />

        <RACButton
          slot="increment"
          aria-label="Increase value"
          className="w-11 h-11 flex items-center justify-center text-text-2 hover:text-text-1 hover:bg-surface transition-colors cursor-pointer outline-none select-none disabled:opacity-40 disabled:cursor-not-allowed border-l border-border shrink-0 focus-visible:bg-surface"
        >
          <Plus size={16} weight="bold" />
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
    </RACNumberField>
  );
}
