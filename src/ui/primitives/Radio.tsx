'use client';

import type { ReactNode } from 'react';
import {
  FieldError as RACFieldError,
  Label as RACLabel,
  Radio as RACRadio,
  RadioGroup as RACRadioGroup,
  type RadioGroupProps as RACRadioGroupProps,
  type RadioProps as RACRadioProps,
  Text as RACText,
} from 'react-aria-components';

export interface RadioGroupProps extends Omit<RACRadioGroupProps, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
  className?: string;
}

export function RadioGroup({
  label,
  description,
  error,
  errorMessage,
  orientation = 'vertical',
  children,
  className = '',
  isRequired,
  isInvalid,
  ...props
}: RadioGroupProps) {
  const errorText = error || errorMessage;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACRadioGroup
      orientation={orientation}
      isRequired={isRequired}
      isInvalid={hasError}
      className={`flex flex-col gap-2 w-full ${className}`.trim()}
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
        className={`flex ${
          orientation === 'horizontal' ? 'flex-row flex-wrap gap-4' : 'flex-col gap-1'
        }`}
      >
        {children}
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
    </RACRadioGroup>
  );
}

export interface RadioProps extends Omit<RACRadioProps, 'children'> {
  label?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Radio({ label, description, children, className = '', ...props }: RadioProps) {
  const content = label || children;

  return (
    <RACRadio
      className={`group flex items-start gap-3 cursor-pointer select-none min-h-11 py-2.5 data-[disabled]:cursor-not-allowed ${className}`.trim()}
      {...props}
    >
      {({ isSelected }) => (
        <>
          <div
            className="w-5 h-5 mt-0.5 rounded-full border border-border bg-surface-sunken flex items-center justify-center shrink-0 transition-colors duration-100 group-data-[selected]:border-accent group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-accent-subtle group-data-[disabled]:opacity-40"
            aria-hidden="true"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full bg-accent transition-transform duration-100 ease-out ${
                isSelected ? 'scale-100' : 'scale-0'
              }`}
            />
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
    </RACRadio>
  );
}
