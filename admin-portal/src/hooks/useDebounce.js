// ============================================
// DEBOUNCE HOOK
// ============================================

import { useState, useEffect } from 'react';
import { DEBOUNCE } from '../constants';

/**
 * Hook to debounce a value
 */
export const useDebounce = (value, delay = DEBOUNCE.SEARCH_DELAY) => {
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
};
