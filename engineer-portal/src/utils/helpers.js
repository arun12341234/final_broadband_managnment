// ============================================
// HELPER UTILITIES FOR ENGINEER PORTAL
// ============================================

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
 * Format date to DD/MM/YYYY
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
 * Format datetime to DD/MM/YYYY HH:MM
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
 * Format currency (INR)
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return `₹${parseFloat(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
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

/**
 * Truncate text with ellipsis
 */
export const truncate = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate secure random password
 */
export const generateSecurePassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const all = uppercase + lowercase + numbers + symbols;

  let password = '';

  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
 * Check if running in development mode
 */
export const isDevelopment = () => {
  return import.meta.env.MODE === 'development' ||
         import.meta.env.DEV === true ||
         window.location.hostname === 'localhost';
};
