/**
 * Customer Portal Validation Functions
 * All input validation logic
 */

import { VALIDATION } from './constants';

/**
 * Validate mobile number
 * Returns { valid: boolean, error: string }
 */
export const validateMobile = (mobile) => {
  if (!mobile) {
    return { valid: false, error: 'Mobile number is required' };
  }

  const cleaned = mobile.replace(/\D/g, '');

  if (cleaned.length !== VALIDATION.MOBILE_LENGTH) {
    return {
      valid: false,
      error: `Mobile number must be exactly ${VALIDATION.MOBILE_LENGTH} digits`
    };
  }

  if (!VALIDATION.MOBILE_PATTERN.test(cleaned)) {
    return {
      valid: false,
      error: 'Mobile number must contain only digits'
    };
  }

  return { valid: true };
};

/**
 * Validate email address
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, error: 'Email address is required' };
  }

  if (email.length > VALIDATION.EMAIL_MAX_LENGTH) {
    return {
      valid: false,
      error: `Email must be less than ${VALIDATION.EMAIL_MAX_LENGTH} characters`
    };
  }

  if (!VALIDATION.EMAIL_PATTERN.test(email)) {
    return {
      valid: false,
      error: 'Please enter a valid email address'
    };
  }

  return { valid: true };
};

/**
 * Validate password
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`
    };
  }

  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must be less than ${VALIDATION.PASSWORD_MAX_LENGTH} characters`
    };
  }

  return { valid: true };
};

/**
 * Validate payment method selection
 */
export const validatePaymentMethod = (method) => {
  const validMethods = ['UPI', 'Card', 'NetBanking'];

  if (!method) {
    return { valid: false, error: 'Please select a payment method' };
  }

  if (!validMethods.includes(method)) {
    return { valid: false, error: 'Invalid payment method selected' };
  }

  return { valid: true };
};

/**
 * Validate amount
 */
export const validateAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return { valid: false, error: 'Amount is required' };
  }

  const numAmount = Number(amount);

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  if (numAmount > 1000000) {
    return { valid: false, error: 'Amount is too large' };
  }

  return { valid: true };
};

/**
 * Sanitize mobile number (remove non-numeric characters)
 */
export const sanitizeMobile = (mobile) => {
  if (!mobile) return '';
  return mobile.replace(/\D/g, '').slice(0, VALIDATION.MOBILE_LENGTH);
};

/**
 * Check if user data object is valid
 */
export const validateUserData = (userData) => {
  if (!userData) {
    return { valid: false, error: 'User data is missing' };
  }

  const requiredFields = ['id', 'name', 'phone', 'cs_id'];

  for (const field of requiredFields) {
    if (!userData[field]) {
      return {
        valid: false,
        error: `Missing required field: ${field}`
      };
    }
  }

  return { valid: true };
};

/**
 * Check if bills array is valid
 */
export const validateBillsData = (bills) => {
  if (!bills) {
    return { valid: false, error: 'Bills data is missing' };
  }

  if (!Array.isArray(bills)) {
    return { valid: false, error: 'Bills must be an array' };
  }

  return { valid: true };
};
