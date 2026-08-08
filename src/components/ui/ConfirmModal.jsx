import React from 'react';
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
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-6 text-center">
        {Icon && (
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <Icon className="size-6 text-destructive" />
          </div>
        )}
        <p className="text-sm leading-relaxed text-foreground-lighter">{message}</p>
        <div className="flex w-full gap-3">
          <Button type="button" variant="default" className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
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
