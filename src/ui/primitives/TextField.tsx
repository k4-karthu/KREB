'use client';

import { forwardRef, type ReactNode } from 'react';
import {
  FieldError as RACFieldError,
  Input as RACInput,
  Label as RACLabel,
  Text as RACText,
  TextField as RACTextField,
  type TextFieldProps as RACTextFieldProps,
} from 'react-aria-components';

export interface TextFieldProps extends Omit<RACTextFieldProps, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  placeholder?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  className?: string;
  inputClassName?: string;
  required?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    label,
    description,
    error,
    errorMessage,
    placeholder,
    prefix,
    suffix,
    className = '',
    inputClassName = '',
    required = false,
    isRequired,
    isInvalid,
    ...rest
  },
  ref,
) {
  const errorText = error || errorMessage;
  const isFieldRequired = required || isRequired;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACTextField
      isRequired={isFieldRequired}
      isInvalid={hasError}
      className={`flex flex-col gap-1.5 w-full ${className}`.trim()}
      {...rest}
    >
      {label && (
        <RACLabel className="text-caption font-medium text-text-2 flex items-center gap-1 select-none">
          <span>{label}</span>
          {isFieldRequired && (
            <span className="text-danger leading-none" aria-hidden="true">
              *
            </span>
          )}
        </RACLabel>
      )}
      <div
        className={`relative flex items-center bg-surface-sunken border rounded-s min-h-11 transition-colors duration-160 ${
          hasError
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger-subtle'
            : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-subtle'
        }`}
      >
        {prefix && (
          <div className="pl-3 text-text-3 shrink-0 flex items-center select-none">{prefix}</div>
        )}
        <RACInput
          ref={ref}
          placeholder={placeholder}
          className={`w-full h-11 bg-transparent px-3 text-body-s text-text-1 placeholder:text-text-disabled outline-none border-none disabled:opacity-50 disabled:cursor-not-allowed ${inputClassName}`.trim()}
        />
        {suffix && (
          <div className="pr-3 text-text-3 shrink-0 flex items-center select-none">{suffix}</div>
        )}
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
    </RACTextField>
  );
});
