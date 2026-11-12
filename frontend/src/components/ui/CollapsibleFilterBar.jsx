import { useState } from 'react';
import { Filter, ChevronDown, RotateCcw, Search } from '@/components/ui/muiIcons';
import { cn } from '../../utils/cn';

export const CollapsibleFilterBar = ({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  activeFilterCount = 0,
  onResetFilters,
  children,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Top Search & Filter Bar Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative w-full md:flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search || ''}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:bg-secondary/75 focus:ring-2 focus:ring-brand/40 hover:bg-secondary/60"
          />
        </div>

        {/* Filter Toggle Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {activeFilterCount > 0 && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw size={14} className="shrink-0" /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl transition-colors duration-150 text-sm font-semibold cursor-pointer w-full md:w-auto",
              isOpen || activeFilterCount > 0
                ? "bg-brand/10 text-primary ring-2 ring-brand/40"
                : "bg-card hover:bg-secondary text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Filter size={16} className={cn("shrink-0", isOpen || activeFilterCount > 0 ? "text-foreground" : "text-muted-foreground")} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="h-5 px-2 rounded-full bg-primary text-primary-foreground text-xs font-extrabold tabular-nums flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline ml-1 font-normal">
                {isOpen ? "Click to collapse" : "Click to apply filters"}
              </span>
            </div>

            <div
              className={cn(
                "text-muted-foreground ml-1 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            >
              <ChevronDown size={18} className="shrink-0" />
            </div>
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {isOpen && (
        <div className="overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="rounded-2xl bg-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Available Filters
              </span>
              {activeFilterCount > 0 && (
                <span className="text-xs text-foreground font-semibold tabular-nums">
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                </span>
              )}
            </div>
            <div className="pt-1">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
