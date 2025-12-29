/**
 * Customer Portal Constants
 * All magic numbers and configuration values
 */

// Toast notification durations (milliseconds)
export const TOAST = {
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 5000,
  WARNING_DURATION: 4000,
  INFO_DURATION: 3000
};

// Pagination settings
export const PAGINATION = {
  BILLS_PER_PAGE: 10,
  RECENT_BILLS_DISPLAY: 3
};

// Date thresholds
export const DATE_THRESHOLDS = {
  PLAN_EXPIRY_WARNING_DAYS: 7,
  SESSION_TIMEOUT_MINUTES: 30
};

// Validation rules
export const VALIDATION = {
  MOBILE_LENGTH: 10,
  MOBILE_PATTERN: /^[0-9]{10}$/,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 50,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  EMAIL_MAX_LENGTH: 100
};

// API configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
};

// UI configuration
export const UI_CONFIG = {
  MIN_TOUCH_TARGET: 44, // pixels (WCAG AAA)
  DEBOUNCE_DELAY: 300, // milliseconds
  THROTTLE_DELAY: 1000, // milliseconds
  MODAL_Z_INDEX: 50
};

// Payment methods
export const PAYMENT_METHODS = [
  { id: 'UPI', name: 'UPI Payment', description: 'Google Pay, PhonePe, Paytm' },
  { id: 'Card', name: 'Card Payment', description: 'Credit / Debit Card' },
  { id: 'NetBanking', name: 'Net Banking', description: 'All major banks' }
];

// Bill status types
export const BILL_STATUS = {
  PENDING: 'Pending',
  VERIFIED_BY_CASH: 'VerifiedByCash',
  PAID: 'Paid',
  ONLINE: 'Online'
};

// User status types
export const USER_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  EXPIRED: 'Expired',
  PENDING_INSTALLATION: 'Pending Installation',
  INSTALLATION_SCHEDULED: 'Installation Scheduled'
};

// Support contact information
export const SUPPORT = {
  PHONE: '1800-123-4567',
  EMAIL: 'support@4you.in',
  HOURS: 'Monday - Saturday, 9 AM - 6 PM'
};

// Rate limiting
export const RATE_LIMIT = {
  LOGIN_ATTEMPTS: 5,
  LOGIN_WINDOW_MINUTES: 15,
  API_CALLS_PER_MINUTE: 60
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'customer_token',
  REMEMBER_ME: 'customer_remember_me',
  LAST_ACTIVITY: 'customer_last_activity'
};

// Tab identifiers
export const TABS = {
  HOME: 'home',
  BILLS: 'bills',
  PROFILE: 'profile'
};

// Sort options for bills
export const SORT_OPTIONS = [
  { value: 'date_newest', label: 'Date (Newest First)' },
  { value: 'date_oldest', label: 'Date (Oldest First)' },
  { value: 'amount_high', label: 'Amount (High to Low)' },
  { value: 'amount_low', label: 'Amount (Low to High)' },
  { value: 'status_pending', label: 'Status (Pending First)' }
];

// Filter options for bills
export const FILTER_OPTIONS = [
  { value: 'all', label: 'All Bills' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' }
];
