import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from './Dialog';
import { cn } from '../../lib/utils';

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  footer,
  hideClose = false,
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
    {isOpen && (
      <DialogContent className={cn(maxWidth)} showCloseButton={!hideClose}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer}
      </DialogContent>
    )}
  </Dialog>
);

export default Modal;
