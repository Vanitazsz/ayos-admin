import React from 'react';
import { cn } from '../../lib/utils';

const EmptyState = React.forwardRef(
  ({ icon: Icon, title, description, actions, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-16 text-center', className)}
      {...props}
    >
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-200">
          <Icon className="size-6 text-foreground-lighter" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && <p className="mx-auto max-w-sm text-sm text-foreground-lighter">{description}</p>}
      </div>
      {actions && <div className="mt-2 flex items-center gap-2">{actions}</div>}
    </div>
  ),
);
EmptyState.displayName = 'EmptyState';

export default EmptyState;
