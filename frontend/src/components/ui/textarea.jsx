import * as React from 'react';
import { cn } from '../../utils/cn';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[90px] w-full rounded-xl border border-border/80 bg-background p-3.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 shadow-xs outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
