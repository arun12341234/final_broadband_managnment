// ============================================
// VALIDATION UTILITIES FOR ENGINEER PORTAL
// ============================================

import { VALIDATION, FILE_UPLOAD } from './constants';

/**
 * Validate mobile number (10 digits)
 */
export const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: 'Mobile number is required' };

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== VALIDATION.MOBILE_LENGTH) {
    return { valid: false, error: 'Mobile number must be exactly 10 digits' };
  }

  if (!VALIDATION.MOBILE_PATTERN.test(cleaned)) {
    return { valid: false, error: 'Mobile number must contain only digits' };
  }

  return { valid: true };
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email) return { valid: true }; // Email is optional

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  if (email.length > VALIDATION.EMAIL_MAX_LENGTH) {
    return { valid: false, error: `Email must be less than ${VALIDATION.EMAIL_MAX_LENGTH} characters` };
  }

  return { valid: true };
};

/**
 * Validate password
 */
export const validatePassword = (password) => {
  if (!password) return { valid: false, error: 'Password is required' };

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters` };
  }

  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    return { valid: false, error: `Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters` };
  }

  return { valid: true };
};

/**
 * Validate name
 */
export const validateName = (name) => {
  if (!name) return { valid: false, error: 'Name is required' };

  const trimmed = name.trim();

  if (trimmed.length < VALIDATION.NAME_MIN_LENGTH) {
    return { valid: false, error: `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters` };
  }

  if (trimmed.length > VALIDATION.NAME_MAX_LENGTH) {
    return { valid: false, error: `Name must be less than ${VALIDATION.NAME_MAX_LENGTH} characters` };
  }

  return { valid: true };
};

/**
 * Validate address
 */
export const validateAddress = (address) => {
  if (!address) return { valid: false, error: 'Address is required' };

  const trimmed = address.trim();

  if (trimmed.length < 10) {
    return { valid: false, error: 'Please provide a complete address' };
  }

  if (trimmed.length > VALIDATION.ADDRESS_MAX_LENGTH) {
    return { valid: false, error: `Address must be less than ${VALIDATION.ADDRESS_MAX_LENGTH} characters` };
  }

  return { valid: true };
};

/**
 * Validate photo file
 */
export const validatePhotoFile = (file) => {
  if (!file) return { valid: true }; // Photo is optional

  if (file.size > FILE_UPLOAD.PHOTO_MAX_SIZE) {
    return {
      valid: false,
      error: `Photo size must be less than ${FILE_UPLOAD.PHOTO_MAX_SIZE / 1024 / 1024}MB`
    };
  }

  if (!FILE_UPLOAD.ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Photo must be JPEG, PNG, or WebP format'
    };
  }

  return { valid: true };
};

/**
 * Validate document file
 */
export const validateDocumentFile = (file) => {
  if (!file) return { valid: true }; // Document is optional

  if (file.size > FILE_UPLOAD.DOCUMENT_MAX_SIZE) {
    return {
      valid: false,
      error: `Document size must be less than ${FILE_UPLOAD.DOCUMENT_MAX_SIZE / 1024 / 1024}MB`
    };
  }

  if (!FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Document must be PDF, JPEG, or PNG format'
    };
  }

  return { valid: true };
};

/**
 * Sanitize filename for safe storage
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};
