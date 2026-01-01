// ============================================
// APPLICATION CONSTANTS
// ============================================

export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  APP_NAME: import.meta.env.VITE_APP_NAME || '4You Broadband Admin',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  ENABLE_OFFLINE_MODE: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true',
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
};

export const PAGINATION = {
  ITEMS_PER_PAGE: parseInt(import.meta.env.VITE_ITEMS_PER_PAGE || '5', 10),
  MAX_PAGE_BUTTONS: 5,
};

export const FILE_UPLOAD = {
  MAX_PHOTO_SIZE: parseInt(import.meta.env.VITE_MAX_PHOTO_SIZE || '5', 10) * 1024 * 1024, // MB to bytes
  MAX_DOCUMENT_SIZE: parseInt(import.meta.env.VITE_MAX_DOCUMENT_SIZE || '10', 10) * 1024 * 1024,
  MAX_DOCUMENTS: parseInt(import.meta.env.VITE_MAX_DOCUMENTS || '5', 10),
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ],
};

export const VALIDATION = {
  PHONE_PATTERN: /^[0-9]{10}$/,
  EMAIL_PATTERN: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  CS_ID_PATTERN: /^[A-Z0-9-]+$/,
};

export const TOAST = {
  SUCCESS_DURATION: 5000,
  ERROR_DURATION: 8000,
  WARNING_DURATION: 6000,
  INFO_DURATION: 5000,
};

export const DEBOUNCE = {
  SEARCH_DELAY: 300,
  FILTER_DELAY: 200,
  RESIZE_DELAY: 150,
};

export const API = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  VERIFIED_CASH: 'VerifiedByCash',
  VERIFIED_UPI: 'VerifiedByUpi',
};

export const USER_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export const DATE_FORMAT = {
  DISPLAY: 'DD/MM/YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'DD/MM/YYYY HH:mm',
};

export const EXPIRY_WARNING_DAYS = 7;

export const COLORS = {
  PRIMARY: 'orange',
  SUCCESS: 'green',
  DANGER: 'red',
  WARNING: 'yellow',
  INFO: 'blue',
};
