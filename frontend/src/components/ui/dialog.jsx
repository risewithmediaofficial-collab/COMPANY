import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef(
  (
    {
      className,
      children,
      variant = 'side', // 'side' (Notion full-height slide-over from right) | 'center' (centered modal)
      size = 'default', // 'default' (max-w-2xl) | 'lg' (max-w-3xl) | 'xl' (max-w-4xl) | 'sm' (max-w-md)
      hideCloseButton = false,
      noPadding = false,
      ...props
    },
    ref
  ) => {
    const isSide = variant === 'side';

    const sizeClasses = {
      sm: 'sm:max-w-md',
      default: 'sm:max-w-xl md:max-w-2xl',
      lg: 'sm:max-w-2xl md:max-w-3xl',
      xl: 'sm:max-w-3xl md:max-w-4xl xl:max-w-5xl',
      full: 'sm:max-w-[88vw]',
    };

    // For side drawers: strip any legacy max-h or rounding constraints so it spans 100% full screen
    const sanitizedClassName = isSide && typeof className === 'string'
      ? className.replace(/max-h-\[[^\]]+\]/g, '').replace(/my-auto/g, '').replace(/rounded-\S+/g, '')
      : className;

    return (
      <DialogPrimitive.Portal>
        {/* Backdrop Overlay (Clean Transparent Dim with Subtle Blur) */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />

        {isSide ? (
          /* ── NOTION FULL-SCREEN HEIGHT SIDE PEEK / SLIDE-OVER FROM RIGHT ── */
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              'fixed top-0 bottom-0 right-0 z-50 flex h-screen h-[100dvh] max-h-screen w-full flex-col border-l border-border bg-card shadow-2xl outline-none duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right overflow-hidden rounded-none',
              sizeClasses[size] || sizeClasses.default,
              sanitizedClassName
            )}
            onPointerDownOutside={props.onPointerDownOutside || ((e) => e.preventDefault())}
            onEscapeKeyDown={props.onEscapeKeyDown || ((e) => e.preventDefault())}
            {...props}
          >
            {/* Notion-Style Header Close Action Group */}
            {!hideCloseButton && (
              <div className="absolute right-4 top-4 sm:right-6 sm:top-5 z-50 flex items-center gap-2">
                <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                  ESC
                </kbd>
                <DialogPrimitive.Close className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <X size={15} className="stroke-[2.5]" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>
            )}

            {/* Scrollable Form Body with Full Height & Bottom Padding */}
            {noPadding ? (
              children
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 pb-12 custom-scrollbar">
                {children}
              </div>
            )}
          </DialogPrimitive.Content>
        ) : (
          /* ── CENTERED MODAL OPTION (For Confirmations / Alerts) ── */
          <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-3 sm:p-6 flex min-h-full items-center justify-center">
            <DialogPrimitive.Content
              ref={ref}
              className={cn(
                'relative w-full my-auto max-h-[min(92vh,calc(100dvh-1rem))] rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200 flex flex-col min-h-0 overflow-hidden',
                sizeClasses[size] || sizeClasses.sm,
                className
              )}
              onPointerDownOutside={props.onPointerDownOutside || ((e) => e.preventDefault())}
              onEscapeKeyDown={props.onEscapeKeyDown || ((e) => e.preventDefault())}
              {...props}
            >
              {!hideCloseButton && (
                <div className="absolute right-3.5 top-3.5 z-50 flex items-center gap-1.5">
                  <kbd className="hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded bg-secondary/80 border border-border text-[9px] font-mono font-medium text-muted-foreground shadow-xs select-none">
                    ESC
                  </kbd>
                  <DialogPrimitive.Close className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border/60 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none">
                    <X size={14} className="stroke-[2.5]" />
                    <span className="sr-only">Close</span>
                  </DialogPrimitive.Close>
                </div>
              )}
              {noPadding ? (
                children
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 custom-scrollbar">
                  {children}
                </div>
              )}
            </DialogPrimitive.Content>
          </div>
        )}
      </DialogPrimitive.Portal>
    );
  }
);
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-left border-b border-border/80 pb-5 mb-6 pr-24 select-none shrink-0',
      className
    )}
    {...props}
  />
);

export const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg sm:text-xl font-bold text-foreground tracking-tight flex items-center gap-2.5', className)}
    {...props}
  />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-xs sm:text-[13px] text-muted-foreground leading-normal font-normal', className)}
    {...props}
  />
));
DialogDescription.displayName = 'DialogDescription';

export const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      'flex flex-wrap items-center justify-end gap-3 pt-5 mt-6 border-t border-border/80',
      className
    )}
    {...props}
  />
);
