import React, { forwardRef, useId } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const Checkbox = forwardRef(
  ({ label, description, id, checked, onCheckedChange, className = '', ...props }, ref) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    return (
      <div className={cn('flex items-start gap-2.5', className)}>
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          checked={checked}
          onCheckedChange={(value) => onCheckedChange?.(value === true)}
          className={cn(
            'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-card transition-colors',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
            'hover:border-foreground-lighter focus-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...props}
        >
          <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
            <Check className="size-3.5" strokeWidth={3} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
        {(label || description) && (
          <label htmlFor={checkboxId} className="cursor-pointer text-sm leading-relaxed">
            {label && <span className="block font-medium text-foreground">{label}</span>}
            {description && <span className="block text-foreground-lighter">{description}</span>}
          </label>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
