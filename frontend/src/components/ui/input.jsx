import * as React from 'react';
import { cn } from '../../utils/cn';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-xl bg-secondary/75 px-4 py-2 text-sm font-normal leading-normal text-left text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors duration-150 hover:bg-secondary focus:bg-background focus:ring-2 focus:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';
