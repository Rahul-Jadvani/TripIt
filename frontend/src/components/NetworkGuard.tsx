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
    const onOfflineRoute = location.pathname.startsWith('/offline');
    const lastPathKey = 'last_route_before_offline';

    if (!isOnline && !onOfflineRoute) {
      // User actually went offline
      const last = location.pathname + location.search + location.hash;
      sessionStorage.setItem(lastPathKey, last);
      navigate(`/offline?type=offline`, { replace: false });
    } else if (isOnline && onOfflineRoute) {
      // User came back online - restore previous page
      const backTo = sessionStorage.getItem(lastPathKey) || '/';
      sessionStorage.removeItem(lastPathKey);
      navigate(backTo, { replace: true });
    }
  }, [isOnline, location.pathname, navigate]);

  return null;
}

export default NetworkGuard;

