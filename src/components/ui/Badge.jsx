import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface-200 text-foreground-light',
        primary: 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300',
        secondary: 'border-border-strong bg-surface-100 text-foreground-light',
        success: 'border-success/30 bg-success/10 text-success-600 dark:text-success-400',
        warning: 'border-warning/30 bg-warning/10 text-warning-600 dark:text-warning-400',
        danger: 'border-destructive/30 bg-destructive/10 text-destructive-600 dark:text-destructive-400',
        info: 'border-info/30 bg-info/10 text-info-600 dark:text-info-400',
        outline: 'border-border-strong text-foreground-light',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
));

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
export default Badge;
