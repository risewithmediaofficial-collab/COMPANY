import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X, PenTool, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * Enhanced SelectDropdown Component:
 * - Search-as-you-type with real-time alphabet & keyword filtering
 * - Smooth mouse wheel & scrollbar scrolling (no Radix Dialog focus/scroll lock interference)
 * - Auto "Other" handling with seamless manual custom text typing
 * - Full keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Auto-detects available space to open downward or upward
 * - Light and Dark theme optimized
 */
export const SelectDropdown = ({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  allOptionLabel = null,
  allowCustom = true,
  allowDeselect = true,
  otherOptionLabel = 'Other',
  customInputPlaceholder = 'Specify other / custom value...',
  searchPlaceholder = 'Type to search...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const customInputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Normalize raw options into standard { value, label, subLabel } array
  const rawOptions = useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: String(opt) };
      }
      return opt;
    });
  }, [options]);

  const normalizedOptions = useMemo(() => {
    let list = rawOptions;
    if (allOptionLabel) {
      list = [{ value: '', label: allOptionLabel }, ...list];
    }
    return list;
  }, [rawOptions, allOptionLabel]);

  // Check if current value matches one of the predefined options
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Initialize custom mode if value is not in options and is not empty
  useEffect(() => {
    const isPredefined = normalizedOptions.some((opt) => String(opt.value) === String(value));
    const isExplicitOther = String(value).toLowerCase() === 'other';

    if (!isPredefined && value && allowCustom) {
      setIsCustomMode(true);
      setCustomText(String(value));
    } else if (isExplicitOther && allowCustom) {
      setIsCustomMode(true);
      setCustomText('');
    } else if (isPredefined && !isExplicitOther) {
      setIsCustomMode(false);
      setCustomText('');
    }
  }, [value, normalizedOptions, allowCustom]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const label = String(opt.label ?? '').toLowerCase();
      const val = String(opt.value ?? '').toLowerCase();
      const subLabel = String(opt.subLabel ?? '').toLowerCase();
      return label.includes(q) || val.includes(q) || subLabel.includes(q);
    });
  }, [normalizedOptions, searchQuery]);

  const toggleOpen = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 280 && spaceAbove > spaceBelow);
      setSearchQuery('');
      setHighlightedIndex(0);
    }
    setIsOpen((prev) => !prev);
  };

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keep highlighted option scrolled into view when using keyboard
  useEffect(() => {
    if (isOpen && optionsListRef.current) {
      const activeEl = optionsListRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (optValue, optLabel) => {
    const isCurrentlySelected =
      !isCustomMode &&
      value !== undefined &&
      value !== null &&
      value !== '' &&
      String(optValue) === String(value);

    if (isCurrentlySelected) {
      if (allowDeselect) {
        setIsCustomMode(false);
        setCustomText('');
        if (onChange) onChange('');
      }
      setIsOpen(false);
      return;
    }

    const isOther = String(optValue).toLowerCase() === 'other' || String(optLabel).toLowerCase() === 'other';

    if (isOther && allowCustom) {
      if (isCustomMode) {
        setIsCustomMode(false);
        setCustomText('');
        if (onChange) onChange('');
        setIsOpen(false);
        return;
      }
      setIsCustomMode(true);
      setCustomText('');
      if (onChange) onChange('Other');
      setIsOpen(false);
      setTimeout(() => customInputRef.current?.focus(), 80);
      return;
    }

    setIsCustomMode(false);
    setCustomText('');
    if (onChange) onChange(optValue);
    setIsOpen(false);
  };

  const handleCustomTextChange = (e) => {
    const newVal = e.target.value;
    setCustomText(newVal);
    if (onChange) onChange(newVal);
  };

  const handleClearCustom = (e) => {
    e.stopPropagation();
    setIsCustomMode(false);
    setCustomText('');
    if (onChange) onChange('');
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value, filteredOptions[highlightedIndex].label);
      } else if (searchQuery.trim() && allowCustom) {
        setIsCustomMode(true);
        setCustomText(searchQuery.trim());
        if (onChange) onChange(searchQuery.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className={cn('relative w-full space-y-1.5', isOpen && 'z-50', className)}
    >
      {/* Standard Select Button */}
      <button
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm text-foreground shadow-xs transition-all hover:bg-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer',
          isOpen && 'border-primary ring-2 ring-primary/20 bg-card',
          buttonClassName
        )}
      >
        <span className={cn('truncate font-medium', !selectedOption && !isCustomMode && 'text-muted-foreground')}>
          {isCustomMode
            ? customText
              ? `Other: ${customText}`
              : 'Other (Manual Entry)'
            : selectedOption
            ? selectedOption.label
            : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-muted-foreground shrink-0 ml-1"
        >
          <ChevronDown size={15} />
        </motion.div>
      </button>

      {/* Inline Manual Custom Text Field if "Other" or custom value is selected */}
      {isCustomMode && (
        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="relative flex-1">
            <Edit3 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <input
              ref={customInputRef}
              type="text"
              value={customText}
              onChange={handleCustomTextChange}
              placeholder={customInputPlaceholder}
              className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-primary/40 bg-primary/5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium"
            />
            {customText && (
              <button
                type="button"
                onClick={() => {
                  setCustomText('');
                  if (onChange) onChange('Other');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearCustom}
            className="px-2.5 py-2 rounded-xl border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors whitespace-nowrap"
            title="Switch back to dropdown list"
          >
            Reset
          </button>
        </div>
      )}

      {/* Dropdown Menu (Inline Absolute — never blocked by Radix Dialog focus/scroll lock) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: openUpward ? 4 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: openUpward ? 4 : -4 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'absolute left-0 z-50 w-full min-w-[200px] max-h-72 flex flex-col rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-xl',
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            )}
          >
            {/* Search Bar inside Dropdown */}
            <div className="relative p-1 border-b border-border/60 mb-1 shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder || 'Type to search...'}
                className="w-full pl-7 pr-7 py-1.5 text-xs rounded-xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Options List with Native Mouse Wheel & Touch Scrolling */}
            <div
              ref={optionsListRef}
              onWheel={(e) => e.stopPropagation()}
              className="flex-1 overflow-y-auto max-h-52 space-y-0.5 custom-scrollbar overscroll-contain pr-0.5"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = String(opt.value) === String(value);
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={opt.value ?? `opt-${idx}`}
                      type="button"
                      onClick={() => handleSelect(opt.value, opt.label)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all cursor-pointer',
                        isSelected
                          ? 'bg-primary/10 font-bold text-primary hover:bg-primary/15'
                          : isHighlighted
                          ? 'bg-secondary text-foreground'
                          : 'text-foreground/90 hover:bg-secondary/70'
                      )}
                    >
                      <div className="flex flex-col truncate min-w-0 pr-1">
                        <span className="truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span className="text-[10px] text-muted-foreground font-normal truncate">
                            {opt.subLabel}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={14} className="text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground space-y-2">
                  <p>No matching options for "{searchQuery}"</p>
                  {allowCustom && searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMode(true);
                        setCustomText(searchQuery.trim());
                        if (onChange) onChange(searchQuery.trim());
                        setIsOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
                    >
                      Use "{searchQuery}" as custom value
                    </button>
                  )}
                </div>
              )}

              {/* Option for "Other (Specify...)" if not in filtered list */}
              {allowCustom &&
                !filteredOptions.some((o) => String(o.value).toLowerCase() === 'other') && (
                  <button
                    type="button"
                    onClick={() => handleSelect('Other', 'Other')}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border-t border-border/40 mt-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <PenTool size={12} />
                      <span>Other (Manual Type)</span>
                    </span>
                  </button>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectDropdown;
