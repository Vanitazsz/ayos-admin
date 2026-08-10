import React from 'react';
import { FormMessage, useOptionalFormField } from './Form';

export function FormItemLayout({
  label,
  description,
  layout = 'vertical',
  htmlFor,
  className = '',
  children,
}) {
  const field = useOptionalFormField();

  const labelNode =
    label || description ? (
      <div className="min-w-0">
        {label && (
          <label
            htmlFor={htmlFor ?? field?.formItemId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        {description && <p className="mt-1 text-sm text-foreground-lighter">{description}</p>}
      </div>
    ) : null;

  if (layout === 'flex-row-reverse') {
    return (
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6 ${className}`}>
        <div className="flex-1 sm:w-1/2 min-w-0">{labelNode}</div>
        <div className="flex flex-1 flex-col items-end sm:w-1/2 min-w-0">
          <div className="w-full">{children}</div>
          {field && <FormMessage />}
        </div>
      </div>
    );
  }

  if (layout === 'horizontal') {
    return (
      <div className={`grid grid-cols-12 items-start gap-4 ${className}`}>
        <div className="col-span-12 md:col-span-4">{labelNode}</div>
        <div className="col-span-12 md:col-span-8">
          {children}
          {field && <FormMessage />}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {labelNode}
      {children}
      {field && <FormMessage />}
    </div>
  );
}
