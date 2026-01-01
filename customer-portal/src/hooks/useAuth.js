/**
 * useAuth Hook
 * Manages authentication state and session timeout
 * FIXED: Dependency issues, circular dependencies, missing cleanup
 *
 * SECURITY NOTE - localStorage Token Storage:
 * Currently using localStorage to store JWT tokens. This approach has a known XSS vulnerability:
 * - If an attacker injects malicious JavaScript, they can access localStorage and steal tokens
 * - Tokens are accessible to any JavaScript code running on the page
 *
 * RECOMMENDED SOLUTION (requires backend changes):
 * - Use httpOnly cookies for token storage (immune to XSS attacks)
 * - Implement CSRF protection with SameSite=Strict cookies
 * - Use secure=true flag for cookies in production
 *
 * CURRENT MITIGATIONS IN PLACE:
 * - Comprehensive XSS prevention through sanitizeInput() in helpers.js
 * - Content Security Policy should be configured at server level
 * - Session timeout (30 minutes default) limits exposure window
 * - Remember me tokens expire after 30 days
 * - All user inputs are sanitized before rendering
 *
 * To implement httpOnly cookies:
 * 1. Backend: Set token as httpOnly cookie in login response
 * 2. Backend: Include CSRF token in response headers
 * 3. Frontend: Remove localStorage token storage
 * 4. Frontend: Send CSRF token with each request
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEYS, DATE_THRESHOLDS } from '../utils/constants';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef(null);
  const activityThrottleRef = useRef(null);

  // Logout function - defined first to avoid circular dependencies
  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsAuthenticated(false);
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
    } catch (error) {
      console.error('Error updating last activity:', error);
      // If localStorage is full, try to clear and retry
      if (error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
          localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString());
        } catch (retryError) {
          console.error('Failed to update activity after quota error:', retryError);
        }
      }
    }
  }, []);

  // Start session timeout timer - now includes logout in dependencies
  const startSessionTimeout = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout (convert minutes to milliseconds)
    const timeoutMs = DATE_THRESHOLDS.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    // Show warning 1 minute before logout
    const warningMs = Math.max(0, timeoutMs - 60000); // 1 minute before

    if (warningMs > 0) {
      const warningTimeout = setTimeout(() => {
        // Dispatch event for session expiring warning
        window.dispatchEvent(new CustomEvent('session:expiring', {
          detail: { secondsRemaining: 60 }
        }));
      }, warningMs);

      // Store warning timeout ref
      timeoutRef.warningTimeout = warningTimeout;
    }

    timeoutRef.current = setTimeout(() => {
      logout();
      // Dispatch event for session expired
      window.dispatchEvent(new CustomEvent('session:expired'));
    }, timeoutMs);
  }, [logout]);

  // Reset session timeout on user activity - throttled to prevent excessive updates
  const resetSessionTimeout = useCallback(() => {
    // Throttle to once per 10 seconds to prevent excessive localStorage writes
    const now = Date.now();
    if (activityThrottleRef.current && now - activityThrottleRef.current < 10000) {
      return;
    }

    activityThrottleRef.current = now;
    updateLastActivity();
    startSessionTimeout();
  }, [updateLastActivity, startSessionTimeout]);

  // Login function
  const login = useCallback((token, rememberMe = false) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      if (rememberMe) {
        // Store expiry time for remember me (30 days)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, expiryDate.toISOString());
      }
      updateLastActivity();
      setIsAuthenticated(true);
      startSessionTimeout();
    } catch (error) {
      console.error('Error during login:', error);
      throw new Error('Failed to save login credentials');
    }
  }, [updateLastActivity, startSessionTimeout]);

  // Get token
  const getToken = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
      console.error('Error reading token:', error);
      return null;
    }
  }, []);

  // Check for existing token on mount - now with proper dependencies
  useEffect(() => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);

      if (token) {
        // Check if remember me has expired
        if (rememberMe) {
          const expiryDate = new Date(rememberMe);
          if (expiryDate < new Date()) {
            logout();
            setLoading(false);
            return;
          }
        }

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
    } catch (error) {
      console.error('Error checking authentication:', error);
      logout();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (timeoutRef.warningTimeout) {
        clearTimeout(timeoutRef.warningTimeout);
      }
    };
  }, []);

  // Set up activity listeners to reset timeout - throttled to prevent performance issues
  useEffect(() => {
    if (!isAuthenticated) return;

    // Use passive scroll listener for better performance
    const events = [
      { name: 'mousedown', options: undefined },
      { name: 'keydown', options: undefined },
      { name: 'scroll', options: { passive: true } },
      { name: 'touchstart', options: { passive: true } }
    ];

    const handleActivity = () => {
      resetSessionTimeout();
    };

    events.forEach(({ name, options }) => {
      window.addEventListener(name, handleActivity, options);
    });

    return () => {
      events.forEach(({ name }) => {
        window.removeEventListener(name, handleActivity);
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
