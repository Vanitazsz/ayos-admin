import React, { createContext, forwardRef, useContext, useId } from 'react';
import { Controller, FormProvider, useFormContext } from 'react-hook-form';

const FormFieldContext = createContext(undefined);
const FormItemContext = createContext(undefined);

export const Form = FormProvider;

export const FormField = ({ name, ...props }) => (
  <FormFieldContext.Provider value={{ name }}>
    <Controller name={name} {...props} />
  </FormFieldContext.Provider>
);

export const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  if (!fieldContext || !itemContext) {
    throw new Error('useFormField should be used within <FormField>');
  }
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

export const useOptionalFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();
  if (!fieldContext || !itemContext) return null;
  const fieldState = getFieldState(fieldContext.name, formState);
  const { id } = itemContext;
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

export const FormItem = forwardRef(({ className = '', ...props }, ref) => {
  const id = useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={className} {...props} />
    </FormItemContext.Provider>
  );
});

FormItem.displayName = 'FormItem';

export const FormLabel = ({ className = '', children, ...props }) => {
  const field = useOptionalFormField();
  return (
    <label
      htmlFor={field?.formItemId}
      className={`block text-sm font-medium ${field?.error ? 'text-destructive' : 'text-foreground'} ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};

export const FormControl = forwardRef(({ className = '', ...props }, ref) => {
  const field = useOptionalFormField();
  return (
    <div
      ref={ref}
      className={className}
      aria-describedby={field ? `${field.formDescriptionId} ${field.formMessageId}` : undefined}
      aria-invalid={field ? Boolean(field.error) : undefined}
      {...props}
    />
  );
});

FormControl.displayName = 'FormControl';

export const FormDescription = ({ className = '', ...props }) => {
  const field = useOptionalFormField();
  const descriptionId = field?.formDescriptionId;
  return <p id={descriptionId} className={`text-sm text-foreground-lighter ${className}`} {...props} />;
};

export const FormMessage = ({ className = '', children, ...props }) => {
  const field = useOptionalFormField();
  const body = field?.error ? String(field.error.message ?? '') : children;
  if (!body) return null;
  return (
    <p
      id={field?.formMessageId}
      className={`text-sm text-destructive ${className}`}
      {...props}
    >
      {body}
    </p>
  );
};
