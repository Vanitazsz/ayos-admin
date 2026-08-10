import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const Drawer = ({ isOpen, onClose, title, children, width = 'max-w-md', footer }) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose?.(); }}>
    {isOpen && (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-[overlay-show_0.15s_ease-out]"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-full flex-col',
            'border-l border-border-strong bg-card shadow-2xl',
            'animate-[drawer-in-right_0.2s_ease-out]',
            width,
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close drawer"
              className="rounded-md p-1.5 text-foreground-lighter transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )}
  </DialogPrimitive.Root>
);

export default Drawer;
