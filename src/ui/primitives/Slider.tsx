'use client';

import {
  Label as RACLabel,
  Slider as RACSlider,
  type SliderProps as RACSliderProps,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components';

export interface SliderProps<T extends number | number[] = number>
  extends Omit<RACSliderProps<T>, 'children'> {
  label?: string;
  formatOptions?: Intl.NumberFormatOptions;
  className?: string;
  showOutput?: boolean;
}

export function Slider<T extends number | number[] = number>({
  label,
  formatOptions,
  className = '',
  showOutput = true,
  ...props
}: SliderProps<T>) {
  return (
    <RACSlider
      formatOptions={formatOptions}
      className={`flex flex-col gap-2 w-full ${className}`.trim()}
      {...props}
    >
      {(label || showOutput) && (
        <div className="flex items-center justify-between text-body-s">
          {label && <RACLabel className="font-medium text-text-2 select-none">{label}</RACLabel>}
          {showOutput && (
            <SliderOutput className="font-semibold text-text-1 tabular-nums ml-auto" />
          )}
        </div>
      )}

      <SliderTrack className="relative w-full h-2 rounded-full bg-surface-sunken border border-border cursor-pointer flex items-center my-3">
        {({ state }) => {
          const thumbPercent = state.getThumbPercent(0) * 100;
          return (
            <>
              <div
                className="absolute left-0 h-full rounded-full bg-accent pointer-events-none"
                style={{ width: `${thumbPercent}%` }}
              />
              <SliderThumb className="relative w-6 h-6 rounded-full bg-surface border-2 border-accent shadow-e2 outline-none cursor-grab active:cursor-grabbing focus-visible:ring-4 focus-visible:ring-accent-subtle transition-transform data-[dragging]:scale-110 after:absolute after:-inset-2.5 after:rounded-full" />
            </>
          );
        }}
      </SliderTrack>
    </RACSlider>
  );
}
