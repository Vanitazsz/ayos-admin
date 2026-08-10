import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const Select = forwardRef(
  ({ label, error, hint, icon: Icon, children, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Icon className="size-4 text-foreground-lighter" />
            </div>
          )}
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'flex h-9 w-full appearance-none rounded-lg border bg-card px-3 py-2 pr-9 text-sm text-foreground shadow-sm transition-colors',
              'outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              Icon ? 'pl-9' : 'pl-3',
              error ? 'border-destructive' : 'border-border',
              'disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )}
            aria-invalid={error ? true : undefined}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground-lighter" />
        </div>
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        {!error && hint && <p className="mt-1.5 text-sm text-foreground-muted">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
