import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp, Search, X } from '@/components/ui/muiIcons';
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
      'group flex h-11 w-full items-center justify-between rounded-xl bg-secondary/75 px-4 py-2 text-sm font-normal leading-normal text-left text-foreground outline-none transition-colors duration-150 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-brand/40 data-[state=open]:ring-2 data-[state=open]:ring-brand/45 data-[state=open]:bg-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={15} className="shrink-0 ml-1 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
            'z-[99999] min-w-[8rem] max-h-[340px] overflow-hidden rounded-2xl bg-popover p-1.5 shadow-[0_16px_40px_-8px_rgb(0,0,0,0.12)] dark:shadow-[0_16px_40px_-8px_rgb(0,0,0,0.5)] animate-in fade-in-80 zoom-in-95 duration-100',
            position === 'popper' &&
              'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
            className
          )}
          {...props}
        >
          {/* Search bar always visible inside dropdown popover */}
          {searchable && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="relative p-1 mb-1 shrink-0"
            >
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-secondary/75 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 font-medium"
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchQuery('');
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
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
      'relative flex cursor-pointer select-none items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-foreground/90 outline-none transition-all hover:bg-secondary/70 data-[highlighted]:bg-secondary data-[highlighted]:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:font-bold data-[state=checked]:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText className="truncate min-w-0 pr-1">{children}</SelectPrimitive.ItemText>
    <span className="ml-2 flex h-3.5 w-3.5 items-center justify-center text-primary shrink-0">
      <SelectPrimitive.ItemIndicator>
        <Check size={14} className="text-primary stroke-[2.5]" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';
