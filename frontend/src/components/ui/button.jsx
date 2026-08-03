import * as React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({ className, variant = 'default', size = 'md', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90',
    outline: 'border border-slate-200 dark:border-border bg-white dark:bg-card text-slate-800 dark:text-foreground hover:bg-slate-50 dark:hover:bg-secondary/80 shadow-sm',
    ghost: 'hover:bg-slate-100 dark:hover:bg-secondary/70 text-slate-700 dark:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
  };
  const sizes = {
    sm: 'h-9 px-3.5 text-xs font-semibold rounded-xl',
    md: 'h-10 px-4 text-sm font-semibold rounded-2xl',
    lg: 'h-11 px-5 text-sm font-bold rounded-2xl',
    icon: 'h-10 w-10 p-0 rounded-xl',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-primary/15 cursor-pointer',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';
