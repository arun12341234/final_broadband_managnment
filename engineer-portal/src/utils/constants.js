// ============================================
// CONSTANTS FOR ENGINEER PORTAL
// ============================================

export const TOAST = {
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 5000,
  WARNING_DURATION: 4000,
  INFO_DURATION: 3000
};

export const FILE_UPLOAD = {
  PHOTO_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ]
};

export const PAGINATION = {
  ITEMS_PER_PAGE: 10,
  TASKS_PER_PAGE: 12
};

export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 100,
  ADDRESS_MAX_LENGTH: 500,
  MOBILE_PATTERN: /^[0-9]{10}$/,
  MOBILE_LENGTH: 10,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 50
};

export const TASK_STATUS = {
  PENDING: 'Pending Installation',
  SCHEDULED: 'Installation Scheduled',
  COMPLETED: 'Completed'
};

export const DEBOUNCE = {
  SEARCH_DELAY: 300
};
