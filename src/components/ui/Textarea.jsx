import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

const Textarea = forwardRef(({ label, error, hint, className = '', id, rows = 3, ...props }, ref) => {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={ref}
        rows={rows}
        className={cn(
          'flex min-h-[60px] w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
          'placeholder:text-foreground-muted',
          'focus-ring',
          error ? 'border-destructive' : 'border-border',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-sm text-foreground-muted">{hint}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
