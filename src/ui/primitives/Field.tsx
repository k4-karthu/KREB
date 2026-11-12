import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ id, label, hint, error, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-m1 font-medium text-petrol-800">
        {label}
        {required && (
          <span className="text-stop-600 ml-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-m1 text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-m1 text-stop-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_BASE =
  'w-full rounded-m border border-stone-300 bg-sheet px-3 text-0 text-petrol-800 placeholder:text-stone-500 focus:border-petrol-800 disabled:opacity-50 disabled:cursor-not-allowed';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} className={`${CONTROL_BASE} h-11 ${className}`.trim()} {...rest} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...rest }, ref) {
    return (
      <select ref={ref} className={`${CONTROL_BASE} h-11 ${className}`.trim()} {...rest}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${CONTROL_BASE} py-2 ${className}`.trim()}
      {...rest}
    />
  );
});
