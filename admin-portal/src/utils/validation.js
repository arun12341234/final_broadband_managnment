// ============================================
// VALIDATION UTILITIES
// ============================================

import { VALIDATION, FILE_UPLOAD } from '../constants';

/**
 * Validate phone number (10 digits)
 */
export const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: 'Phone number is required' };
  if (!VALIDATION.PHONE_PATTERN.test(phone)) {
    return { valid: false, error: 'Phone number must be exactly 10 digits' };
  }
  return { valid: true };
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email) return { valid: false, error: 'Email is required' };
  if (!VALIDATION.EMAIL_PATTERN.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  return { valid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password) => {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters` };
  }
  if (!VALIDATION.PASSWORD_PATTERN.test(password)) {
    return {
      valid: false,
      error: 'Password must contain uppercase, lowercase, and number'
    };
  }
  return { valid: true };
};

/**
 * Validate customer ID format
 */
export const validateCustomerId = (csId) => {
  if (!csId) return { valid: false, error: 'Customer ID is required' };
  if (!VALIDATION.CS_ID_PATTERN.test(csId)) {
    return { valid: false, error: 'Customer ID can only contain uppercase letters, numbers, and hyphens' };
  }
  return { valid: true };
};

/**
 * Validate file upload (photo)
 */
export const validatePhotoFile = (file) => {
  if (!file) return { valid: true }; // Optional

  // Check file type
  if (!FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP images'
    };
  }

  // Check file size
  if (file.size > FILE_UPLOAD.MAX_PHOTO_SIZE) {
    const maxSizeMB = FILE_UPLOAD.MAX_PHOTO_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `Photo size must be less than ${maxSizeMB}MB`
    };
  }

  return { valid: true };
};

/**
 * Validate document file
 */
export const validateDocumentFile = (file) => {
  if (!file) return { valid: true }; // Optional

  // Check file type
  if (!FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload PDF, DOC, DOCX, or image files'
    };
  }

  // Check file size
  if (file.size > FILE_UPLOAD.MAX_DOCUMENT_SIZE) {
    const maxSizeMB = FILE_UPLOAD.MAX_DOCUMENT_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `Document size must be less than ${maxSizeMB}MB`
    };
  }

  return { valid: true };
};

/**
 * Validate multiple documents
 */
export const validateDocuments = (files) => {
  if (!files || files.length === 0) return { valid: true }; // Optional

  // Check number of files
  if (files.length > FILE_UPLOAD.MAX_DOCUMENTS) {
    return {
      valid: false,
      error: `Maximum ${FILE_UPLOAD.MAX_DOCUMENTS} documents allowed`
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateDocumentFile(file);
    if (!result.valid) return result;
  }

  return { valid: true };
};

/**
 * Validate date is not in the past
 */
export const validateFutureDate = (date) => {
  if (!date) return { valid: false, error: 'Date is required' };

  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    return { valid: false, error: 'Date cannot be in the past' };
  }

  return { valid: true };
};

/**
 * Validate amount is positive
 */
export const validateAmount = (amount) => {
  if (amount === undefined || amount === null || amount === '') {
    return { valid: false, error: 'Amount is required' };
  }

  const numAmount = parseFloat(amount);

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount < 0) {
    return { valid: false, error: 'Amount cannot be negative' };
  }

  return { valid: true };
};

/**
 * Sanitize filename for safe upload
 */
export const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove consecutive dots
    .replace(/^\./, '') // Remove leading dot
    .substring(0, 100); // Limit length
};
