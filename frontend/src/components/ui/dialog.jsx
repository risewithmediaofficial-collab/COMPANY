import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef(
  ({ className, children, hideCloseButton = false, noPadding = false, ...props }, ref) => (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'pointer-events-auto relative w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200/90 dark:border-border bg-white dark:bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95',
            className
          )}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          {...props}
        >
          {/* Padding wrapper — opt out with noPadding for modals with their own layout */}
          <div className={noPadding ? undefined : 'p-6'}>
            {children}
          </div>
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-4 top-4 z-[100] flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-border/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm">
              <X size={15} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  )
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      'pb-4 mb-4 border-b border-slate-100 dark:border-border space-y-1 text-left pr-8',
      className
    )}
    {...props}
  />
);

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-base font-bold text-slate-900 dark:text-foreground leading-tight', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs text-slate-500 dark:text-muted-foreground mt-0.5 leading-relaxed', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      'flex items-center justify-end gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-border',
      className
    )}
    {...props}
  />
);
