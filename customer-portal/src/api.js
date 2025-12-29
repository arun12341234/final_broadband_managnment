import axios from 'axios';
import { STORAGE_KEYS, API_CONFIG } from './utils/constants';

// Get API base URL from environment variable with fallback
const getApiBaseUrl = () => {
  // Try environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Fallback based on environment
  if (import.meta.env.MODE === 'production') {
    // In production, use relative URL or configured production URL
    return window.location.origin;
  }

  // Development fallback
  return 'http://localhost:8000';
};

// Create axios instance with configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track 401 errors to prevent infinite loops
let isRefreshing = false;

// Request interceptor to add token and CSRF protection
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token if available (for future implementation)
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log request duration in development
    if (import.meta.env.DEV && response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}: ${duration}ms`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      // Prevent infinite loops
      isRefreshing = true;
      originalRequest._retry = true;

      // Clear token and redirect to login
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);

      // Dispatch custom event that App.jsx can listen to
      window.dispatchEvent(new CustomEvent('auth:logout', {
        detail: { reason: 'token_expired' }
      }));

      isRefreshing = false;

      // Don't retry the request, let the user re-login
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      error.message = 'Network error. Please check your internet connection.';
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout. Please try again.';
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      error.message = 'Too many requests. Please wait a moment and try again.';
    }

    // Handle 500+ server errors
    if (error.response?.status >= 500) {
      error.message = 'Server error. Please try again later.';
    }

    return Promise.reject(error);
  }
);

// Rate limiting helper (client-side)
const rateLimitMap = new Map();

export const checkRateLimit = (key, maxRequests, windowMs) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing requests for this key
  let requests = rateLimitMap.get(key) || [];

  // Filter out requests outside the window
  requests = requests.filter(timestamp => timestamp > windowStart);

  // Check if rate limit exceeded
  if (requests.length >= maxRequests) {
    return false;
  }

  // Add current request
  requests.push(now);
  rateLimitMap.set(key, requests);

  return true;
};

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, requests] of rateLimitMap.entries()) {
    const filtered = requests.filter(timestamp => timestamp > now - 60000); // Keep last minute
    if (filtered.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, filtered);
    }
  }
}, 60000); // Clean up every minute

export default api;
