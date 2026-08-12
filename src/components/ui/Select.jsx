import React, { forwardRef, useId } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const EMPTY_SENTINEL = '__empty__';

const SelectItem = React.forwardRef(
  ({ className, children, value = '', ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      value={value === '' ? EMPTY_SENTINEL : String(value)}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-2.5 pr-8 text-xs outline-none transition-colors',
        'focus:bg-accent focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  ),
);
SelectItem.displayName = 'SelectItem';

const SelectGroup = SelectPrimitive.Group;

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2.5 py-1.5 text-xs text-foreground-lighter',
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
SelectSeparator.displayName = 'SelectSeparator';

const Select = forwardRef(
  (
    {
      label,
      error,
      hint,
      icon: Icon,
      value,
      onValueChange,
      onChange,
      placeholder,
      children,
      className = '',
      id,
      onBlur,
      'aria-label': ariaLabel,
      containerClassName = 'w-full',
      position = 'popper',
      sideOffset = 4,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const isControlled = value !== undefined && value !== null;
    const normalizedValue = isControlled
      ? value === ''
        ? EMPTY_SENTINEL
        : String(value)
      : undefined;

    const handleValueChange = (next) => {
      const normalized = next === EMPTY_SENTINEL ? '' : next;
      if (typeof onValueChange === 'function') onValueChange(normalized);
      if (typeof onChange === 'function') {
        onChange({ target: { value: normalized, name: props.name } });
      }
    };

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <SelectPrimitive.Root value={normalizedValue} onValueChange={handleValueChange} {...props}>
          <SelectPrimitive.Trigger
            id={selectId}
            ref={ref}
            onBlur={onBlur}
            aria-label={ariaLabel}
            className={cn(
              'relative flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors',
              'focus-ring',
              Icon ? 'pl-9' : 'pl-3',
              error ? 'border-destructive' : 'border-border',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'data-[placeholder]:text-foreground-muted',
              className,
            )}
            aria-invalid={error ? true : undefined}
          >
            {Icon && (
              <span
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
                aria-hidden="true"
              >
                <Icon className="size-4 text-foreground-lighter" />
              </span>
            )}
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon>
              <ChevronDown className="size-4 text-foreground-lighter" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position={position}
              sideOffset={sideOffset}
              className={cn(
                'z-50 overflow-hidden rounded-lg border border-border-strong bg-popover p-1 text-popover-foreground shadow-lg',
                'animate-[dropdown-in_0.1s_ease-out] data-[state=closed]:animate-[dropdown-in_0.05s_ease-out_reverse]',
              )}
            >
              <SelectPrimitive.Viewport className="max-h-72 p-0">{children}</SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
        {!error && hint && <p className="mt-1.5 text-sm text-foreground-muted">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select, SelectItem, SelectGroup, SelectLabel, SelectSeparator };
export default Select;
