import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'danger',
  icon: Icon,
  requireTypedText,
  children,
}) {
  const [typedValue, setTypedValue] = useState('');
  useEffect(() => {
    if (isOpen) setTypedValue('');
  }, [isOpen]);
  const typedMatches =
    !requireTypedText ||
    typedValue.trim().toLowerCase() === String(requireTypedText).trim().toLowerCase();
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-6 text-center">
        {Icon && (
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <Icon className="size-6 text-destructive" />
          </div>
        )}
        <p className="text-sm leading-relaxed text-foreground-lighter">{message}</p>
        {children}
        {requireTypedText && (
          <label className="block w-full text-left text-sm font-medium text-foreground-light">
            Type <span className="font-semibold text-foreground">{requireTypedText}</span> to confirm
            <input
              type="text"
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-border-strong px-3 py-2 outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/25"
            />
          </label>
        )}
        <div className="flex w-full gap-3">
          <Button type="button" variant="default" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            disabled={!typedMatches}
            onClick={() => {
              onConfirm?.();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
