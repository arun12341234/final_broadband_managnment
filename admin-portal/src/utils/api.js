// ============================================
// API UTILITIES
// ============================================

import axios from 'axios';
import { CONFIG, API } from '../constants';
import { retryWithBackoff, getErrorMessage } from './helpers';

/**
 * Create axios instance with configuration
 */
const createApiInstance = () => {
  const instance = axios.create({
    baseURL: CONFIG.API_URL,
    timeout: API.TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Global loading tracker
  let activeRequests = 0;
  const dispatchLoadingEvent = () => {
    try {
      const event = new CustomEvent('api:loading', { detail: { activeRequests } });
      window.dispatchEvent(event);
    } catch (_) {
      // no-op in non-browser environments
    }
  };

  // Request interceptor - add auth token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // mark start
      activeRequests += 1;
      dispatchLoadingEvent();
      return config;
    },
    (error) => {
      // request failed before send
      activeRequests = Math.max(0, activeRequests - 1);
      dispatchLoadingEvent();
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors
  instance.interceptors.response.use(
    (response) => {
      // mark end
      activeRequests = Math.max(0, activeRequests - 1);
      dispatchLoadingEvent();
      return response;
    },
    (error) => {
      // Handle 401 Unauthorized
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
      }

      // Log error in debug mode
      if (CONFIG.ENABLE_DEBUG) {
        console.error('API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: getErrorMessage(error),
        });
      }

      // mark end on error
      activeRequests = Math.max(0, activeRequests - 1);
      dispatchLoadingEvent();

      return Promise.reject(error);
    }
  );

  return instance;
};

export const api = createApiInstance();

/**
 * API request with retry logic
 */
export const apiWithRetry = async (requestFn, retries = API.RETRY_ATTEMPTS) => {
  return retryWithBackoff(requestFn, retries, API.RETRY_DELAY);
};

/**
 * Fetch with abort controller for cancellation
 */
export const createCancellableRequest = () => {
  const controller = new AbortController();

  const request = async (url, config = {}) => {
    return api.get(url, {
      ...config,
      signal: controller.signal,
    });
  };

  const cancel = () => {
    controller.abort();
  };

  return { request, cancel };
};

/**
 * Batch API requests with individual error handling
 */
export const batchRequests = async (requests) => {
  const results = await Promise.allSettled(requests);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value.data, index };
    } else {
      return {
        success: false,
        error: getErrorMessage(result.reason),
        index,
      };
    }
  });
};

/**
 * Upload file with progress tracking
 */
export const uploadFile = (url, formData, onProgress) => {
  return api.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });
};

/**
 * Download file as blob
 */
export const downloadFile = async (url, filename) => {
  const response = await api.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(link.href);
};

/**
 * Check API health
 */
export const checkApiHealth = async () => {
  try {
    await api.get('/health');
    return true;
  } catch (error) {
    return false;
  }
};
