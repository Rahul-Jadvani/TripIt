import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import SigningInLoader from '@/components/SigningInLoader';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const access = params.get('access');
    const refresh = params.get('refresh');
    const redirect = params.get('redirect') || '/';
    const provider = params.get('provider') || 'unknown';

    // Log callback details for debugging
    console.log(`[AuthCallback] Called with provider: ${provider}, has_access: ${!!access}, has_refresh: ${!!refresh}`);

    // On success: store tokens and hydrate user
    if (access) {
      console.log(`[AuthCallback] Storing tokens and initializing user...`);
      localStorage.setItem('token', access);
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // Refresh user then redirect
      (async () => {
        try {
          console.log(`[AuthCallback] Calling refreshUser...`);
          await refreshUser();
          console.log(`[AuthCallback] User refreshed successfully, redirecting to: ${redirect}`);
        } catch (err) {
          console.warn(`[AuthCallback] User refresh failed (continuing anyway):`, err);
          // ignore hydration errors, carry on
        }
        navigate(redirect, { replace: true });
      })();
      return;
    }

    // On error: go back to login with error message
    const error = params.get('error') || params.get('google_error') || params.get('github_error');
    console.log(`[AuthCallback] Auth failed for provider ${provider}, error: ${error}`);

    if (error) {
      navigate(`/login?${provider}_error=${error}`, { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [location.search, navigate, refreshUser]);

  return <SigningInLoader message="Signing you in..." />;
}
