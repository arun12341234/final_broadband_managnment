// ============================================
// HELPER UTILITIES
// ============================================

import { DEBOUNCE, EXPIRY_WARNING_DAYS } from '../constants';

/**
 * Debounce function to limit rate of function calls
 */
export const debounce = (func, delay = DEBOUNCE.SEARCH_DELAY) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function to ensure function is called at most once in specified time
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Format currency (INR)
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

/**
 * Format date to display format
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Format datetime to display format
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid DateTime';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Calculate days until expiry
 */
export const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;

  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

/**
 * Check if plan is expiring soon
 */
export const isExpiringSoon = (expiryDate) => {
  const days = getDaysUntilExpiry(expiryDate);
  return days !== null && days > 0 && days <= EXPIRY_WARNING_DAYS;
};

/**
 * Check if plan is expired
 */
export const isExpired = (expiryDate) => {
  const days = getDaysUntilExpiry(expiryDate);
  return days !== null && days <= 0;
};

/**
 * Sanitize HTML to prevent XSS
 * Basic sanitization - for production, use DOMPurify
 */
export const sanitizeHTML = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Generate unique ID
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Download blob as file
 */
export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    return false;
  }
};

/**
 * Check if browser is online
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Sleep/delay function
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry async function with exponential backoff
 */
export const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

/**
 * Extract error message from error object
 * Handles Pydantic validation errors, nested objects, and arrays
 */
export const getErrorMessage = (error) => {
  // Handle string errors
  if (typeof error === 'string') return error;

  // Handle null/undefined
  if (!error) return 'An unexpected error occurred';

  // Handle arrays (Pydantic validation errors)
  if (Array.isArray(error)) {
    return error.map(err => {
      if (typeof err === 'string') return err;
      if (err.msg) return err.msg;
      if (err.message) return err.message;
      return JSON.stringify(err);
    }).join(', ');
  }

  // Handle error objects with nested detail
  if (error.response?.data?.detail) {
    const detail = error.response.data.detail;
    // If detail is an array (Pydantic validation errors)
    if (Array.isArray(detail)) {
      return detail.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
    }
    // If detail is an object
    if (typeof detail === 'object' && detail !== null) {
      if (detail.message) return detail.message;
      if (detail.msg) return detail.msg;
      return JSON.stringify(detail);
    }
    // If detail is a string
    if (typeof detail === 'string') return detail;
  }

  // Handle other response data formats
  if (error.response?.data?.message) return error.response.data.message;

  // Handle error with message property
  if (error.message) return error.message;

  // Handle error with msg property (Pydantic)
  if (error.msg) return error.msg;

  // Handle generic objects
  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }

  return 'An unexpected error occurred';
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Format phone number for display
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  }
  return phone;
};
