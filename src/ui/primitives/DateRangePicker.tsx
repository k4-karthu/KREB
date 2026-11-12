'use client';

import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import {
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  DateInput,
  DateSegment,
  type DateValue,
  Heading,
  Button as RACButton,
  DateRangePicker as RACDateRangePicker,
  type DateRangePickerProps as RACDateRangePickerProps,
  Dialog as RACDialog,
  FieldError as RACFieldError,
  Group as RACGroup,
  Label as RACLabel,
  Popover as RACPopover,
  Text as RACText,
  RangeCalendar,
} from 'react-aria-components';

export interface DateRangePickerProps<T extends DateValue = DateValue>
  extends Omit<RACDateRangePickerProps<T>, 'children'> {
  label?: string;
  description?: string;
  error?: string;
  errorMessage?: string;
  className?: string;
}

export function DateRangePicker<T extends DateValue = DateValue>({
  label,
  description,
  error,
  errorMessage,
  className = '',
  isRequired,
  isInvalid,
  ...props
}: DateRangePickerProps<T>) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    setIsDesktop(media.matches);

    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const errorText = error || errorMessage;
  const hasError = isInvalid || Boolean(errorText);

  return (
    <RACDateRangePicker
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

      <RACGroup
        className={`relative flex items-center bg-surface-sunken border rounded-s min-h-11 h-11 px-3 transition-colors duration-160 ${
          hasError
            ? 'border-danger focus-within:border-danger focus-within:ring-2 focus-within:ring-danger-subtle'
            : 'border-border focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-subtle'
        }`}
      >
        <DateInput slot="start" className="flex items-center text-body-s text-text-1">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-1 py-0.5 rounded-xs outline-none focus:bg-accent focus:text-on-accent tabular-nums data-[placeholder]:text-text-disabled"
            />
          )}
        </DateInput>

        <span aria-hidden="true" className="px-2 text-text-3 font-medium select-none">
          –
        </span>

        <DateInput slot="end" className="flex items-center text-body-s text-text-1">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-1 py-0.5 rounded-xs outline-none focus:bg-accent focus:text-on-accent tabular-nums data-[placeholder]:text-text-disabled"
            />
          )}
        </DateInput>

        <RACButton
          aria-label="Open calendar"
          className="ml-auto p-1.5 rounded-xs text-text-3 hover:text-text-1 hover:bg-surface transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
        >
          <CalendarBlank size={18} aria-hidden="true" />
        </RACButton>
      </RACGroup>

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
        offset={6}
        className="z-50 p-4 bg-surface border border-border rounded-s shadow-e3 outline-none"
      >
        <RACDialog className="outline-none">
          <RangeCalendar
            visibleDuration={isDesktop ? { months: 2 } : { months: 1 }}
            className="flex flex-col gap-4"
          >
            <header className="flex items-center justify-between px-1">
              <RACButton
                slot="previous"
                aria-label="Previous month"
                className="w-8 h-8 flex items-center justify-center rounded-xs text-text-2 hover:text-text-1 hover:bg-surface-sunken transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <CaretLeft size={16} weight="bold" />
              </RACButton>

              <Heading className="text-body-s font-semibold text-text-1" />

              <RACButton
                slot="next"
                aria-label="Next month"
                className="w-8 h-8 flex items-center justify-center rounded-xs text-text-2 hover:text-text-1 hover:bg-surface-sunken transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <CaretRight size={16} weight="bold" />
              </RACButton>
            </header>

            <div className="flex flex-col md:flex-row gap-6">
              <CalendarGrid className="border-collapse">
                <CalendarGridHeader>
                  {(day) => (
                    <CalendarHeaderCell className="text-caption font-medium text-text-3 w-9 h-9 text-center">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody>
                  {(date) => (
                    <CalendarCell
                      date={date}
                      className={({
                        isSelected,
                        isSelectionStart,
                        isSelectionEnd,
                        isOutsideVisibleRange,
                        isDisabled,
                      }) => {
                        let classes =
                          'w-9 h-9 text-body-s flex items-center justify-center cursor-pointer select-none outline-none font-medium tabular-nums transition-colors';

                        if (isOutsideVisibleRange) {
                          classes += ' text-text-disabled opacity-30';
                        } else if (isDisabled) {
                          classes += ' text-text-disabled opacity-40 cursor-not-allowed';
                        } else if (isSelectionStart || isSelectionEnd) {
                          classes += ' bg-accent text-on-accent rounded-s font-semibold z-10';
                        } else if (isSelected) {
                          classes += ' bg-accent-subtle text-accent rounded-none';
                        } else {
                          classes += ' hover:bg-surface-sunken rounded-s text-text-1';
                        }

                        return classes;
                      }}
                    />
                  )}
                </CalendarGridBody>
              </CalendarGrid>

              {isDesktop && (
                <CalendarGrid offset={{ months: 1 }} className="border-collapse">
                  <CalendarGridHeader>
                    {(day) => (
                      <CalendarHeaderCell className="text-caption font-medium text-text-3 w-9 h-9 text-center">
                        {day}
                      </CalendarHeaderCell>
                    )}
                  </CalendarGridHeader>
                  <CalendarGridBody>
                    {(date) => (
                      <CalendarCell
                        date={date}
                        className={({
                          isSelected,
                          isSelectionStart,
                          isSelectionEnd,
                          isOutsideVisibleRange,
                          isDisabled,
                        }) => {
                          let classes =
                            'w-9 h-9 text-body-s flex items-center justify-center cursor-pointer select-none outline-none font-medium tabular-nums transition-colors';

                          if (isOutsideVisibleRange) {
                            classes += ' text-text-disabled opacity-30';
                          } else if (isDisabled) {
                            classes += ' text-text-disabled opacity-40 cursor-not-allowed';
                          } else if (isSelectionStart || isSelectionEnd) {
                            classes += ' bg-accent text-on-accent rounded-s font-semibold z-10';
                          } else if (isSelected) {
                            classes += ' bg-accent-subtle text-accent rounded-none';
                          } else {
                            classes += ' hover:bg-surface-sunken rounded-s text-text-1';
                          }

                          return classes;
                        }}
                      />
                    )}
                  </CalendarGridBody>
                </CalendarGrid>
              )}
            </div>
          </RangeCalendar>
        </RACDialog>
      </RACPopover>
    </RACDateRangePicker>
  );
}
