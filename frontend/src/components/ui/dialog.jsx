import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef(({ className, children, hideCloseButton = false, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out" />
    <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'pointer-events-auto relative w-full max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200/90 dark:border-border bg-white dark:bg-card p-5 sm:p-8 shadow-2xl outline-none custom-scrollbar data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95',
          className
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>

      {!hideCloseButton && (
        <DialogPrimitive.Close className="pointer-events-auto absolute -top-3 -right-3 sm:-top-4 sm:-right-4 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xl border-2 border-white dark:border-slate-800 transition-all hover:scale-110 active:scale-95 cursor-pointer z-[100]">
          <X size={18} className="stroke-[2.5]" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn('mb-4 space-y-1.5 text-left pr-4', className)} {...props} />
);
export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-bold text-slate-900 dark:text-foreground', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-slate-500 dark:text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';
