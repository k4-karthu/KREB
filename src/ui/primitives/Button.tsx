'use client';

import { CircleNotch } from '@phosphor-icons/react';
import Link from 'next/link';
import { forwardRef, type MouseEventHandler, type ReactNode } from 'react';
import {
  type PressEvent,
  Button as RACButton,
  type ButtonProps as RACButtonProps,
} from 'react-aria-components';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'link'
  | 'tertiary'
  | 'racing'
  | 'cognac';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<RACButtonProps, 'children' | 'onClick'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children?: ReactNode;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  onPress?: (e: PressEvent) => void;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:bg-accent-hover data-[pressed]:bg-accent-press border-transparent shadow-e1',
  secondary:
    'bg-surface text-text-1 border-border hover:bg-surface-sunken hover:border-border-strong data-[pressed]:bg-surface-sunken shadow-e1',
  ghost: 'bg-transparent text-text-2 hover:text-text-1 hover:bg-surface-sunken border-transparent',
  tertiary:
    'bg-transparent text-text-2 hover:text-text-1 hover:bg-surface-sunken border-transparent',
  danger:
    'bg-danger text-on-accent hover:opacity-90 data-[pressed]:opacity-100 border-transparent shadow-e1',
  racing:
    'bg-racing-green text-on-racing-green hover:bg-racing-green-light data-[pressed]:bg-racing-green border-racing-green-light/30 shadow-e1',
  cognac:
    'bg-cognac text-on-cognac hover:bg-cognac-light data-[pressed]:bg-cognac border-cognac-light/30 shadow-e1',
  link: 'bg-transparent text-accent hover:underline border-transparent p-0 min-h-11 inline-flex items-center',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-caption gap-1.5 after:absolute after:-inset-1',
  md: 'h-11 px-4 text-body-s gap-2',
  lg: 'h-13 px-6 text-body gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    children,
    type = 'button',
    isDisabled,
    href,
    onClick,
    onPress,
    ...rest
  },
  ref,
) {
  const isButtonDisabled = disabled || isDisabled || loading;
  const isLink = variant === 'link';
  const spinnerSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  const combinedClasses =
    `relative inline-flex items-center justify-center font-medium rounded-s border transition-all duration-100 ease-out select-none cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
      isLink ? '' : 'data-[pressed]:scale-98 active:scale-98'
    } ${VARIANT_CLASSES[variant]} ${isLink ? '' : SIZE_CLASSES[size]} ${className}`.trim();

  const content = (
    <>
      <span className={`inline-flex items-center gap-2 ${loading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <CircleNotch size={spinnerSize} className="animate-spin shrink-0" />
        </span>
      )}
    </>
  );

  if (href && !isButtonDisabled) {
    return (
      <Link
        href={href}
        className={combinedClasses}
        onClick={onClick as MouseEventHandler<HTMLAnchorElement>}
        {...(rest as Record<string, unknown>)}
      >
        {content}
      </Link>
    );
  }

  const handlePress = (e: PressEvent) => {
    onPress?.(e);
    if (onClick && !onPress) {
      onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  return (
    <RACButton
      ref={ref}
      type={type}
      isDisabled={isButtonDisabled}
      onPress={handlePress}
      className={combinedClasses}
      {...rest}
    >
      {content}
    </RACButton>
  );
});
