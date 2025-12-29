/**
 * useAuth Hook
 * Manages authentication state and session timeout
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEYS, DATE_THRESHOLDS } from '../utils/constants';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);

    if (token) {
      // Check if session has expired
      if (lastActivity) {
        const lastTime = new Date(lastActivity);
        const now = new Date();
        const minutesSinceActivity = (now - lastTime) / (1000 * 60);

        if (minutesSinceActivity > DATE_THRESHOLDS.SESSION_TIMEOUT_MINUTES) {
          // Session expired
          logout();
          setLoading(false);
          return;
        }
      }

      setIsAuthenticated(true);
      updateLastActivity();
      startSessionTimeout();
    }

    setLoading(false);
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
  }, []);

  // Start session timeout timer
  const startSessionTimeout = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout (convert minutes to milliseconds)
    const timeoutMs = DATE_THRESHOLDS.SESSION_TIMEOUT_MINUTES * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);
  }, []);

  // Reset session timeout on user activity
  const resetSessionTimeout = useCallback(() => {
    updateLastActivity();
    startSessionTimeout();
  }, [updateLastActivity, startSessionTimeout]);

  // Login function
  const login = useCallback((token, rememberMe = false) => {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    }
    updateLastActivity();
    setIsAuthenticated(true);
    startSessionTimeout();
  }, [updateLastActivity, startSessionTimeout]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsAuthenticated(false);
  }, []);

  // Get token
  const getToken = useCallback(() => {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Set up activity listeners to reset timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetSessionTimeout();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, resetSessionTimeout]);

  return {
    isAuthenticated,
    loading,
    login,
    logout,
    getToken,
    resetSessionTimeout
  };
};
