import React from 'react';
import Button from '../Button';

export function FormActions({
  isDirty = false,
  isSubmitting = false,
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel = 'Save changes',
  withDivider = true,
  className = '',
  ...props
}) {
  return (
    <div
      className={`${withDivider ? 'mt-8 border-t border-border pt-6 ' : ''}flex flex-wrap items-center justify-end gap-2 ${className}`}
    >
      {isDirty && (
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          {cancelLabel}
        </Button>
      )}
      <Button
        type="submit"
        variant="primary"
        isLoading={isSubmitting}
        disabled={!isDirty || isSubmitting}
        {...props}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
