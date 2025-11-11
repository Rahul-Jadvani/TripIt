import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';

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
        } catch (e) {
          // ignore hydration errors, carry on
        }
        navigate(redirect, { replace: true });
      })();
      return;
    }

    // On error: go back to login
    navigate('/login', { replace: true });
  }, [location.search, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-bold mb-2">Signing you in…</div>
        <div className="text-muted-foreground">Just a moment.</div>
      </div>
    </div>
  );
}

