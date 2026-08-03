import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export const SelectDropdown = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  buttonClassName = '',
  allOptionLabel = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);

  const rawOptions = (options || []).map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const normalizedOptions = allOptionLabel
    ? [{ value: '', label: allOptionLabel }, ...rawOptions]
    : rawOptions;

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  const updateCoords = useCallback(() => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 160),
      });
    }
  }, []);

  const toggleOpen = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

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

  const handleSelect = (optValue) => {
    if (onChange) {
      onChange(optValue);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-border bg-slate-50 dark:bg-card px-4 py-2.5 text-sm text-slate-800 dark:text-foreground shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-secondary/60 focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary cursor-pointer',
          isOpen && 'border-primary ring-4 ring-primary/15 bg-white dark:bg-card',
          buttonClassName
        )}
      >
        <span className={cn('truncate font-medium', !selectedOption && 'text-slate-400 dark:text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-slate-400 shrink-0 ml-1"
        >
          <ChevronDown size={16} />
        </motion.div>
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 99999,
              }}
              className="select-dropdown-portal-menu max-h-64 overflow-y-auto rounded-2xl border border-slate-200/90 dark:border-border bg-white/98 dark:bg-card/98 p-1.5 shadow-2xl backdrop-blur-xl space-y-0.5 custom-scrollbar"
            >
              {normalizedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value ?? 'all'}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 font-bold text-primary hover:bg-primary/15'
                        : 'text-slate-700 dark:text-foreground hover:bg-slate-100 dark:hover:bg-secondary/70'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={16} className="text-primary shrink-0 ml-2" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
