import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Watches connectivity and navigates to an offline page when needed
// Only triggers on actual navigator.onLine changes, not query timing
export function NetworkGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Track online/offline events - only real connectivity changes
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Navigate based on actual online/offline status only
  useEffect(() => {
    const onSOSRoute = location.pathname === '/sos';

    // Only redirect TO SOS when offline (never redirect away from SOS)
    // Allow manual navigation to SOS anytime
    if (!isOnline && !onSOSRoute) {
      // User went offline - hard redirect to SOS page (bypasses all wrappers)
      window.location.href = '/sos';
    }
    // Don't redirect away from SOS when coming back online
    // User can manually navigate away if they want
  }, [isOnline, location.pathname]);

  return null;
}

export default NetworkGuard;

