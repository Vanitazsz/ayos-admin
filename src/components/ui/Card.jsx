import React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'overflow-hidden rounded-lg border bg-surface-100 text-card-foreground shadow-sm',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 py-4 px-[var(--card-padding-x)] border-b', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-xs font-mono uppercase', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-foreground-lighter', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('py-4 px-[var(--card-padding-x)] border-b last:border-none', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center py-4 px-[var(--card-padding-x)]', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

const CardSection = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-t border-border py-4 px-[var(--card-padding-x)]', className)}
    {...props}
  />
));
CardSection.displayName = 'CardSection';

const CardSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn('-mx-[var(--card-padding-x)] my-4 h-px bg-border', className)}
    {...props}
  />
));
CardSeparator.displayName = 'CardSeparator';

const CardMeta = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-xs text-foreground-muted', className)} {...props} />
));
CardMeta.displayName = 'CardMeta';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardSection,
  CardSeparator,
  CardMeta,
};
