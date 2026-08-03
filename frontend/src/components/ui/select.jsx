import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Select = React.forwardRef(({ value, defaultValue, ...props }, ref) => {
  const controlledProps = 'value' in props || value !== undefined ? { value: value ?? '' } : {};
  return <SelectPrimitive.Root ref={ref} defaultValue={defaultValue} {...props} {...controlledProps} />;
});
Select.displayName = 'Select';
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex w-full items-center justify-between rounded-2xl border border-slate-200 dark:border-border bg-slate-50/70 dark:bg-card/70 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-foreground shadow-sm outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-white dark:focus:bg-card',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={16} className="opacity-60 shrink-0 ml-1 text-slate-400" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn('z-[99999] min-w-[8rem] overflow-hidden rounded-2xl border border-slate-200/90 dark:border-border bg-white/98 dark:bg-card/98 p-1.5 shadow-2xl backdrop-blur-xl space-y-0.5 custom-scrollbar', className)}
      {...props}
    >
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-xl px-8 py-2.5 text-sm font-medium text-slate-700 dark:text-foreground outline-none transition-all hover:bg-slate-100 dark:hover:bg-secondary/70 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-primary">
      <SelectPrimitive.ItemIndicator>
        <Check size={16} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
