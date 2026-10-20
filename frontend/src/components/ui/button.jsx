import * as React from 'react';
import { cn } from '../../utils/cn';

export const Button = React.forwardRef(({ className, variant = 'default', size = 'md', ...props }, ref) => {
  const variants = {
    default:
      'bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/95 active:scale-[0.98]',
    secondary:
      'bg-secondary/80 text-foreground border border-border/80 hover:bg-secondary hover:text-foreground shadow-2xs active:scale-[0.98]',
    outline:
      'border border-border/80 bg-background text-foreground/85 hover:bg-secondary/80 hover:text-foreground shadow-2xs active:scale-[0.98]',
    ghost:
      'hover:bg-secondary/80 text-foreground/80 hover:text-foreground active:scale-[0.98]',
    destructive:
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm active:scale-[0.98]',
  };
  const sizes = {
    sm: 'h-9 px-3.5 text-xs font-semibold rounded-xl',
    md: 'h-11 px-5 text-sm font-semibold rounded-xl',
    lg: 'h-12 px-6 text-base font-bold rounded-xl',
    icon: 'h-10 w-10 p-0 rounded-xl',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';
