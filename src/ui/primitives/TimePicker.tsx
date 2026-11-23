'use client';

import { Clock } from '@phosphor-icons/react';
import {
  DateInput,
  DateSegment,
  FieldError as RACFieldError,
  Label as RACLabel,
  Text as RACText,
  TimeField as RACTimeField,
  type TimeFieldProps as RACTimeFieldProps,
  type TimeValue,
} from 'react-aria-components';

export interface TimePickerProps<T extends TimeValue = TimeValue>
  extends Omit<RACTimeFieldProps<T>, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  className?: string;
  fieldClassName?: string;
}

export function TimePicker<T extends TimeValue = TimeValue>({
  label,
  description,
  error,
  errorMessage,
  className = '',
  fieldClassName = '',
  isRequired,
  isInvalid,
  ...props
}: TimePickerProps<T>) {
  const errorText = error || errorMessage;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACTimeField
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
        className={`relative flex items-center justify-between bg-surface-sunken border rounded-s min-h-11 h-11 px-2.5 transition-colors duration-160 w-full min-w-0 ${
          hasError
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger-subtle'
            : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-subtle'
        } ${fieldClassName}`.trim()}
      >
        <DateInput className="flex items-center text-caption sm:text-body-s text-text-1 min-w-0 shrink-0">
          {(segment) => (
            <DateSegment
              segment={segment}
              suppressHydrationWarning
              className={`rounded-xs outline-none focus:bg-accent focus:text-on-accent tabular-nums data-[placeholder]:text-text-disabled ${
                segment.type === 'literal' ? 'px-0 text-text-disabled select-none' : 'px-0.5 py-0.5'
              }`}
            />
          )}
        </DateInput>

        <Clock size={15} className="text-text-3 shrink-0 ml-1.5 select-none" aria-hidden="true" />
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
    </RACTimeField>
  );
}

export type { TimeValue };
