import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Select = React.forwardRef(({ value, defaultValue, ...props }, ref) => {
  if (defaultValue !== undefined && value === undefined) {
    return <SelectPrimitive.Root ref={ref} defaultValue={defaultValue} {...props} />;
  }
  return <SelectPrimitive.Root ref={ref} value={value ?? ''} {...props} />;
});
Select.displayName = 'Select';
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-11 w-full items-center justify-between rounded-xl border border-border/80 bg-background px-3.5 py-2 text-sm text-foreground shadow-xs outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={16} className="opacity-60 shrink-0 ml-1 text-muted-foreground" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

export const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1 text-muted-foreground hover:text-foreground', className)}
    {...props}
  >
    <ChevronUp size={14} />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

export const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1 text-muted-foreground hover:text-foreground', className)}
    {...props}
  >
    <ChevronDown size={14} />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

export const SelectContent = React.forwardRef(
  ({ className, children, position = 'popper', searchable = true, ...props }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isSearching, setIsSearching] = React.useState(false);
    const inputRef = React.useRef(null);

    // Recursively extract plain text from React nodes
    const extractText = React.useCallback((node) => {
      if (typeof node === 'string') return node;
      if (typeof node === 'number') return String(node);
      if (!node) return '';
      if (Array.isArray(node)) return node.map(extractText).join(' ');
      if (React.isValidElement(node)) {
        return extractText(node.props?.children);
      }
      return '';
    }, []);

    // Filter children based on active search query
    const { filteredChildren, matchCount, totalCount } = React.useMemo(() => {
      if (!searchable || !searchQuery.trim()) {
        const total = React.Children.count(children);
        return { filteredChildren: children, matchCount: total, totalCount: total };
      }

      const q = searchQuery.trim().toLowerCase();
      let match = 0;

      const processNode = (child) => {
        if (!React.isValidElement(child)) return child;

        // If it's a grouping element (like SelectGroup), process its children
        if (child.props?.children && child.type !== SelectItem) {
          const subChildren = React.Children.map(child.props.children, processNode)?.filter(Boolean);
          if (subChildren && subChildren.length > 0) {
            return React.cloneElement(child, {}, subChildren);
          }
          return null;
        }

        // Direct SelectItem or option item
        const text = extractText(child.props?.children) || '';
        const val = typeof child.props?.value === 'string' ? child.props.value : '';
        if (text.toLowerCase().includes(q) || val.toLowerCase().includes(q)) {
          match++;
          return child;
        }
        return null;
      };

      const flat = React.Children.toArray(children);
      const filtered = flat.map(processNode).filter(Boolean);
      return { filteredChildren: filtered, matchCount: match, totalCount: flat.length };
    }, [children, searchQuery, searchable, extractText]);

    // Handle keydown on Content to reveal search when user types keys
    const handleContentKeyDown = (e) => {
      if (!searchable) return;
      // Allow letters, numbers, symbols (printable chars of length 1)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsSearching(true);
        setSearchQuery((prev) => prev + e.key);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 10);
      }
    };

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          position={position}
          onKeyDown={handleContentKeyDown}
          className={cn(
            'z-[99999] min-w-[8rem] max-h-[340px] overflow-hidden rounded-2xl border border-slate-200/90 dark:border-border bg-white/98 dark:bg-card/98 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in-80 zoom-in-95 duration-100',
            position === 'popper' &&
              'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
            className
          )}
          {...props}
        >
          {/* Hidden search bar that reveals as soon as user types on keyboard */}
          {searchable && (isSearching || searchQuery) && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 mb-1.5 rounded-xl bg-secondary/50 border border-border/80 shadow-2xs transition-all animate-in fade-in slide-in-from-top-1 duration-150"
            >
              <Search size={14} className="text-primary shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to filter..."
                className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none border-none p-0 focus:ring-0"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchQuery('');
                    setIsSearching(false);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    inputRef.current?.blur();
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                  title="Clear filter"
                >
                  <X size={13} />
                </button>
              )}
              <span className="text-[10px] font-mono font-medium text-muted-foreground/90 px-1.5 py-0.5 rounded-md bg-background/80 border border-border/60 shrink-0 select-none">
                {matchCount}
              </span>
            </div>
          )}

          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              'p-1 max-h-[260px] overflow-y-auto custom-scrollbar',
              position === 'popper' &&
                'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
            )}
          >
            {matchCount === 0 && searchQuery ? (
              <div className="py-6 px-3 text-center select-none">
                <p className="text-xs font-semibold text-muted-foreground">No options found</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">
                  No matches for &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              filteredChildren
            )}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    );
  }
);
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
