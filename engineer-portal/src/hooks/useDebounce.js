import { useState, useEffect } from 'react';
import { DEBOUNCE } from '../utils/constants';

/**
 * Custom hook for debouncing values
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default: DEBOUNCE.SEARCH_DELAY)
 * @returns {any} Debounced value
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
