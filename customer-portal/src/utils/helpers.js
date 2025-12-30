/**
 * Customer Portal Utility Functions
 * Handles error formatting, date manipulation, and data formatting
 */

/**
 * Safely format error messages from various error types
 * Handles Pydantic validation errors, axios errors, and general errors
 * Prevents circular reference errors and React rendering errors
 */
export const getErrorMessage = (error) => {
  // Handle string errors
  if (typeof error === 'string') return error;
  if (!error) return 'An unexpected error occurred';

  // Handle arrays (Pydantic validation errors)
  if (Array.isArray(error)) {
    return error.map(err => {
      if (typeof err === 'string') return err;
      if (err.msg) return err.msg;
      if (err.message) return err.message;
      // Avoid circular reference by using controlled stringify
      try {
        return JSON.stringify(err);
      } catch {
        return 'Validation error';
      }
    }).join(', ');
  }

  // Handle error objects with nested detail
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (Array.isArray(detail)) {
      return detail.map(err => err.msg || err.message || String(err)).join(', ');
    }
    if (typeof detail === 'object' && detail !== null) {
      if (detail.message) return detail.message;
      if (detail.msg) return detail.msg;
      try {
        return JSON.stringify(detail);
      } catch {
        return 'Server error';
      }
    }
    if (typeof detail === 'string') return detail;
  }

  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  if (error.msg) return error.msg;

  // Last resort - controlled stringify to avoid circular references
  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return 'An error occurred';
    }
  }

  return 'An unexpected error occurred';
};

/**
 * Format date string to DD/MM/YYYY format
 * Handles ISO strings, timestamps, and invalid dates
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return 'N/A';
  }
};

/**
 * Format date to relative string (Today, Tomorrow, In X days, X days ago)
 */
export const formatRelativeDate = (dateString) => {
  if (!dateString) return 'N/A';

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;

    return formatDate(dateString);
  } catch {
    return 'N/A';
  }
};

/**
 * Calculate days between two dates
 * Returns 0 if dates are invalid or in the past
 */
export const getDaysUntil = (dateString) => {
  if (!dateString) return 0;

  try {
    const targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) return 0;

    const today = new Date();
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return 0;
  }
};

/**
 * Format phone number to +91 XXXXX XXXXX format
 */
export const formatPhone = (phone) => {
  if (!phone) return 'N/A';

  const cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }

  return phone;
};

/**
 * Format currency amount to Indian format
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0';

  // Ensure it's a number
  const numAmount = Number(amount);
  if (isNaN(numAmount)) return '₹0';

  return `₹${numAmount.toLocaleString('en-IN')}`;
};

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags, script tags, and dangerous characters
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    // Remove any HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    // Encode special characters
    .replace(/[&<>"']/g, (char) => {
      const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escapeMap[char] || char;
    })
    .trim()
    .slice(0, 1000); // Limit length
};

/**
 * Check if running in development mode
 */
export const isDevelopment = () => {
  return import.meta.env.MODE === 'development' ||
         import.meta.env.DEV === true ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

/**
 * Copy text to clipboard with permission handling
 */
export const copyToClipboard = async (text) => {
  if (!text) return false;

  try {
    // Check if clipboard API is available and we're in a secure context
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // Handle permission denied or other clipboard errors
        if (err.name === 'NotAllowedError') {
          console.warn('Clipboard permission denied, trying fallback');
        }
        // Fall through to fallback method
      }
    }

    // Fallback for older browsers or if clipboard API failed
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    // iOS requires focus + select
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    } catch (err) {
      console.error('Fallback copy failed:', err);
      textArea.remove();
      return false;
    }
  } catch (err) {
    console.error('Copy to clipboard failed:', err);
    return false;
  }
};

/**
 * Validate if value is a valid boolean (not string "true" or "false")
 */
export const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return Boolean(value);
};

/**
 * Safely access nested object properties
 */
export const safeGet = (obj, path, defaultValue = null) => {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) return defaultValue;
      result = result[key];
    }
    return result === undefined || result === null ? defaultValue : result;
  } catch {
    return defaultValue;
  }
};

/**
 * Debounce function execution
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function execution
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
