import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

const Input = forwardRef(({ label, error, hint, icon: Icon, inputClassName = '', id, ...props }, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="size-4 text-foreground-lighter" />
          </div>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
            'placeholder:text-foreground-muted',
            'focus-ring',
            Icon ? 'pl-9' : 'pl-3',
            error ? 'border-destructive' : 'border-border',
            'disabled:cursor-not-allowed disabled:opacity-50',
            inputClassName,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-sm text-foreground-muted">{hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
