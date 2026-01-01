/**
 * useDebounce Hook
 * Delays updating a value until after a specified delay
 */

import { useState, useEffect } from 'react';
import { UI_CONFIG } from '../utils/constants';

export const useDebounce = (value, delay = UI_CONFIG.DEBOUNCE_DELAY) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set up the timeout
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
