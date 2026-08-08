import React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { Circle } from 'lucide-react';
import { cn } from '../../lib/utils';

const RadioGroup = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={cn('grid gap-2.5', className)}
    {...props}
  />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'aspect-square size-4 shrink-0 rounded-full border border-border-strong bg-card text-primary transition-colors',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
      'hover:border-foreground-lighter focus-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="size-2 fill-current text-primary-foreground" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

const RadioGroupCard = ({ label, description, value, ...props }) => (
  <label
    className={cn(
      'flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors',
      'has-data-[state=checked]:border-brand-500 has-data-[state=checked]:bg-brand-500/5',
      'hover:border-border-strong',
    )}
  >
    <RadioGroupItem value={value} {...props} />
    <div className="space-y-0.5">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {description && <span className="block text-sm text-foreground-lighter">{description}</span>}
    </div>
  </label>
);
RadioGroupCard.displayName = 'RadioGroupCard';

export { RadioGroup, RadioGroupItem, RadioGroupCard };
