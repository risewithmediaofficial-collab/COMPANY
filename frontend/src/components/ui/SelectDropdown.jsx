import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X, PenTool, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * Enhanced SelectDropdown Component:
 * - Search-as-you-type with real-time alphabet & keyword filtering
 * - Auto "Other" handling with seamless manual custom text typing
 * - Full keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Light and Dark theme optimized with portal positioning
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
  otherOptionLabel = 'Other',
  customInputPlaceholder = 'Specify other / custom value...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const customInputRef = useRef(null);

  // Normalize raw options into standard { value, label } array
  const rawOptions = useMemo(() => {
    return (options || []).map((opt) => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
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
    const q = searchQuery.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(q) || String(opt.value).toLowerCase().includes(q)
    );
  }, [normalizedOptions, searchQuery]);

  const updateCoords = useCallback(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 180),
      });
    }
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !e.target.closest?.('.select-dropdown-portal-menu')
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updateCoords]);

  const handleSelect = (optValue, optLabel) => {
    // If clicking the already selected option, toggle/deselect it!
    const isCurrentlySelected =
      !isCustomMode &&
      value !== undefined &&
      value !== null &&
      value !== '' &&
      String(optValue) === String(value);

    if (isCurrentlySelected) {
      setIsCustomMode(false);
      setCustomText('');
      if (onChange) onChange('');
      setIsOpen(false);
      return;
    }

    const isOther = String(optValue).toLowerCase() === 'other' || String(optLabel).toLowerCase() === 'other';

    if (isOther && allowCustom) {
      if (isCustomMode) {
        // Toggle custom mode off if already in custom mode
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
        // Use typed search query as custom value
        setIsCustomMode(true);
        setCustomText(searchQuery.trim());
        if (onChange) onChange(searchQuery.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative w-full space-y-1.5', className)} ref={dropdownRef}>
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

      {/* Floating Dropdown Portal Menu with Live Search */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -4 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 99999,
              }}
              className="select-dropdown-portal-menu max-h-72 flex flex-col rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-xl custom-scrollbar"
            >
              {/* Search Bar inside Dropdown */}
              <div className="relative p-1 border-b border-border/60 mb-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search..."
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-xl border border-border/80 bg-secondary/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                />
              </div>

              {/* Options List */}
              <div className="flex-1 overflow-y-auto max-h-52 space-y-0.5 custom-scrollbar pr-0.5">
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
                        <span className="truncate">{opt.label}</span>
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
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
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default SelectDropdown;
