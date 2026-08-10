import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium',
    'transition-colors duration-150 focus-ring disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-sm hover:bg-brand-700 active:bg-brand-700',
        secondary:
          'bg-secondary text-secondary-foreground border border-border-button hover:bg-accent',
        default:
          'bg-card text-foreground border border-border-button hover:bg-accent shadow-sm',
        outline:
          'border border-border-strong bg-transparent text-foreground-light hover:bg-accent hover:text-foreground',
        dashed:
          'border border-dashed border-border-stronger bg-transparent text-foreground-light hover:bg-accent',
        ghost: 'bg-transparent text-foreground-light hover:bg-accent hover:text-foreground',
        link: 'text-brand-link underline-offset-4 hover:underline',
        danger: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-600',
        warning: 'bg-warning text-warning-foreground shadow-sm hover:bg-warning-600',
        'outline-danger': 'border border-destructive-300 text-destructive hover:bg-destructive/10',
      },
      size: {
        tiny: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        xl: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-xs': 'h-7 w-7',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

const Spinner = ({ className }) => (
  <svg
    className={cn('size-4 animate-spin text-current', className)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3L3.5 21" />
    <path d="M12 3L20.5 21" />
    <path d="M7 15h10" />
  </svg>
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      loadingText,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? 'span' : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={isLoading || disabled}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Spinner /> : null}
        {isLoading && loadingText ? loadingText : children}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export default Button;
