/**
 * Customer Portal Validation Functions
 * All input validation logic
 *
 * SECURITY WARNING - Client-Side Validation Limitations:
 * These validation functions provide user experience improvements and basic input checking,
 * but they are NOT sufficient for security on their own.
 *
 * CRITICAL: All validation must be duplicated on the server side because:
 * - Client-side code can be bypassed by attackers
 * - Users can modify JavaScript or make direct API calls
 * - Browser DevTools can disable validation
 * - Automated tools can bypass frontend checks
 *
 * Client-side validation should be used for:
 * ✓ Immediate user feedback
 * ✓ Preventing unnecessary server requests
 * ✓ Improving user experience
 *
 * Server-side validation is REQUIRED for:
 * ✓ Security enforcement
 * ✓ Data integrity
 * ✓ Protection against malicious inputs
 * ✓ Business logic enforcement
 *
 * Never trust client-side validation alone. Always validate on the server.
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

  // Check if mobile number starts with valid Indian prefix (6, 7, 8, 9)
  if (!/^[6-9]/.test(cleaned)) {
    return {
      valid: false,
      error: 'Mobile number must start with 6, 7, 8, or 9'
    };
  }

  // Check for all same digits (0000000000, 1111111111, etc.)
  if (/^(\d)\1{9}$/.test(cleaned)) {
    return {
      valid: false,
      error: 'Invalid mobile number pattern'
    };
  }

  // Check for sequential patterns (1234567890, 0123456789)
  const isSequential = cleaned.split('').every((digit, i, arr) => {
    if (i === 0) return true;
    const prev = parseInt(arr[i - 1]);
    const curr = parseInt(digit);
    return curr === (prev + 1) % 10;
  });

  if (isSequential) {
    return {
      valid: false,
      error: 'Invalid mobile number pattern'
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

  // Check for id
  if (!userData.id) {
    return { valid: false, error: 'Missing required field: id' };
  }

  // Check for name
  if (!userData.name) {
    return { valid: false, error: 'Missing required field: name' };
  }

  // Check for phone/mobile (backend might use either field name)
  if (!userData.phone && !userData.mobile) {
    return { valid: false, error: 'Missing required field: phone/mobile' };
  }

  // Check for cs_id (customer service ID)
  if (!userData.cs_id) {
    return { valid: false, error: 'Missing required field: cs_id' };
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
