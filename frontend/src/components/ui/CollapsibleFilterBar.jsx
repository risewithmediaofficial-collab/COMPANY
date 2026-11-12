import { useState } from 'react';
import { Filter, ChevronDown, RotateCcw, Search } from '@/components/ui/muiIcons';
import { motion, AnimatePresence } from 'framer-motion';
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
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground outline-none shadow-sm transition-all focus:ring-2 focus:ring-primary/15 focus:border-primary hover:bg-secondary/60"
          />
        </div>

        {/* Filter Toggle Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {activeFilterCount > 0 && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground bg-secondary border border-border hover:bg-secondary/80 transition-all"
              title="Reset all filters"
            >
              <RotateCcw size={14} className="shrink-0" /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-200 shadow-sm text-sm font-semibold cursor-pointer w-full md:w-auto",
              isOpen || activeFilterCount > 0
                ? "border-primary bg-secondary text-foreground"
                : "border-border bg-card hover:bg-secondary text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Filter size={16} className={cn("shrink-0", isOpen || activeFilterCount > 0 ? "text-foreground" : "text-muted-foreground")} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="h-5 px-2 rounded-full bg-primary text-primary-foreground text-xs font-extrabold tabular-nums flex items-center justify-center shadow-sm">
                  {activeFilterCount}
                </span>
              )}
              <span className="text-xs text-muted-foreground hidden sm:inline ml-1 font-normal">
                {isOpen ? "Click to collapse" : "Click to apply filters"}
              </span>
            </div>

            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="text-muted-foreground ml-1"
            >
              <ChevronDown size={18} className="shrink-0" />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Expanded Filter Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
