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

    // On success: store tokens and hydrate user
    if (access) {
      localStorage.setItem('token', access);
      if (refresh) {
        localStorage.setItem('refreshToken', refresh);
      }
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      // Refresh user then redirect
      (async () => {
        try {
          await refreshUser();
        } catch {
          // ignore hydration errors, carry on
        }
        navigate(redirect, { replace: true });
      })();
      return;
    }

    // On error: go back to login
    navigate('/login', { replace: true });
  }, [location.search, navigate, refreshUser]);

  return <SigningInLoader message="Signing you in..." />;
}
