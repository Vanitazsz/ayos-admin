import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from './Dialog';
import { cn } from '../../lib/utils';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', footer, hideClose = false }) => (
  <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
    {isOpen && (
      <DialogContent className={cn(maxWidth)} showCloseButton={!hideClose}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
        {footer}
      </DialogContent>
    )}
  </Dialog>
);

export default Modal;
