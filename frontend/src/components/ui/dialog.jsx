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
          'pointer-events-auto relative w-full max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 dark:border-border bg-white dark:bg-card p-0 shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95',
          className
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 z-[100] flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 shadow-md border border-border transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <X size={18} className="stroke-[2.5]" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </div>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }) => (
  <div className={cn('pb-4 mb-2 border-b border-slate-100 dark:border-border space-y-1 text-left pr-10', className)} {...props} />
);
export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-bold text-slate-900 dark:text-foreground', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-slate-500 dark:text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';
