import React from 'react';
import { cn } from '../../lib/utils';

const PageContainer = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('mx-auto w-full max-w-7xl space-y-6', className)}
    {...props}
  />
));
PageContainer.displayName = 'PageContainer';

const PageHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
      className,
    )}
    {...props}
  />
));
PageHeader.displayName = 'PageHeader';

const PageHeaderContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('min-w-0 space-y-1', className)} {...props} />
));
PageHeaderContent.displayName = 'PageHeaderContent';

const PageTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn('text-2xl font-semibold tracking-tight text-foreground', className)}
    {...props}
  />
));
PageTitle.displayName = 'PageTitle';

const PageDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-foreground-lighter', className)} {...props} />
));
PageDescription.displayName = 'PageDescription';

const PageHeaderActions = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-wrap items-center gap-2', className)} {...props} />
));
PageHeaderActions.displayName = 'PageHeaderActions';

const PageSection = React.forwardRef(({ className, ...props }, ref) => (
  <section ref={ref} className={cn('space-y-4', className)} {...props} />
));
PageSection.displayName = 'PageSection';

export {
  PageContainer,
  PageHeader,
  PageHeaderContent,
  PageTitle,
  PageDescription,
  PageHeaderActions,
  PageSection,
};
