'use client';

import {
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface OtpFieldProps {
  length?: 4 | 6;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  error?: string;
  errorMessage?: string;
  className?: string;
}

export function OtpField({
  length = 6,
  value: controlledValue,
  defaultValue = '',
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  label,
  error,
  errorMessage,
  className = '',
}: OtpFieldProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string>(defaultValue.slice(0, length));
  const activeValue = isControlled ? controlledValue.slice(0, length) : internalValue;

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const errorText = error || errorMessage;

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const updateValue = (newValue: string) => {
    const trimmed = newValue.slice(0, length);
    if (!isControlled) {
      setInternalValue(trimmed);
    }
    onChange?.(trimmed);
    if (trimmed.length === length) {
      onComplete?.(trimmed);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = activeValue.padEnd(length, ' ').split('');
      if (chars[index] && chars[index] !== ' ') {
        chars[index] = ' ';
        const nextVal = chars.join('').trimEnd();
        updateValue(nextVal);
      } else if (index > 0) {
        chars[index - 1] = ' ';
        const nextVal = chars.join('').trimEnd();
        updateValue(nextVal);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digit = rawVal.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    const chars = activeValue.padEnd(length, ' ').split('');
    chars[index] = digit;
    const nextVal = chars.join('').trimEnd();
    updateValue(nextVal);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    updateValue(pasted);
    const targetIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`.trim()}>
      {label && <span className="text-caption font-medium text-text-2 select-none">{label}</span>}

      <div className="flex items-center gap-2">
        {Array.from({ length }).map((_, index) => {
          const char = activeValue[index] || '';
          const hasError = Boolean(errorText);
          const isFilled = Boolean(char);

          return (
            <input
              key={`otp-slot-${index}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={char}
              disabled={disabled}
              aria-label={`Digit ${index + 1} of ${length}`}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className={`w-11 h-13 rounded-s bg-surface-sunken border text-h3 font-semibold text-text-1 tabular-nums text-center transition-all duration-160 outline-none select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                hasError
                  ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger-subtle'
                  : isFilled
                    ? 'border-border-strong bg-surface focus:border-accent focus:ring-2 focus:ring-accent-subtle'
                    : 'border-border focus:border-accent focus:ring-2 focus:ring-accent-subtle focus:bg-surface'
              }`}
            />
          );
        })}
      </div>

      {errorText && (
        <p role="alert" className="text-caption text-danger font-medium">
          {errorText}
        </p>
      )}
    </div>
  );
}
