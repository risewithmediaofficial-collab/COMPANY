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
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-2 sm:p-4 md:p-6 flex min-h-full items-center justify-center">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'relative w-full my-auto max-h-[min(92vh,calc(100dvh-1rem))] sm:max-h-[min(90vh,calc(100dvh-2rem))] rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-border bg-white dark:bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200 flex flex-col min-h-0 overflow-hidden',
            className
          )}
          onPointerDownOutside={props.onPointerDownOutside || ((e) => e.preventDefault())}
          onEscapeKeyDown={props.onEscapeKeyDown || ((e) => e.preventDefault())}
          {...props}
        >
          {/* Content wrapper with built-in smooth touch and mouse scrolling */}
          {noPadding ? (
            children
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 custom-scrollbar">
              {children}
            </div>
          )}
          {!hideCloseButton && (
            <DialogPrimitive.Close className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-[100] flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/90 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/90 dark:text-slate-300 dark:hover:bg-slate-700 border border-border/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm">
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
    className={cn('text-base sm:text-lg font-bold text-slate-900 dark:text-foreground leading-tight', className)}
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
      'flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-border',
      className
    )}
    {...props}
  />
);
