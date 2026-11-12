import { Check } from 'lucide-react';

export interface StepItem {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  currentIndex: number;
}

/**
 * Three-stop lane-line stepper (§11.3, §11.9).
 */
export function Stepper({ steps, currentIndex }: StepperProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-m1 font-bold tabular-nums ${
                    isDone
                      ? 'bg-petrol-800 text-white border-petrol-800'
                      : isCurrent
                        ? 'bg-amber-500 text-petrol-950 border-amber-600'
                        : 'bg-sheet text-stone-500 border-stone-300'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : idx + 1}
                </span>
                <span
                  className={`text-m1 font-medium ${
                    isCurrent ? 'text-petrol-800' : 'text-stone-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div aria-hidden="true" className="flex-1">
                  {isDone ? (
                    <div className="h-0.5 w-full bg-petrol-800" />
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="h-1 w-full text-amber-500"
                      preserveAspectRatio="none"
                      viewBox="0 0 200 4"
                    >
                      <line
                        x1="0"
                        y1="2"
                        x2="200"
                        y2="2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="10 8"
                      />
                    </svg>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
