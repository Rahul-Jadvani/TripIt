/**
 * VendorRoute - Protected route component for vendor-only pages
 * Redirects to /vendor/login if vendor is not authenticated
 */
import { Navigate } from 'react-router-dom';
import { isVendorLoggedIn } from '@/services/vendorApi';

interface VendorRouteProps {
  children: React.ReactNode;
}

export function VendorRoute({ children }: VendorRouteProps) {
  // Check if vendor is logged in
  if (!isVendorLoggedIn()) {
    return <Navigate to="/vendor/login" replace />;
  }

  return <>{children}</>;
}

export default VendorRoute;
