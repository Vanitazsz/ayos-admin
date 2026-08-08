import React, { forwardRef, useId } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils';

const Switch = forwardRef(
  ({ id, checked = false, onCheckedChange, disabled = false, className = '', ...props }, ref) => {
    const generatedId = useId();
    const switchId = id || generatedId;

    return (
      <SwitchPrimitive.Root
        ref={ref}
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors',
          'border border-transparent bg-surface-300',
          'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong',
          'focus-ring',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'pointer-events-none block size-5 rounded-full bg-primary-foreground shadow ring-0 transition-transform',
            'data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-0.5',
          )}
        />
      </SwitchPrimitive.Root>
    );
  },
);

Switch.displayName = 'Switch';

export default Switch;
