'use client';

import { Check } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

export interface StepItem {
  id: string;
  label: ReactNode;
  description?: ReactNode;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number;
  className?: string;
}

/**
 * Kerb v3 Stepper:
 * Step progress indicator with completed checkmarks, active accent rings, and pending neutral dots.
 * Collapses cleanly on mobile (< 640px) into a compact segmented ledger bar.
 */
export function Stepper({ steps, currentStep, className = '' }: StepperProps) {
  const currentStepItem = steps[currentStep] ?? steps[0];

  return (
    <nav aria-label="Progress" className={`w-full ${className}`.trim()}>
      {/* Mobile compact progress header */}
      <div className="sm:hidden mb-2 flex items-center justify-between text-caption font-medium">
        <span className="font-technical text-text-3 tabular-nums">
          Step 0{currentStep + 1} / 0{steps.length}
        </span>
        <span className="font-semibold text-text-1">{currentStepItem?.label}</span>
      </div>

      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.id}
              className={`relative flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Step Indicator Dot */}
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-label-s font-bold tabular-nums transition-colors ${
                    isCompleted
                      ? 'bg-success text-white'
                      : isActive
                        ? 'border-2 border-accent bg-surface text-accent ring-2 sm:ring-4 ring-accent-subtle'
                        : 'border border-border bg-surface-sunken text-text-disabled'
                  }`}
                >
                  {isCompleted ? <Check size={14} weight="bold" /> : index + 1}
                </span>

                {/* Step Labels (Hidden on mobile) */}
                <div className="hidden sm:block">
                  <span
                    className={`block text-label-s font-medium ${
                      isActive
                        ? 'text-text-1 font-semibold'
                        : isCompleted
                          ? 'text-text-2'
                          : 'text-text-disabled'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.description && (
                    <span className="block text-body-s text-text-3">{step.description}</span>
                  )}
                </div>
              </div>

              {/* Connecting line to next step */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className={`mx-2 sm:mx-3 h-0.5 flex-1 transition-colors ${
                    isCompleted ? 'bg-success' : 'bg-border-subtle'
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
