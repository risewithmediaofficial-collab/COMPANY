import * as React from 'react';
import { cn } from '../../utils/cn';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[96px] w-full rounded-xl bg-secondary/75 px-4 py-3 text-sm font-normal leading-relaxed text-left text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors duration-150 hover:bg-secondary focus:bg-secondary/50 focus:ring-2 focus:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 resize-y',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
