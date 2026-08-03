import * as React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-2xl border border-slate-200 dark:border-border bg-slate-50/70 dark:bg-card/70 px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-foreground placeholder:text-slate-400 dark:placeholder:text-muted-foreground/60 shadow-sm outline-none transition-all duration-200 focus:border-primary focus:ring-4 focus:ring-primary/15 focus:bg-white dark:focus:bg-card disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
