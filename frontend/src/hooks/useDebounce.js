import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce values (e.g. search inputs) to prevent
 * rapid repeated re-renders, re-filters, or API requests during typing.
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
