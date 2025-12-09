import axios from 'axios';

let backendFailureCount = 0;
const MAX_FAILURES_BEFORE_SOS = 3;

/**
 * Setup axios interceptor to monitor backend health
 * Redirects to SOS page if backend is consistently failing
 */
export function setupBackendHealthMonitor() {
  axios.interceptors.response.use(
    (response) => {
      // Reset failure count on successful response
      backendFailureCount = 0;
      return response;
    },
    (error) => {
      const currentPath = window.location.pathname;

      // Don't redirect if already on SOS page
      if (currentPath === '/sos') {
        return Promise.reject(error);
      }

      // Check if error is due to backend being down
      const isBackendDown =
        !error.response || // Network error (backend unreachable)
        error.code === 'ERR_NETWORK' ||
        error.code === 'ECONNREFUSED' ||
        error.message === 'Network Error';

      if (isBackendDown) {
        backendFailureCount++;

        // If backend has failed multiple times, redirect to SOS
        if (backendFailureCount >= MAX_FAILURES_BEFORE_SOS) {
          console.warn('Backend appears to be down, redirecting to SOS page');
          window.location.href = '/sos';
        }
      }

      return Promise.reject(error);
    }
  );
}

/**
 * Reset the backend failure counter
 * Call this when you want to give backend another chance
 */
export function resetBackendHealthMonitor() {
  backendFailureCount = 0;
}
