import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { API_BASE } from '@/services/api';
import SigningInLoader from '@/components/SigningInLoader';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const pwdTimerRef = useRef<number | null>(null);
  const confirmTimerRef = useRef<number | null>(null);
  const oauthTimerRef = useRef<number | null>(null);
  const { register, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Username validation
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    // Email validation
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      if (import.meta.env.DEV) {
        console.log('🚀 Attempting registration with:', { email, username });
      }
      const response = await register(email, password, username);
      if (import.meta.env.DEV) {
        console.log('✅ Registration successful', response);
      }

      // If user is now logged in (OAuth user setting password), navigate to home
      // Otherwise navigate to login
      const isLoggedIn = localStorage.getItem('token');
      if (isLoggedIn) {
        toast.success('Password set successfully! You are now logged in.');
        navigate('/');
      } else {
        toast.success('Account created successfully! Please log in.');
        navigate('/login');
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('❌ Registration error:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          data: error.response?.data,
          errorMessage: error.message,
        });
      }

      // Extract error message properly
      let errorMessage = 'Failed to create account';
      if (error.response?.data) {
        // Backend returns {status: 'error', error: 'Error Type', message: 'Details'}
        errorMessage = error.response.data.message || error.response.data.error || errorMessage;
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (import.meta.env.DEV) {
        console.log('🔔 Showing toast with message:', errorMessage);
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Show/hide password for 3 seconds to confirm input
  const toggleTimed = (which: 'pwd' | 'confirm') => {
    if (which === 'pwd') {
      if (showPassword) {
        setShowPassword(false);
        if (pwdTimerRef.current) window.clearTimeout(pwdTimerRef.current);
        pwdTimerRef.current = null;
        return;
      }
      setShowPassword(true);
      if (pwdTimerRef.current) window.clearTimeout(pwdTimerRef.current);
      pwdTimerRef.current = window.setTimeout(() => {
        setShowPassword(false);
        pwdTimerRef.current = null;
      }, 3000);
    } else {
      if (showConfirm) {
        setShowConfirm(false);
        if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
        return;
      }
      setShowConfirm(true);
      if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = window.setTimeout(() => {
        setShowConfirm(false);
        confirmTimerRef.current = null;
      }, 3000);
    }
  };

  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    return () => {
      if (oauthTimerRef.current) window.clearTimeout(oauthTimerRef.current);
    };
  }, []);

  const handleOAuth = (provider: 'Google' | 'GitHub') => {
    setOauthProvider(provider);
    if (oauthTimerRef.current) window.clearTimeout(oauthTimerRef.current);

    const target =
      provider === 'Google'
        ? `${API_BASE}/auth/google/login`
        : `${API_BASE}/auth/github/login`;

    oauthTimerRef.current = window.setTimeout(() => {
      window.location.href = target;
    }, 80);
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="mx-auto max-w-md">
          <form onSubmit={handleSubmit}>
            <div className="card-elevated p-4 sm:p-8">
              {/* Header */}
              <div className="mb-6 sm:mb-8 flex justify-center">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[12px] border-4 border-black bg-secondary grid place-items-center shadow-[6px_6px_0_0_#000]">
                  <img src="/logo.png" alt="ZERO" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
                </div>
              </div>

              <div className="mb-6 sm:mb-8 text-center">
                <h1 className="text-2xl sm:text-4xl font-black text-foreground mb-2">Create an account</h1>
                <p className="text-xs sm:text-base text-muted-foreground">
                  Join Zer0 and start sharing your projects
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="username" className="text-xs sm:text-sm">Username *</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) setErrors({ ...errors, username: undefined });
                    }}
                    required
                    className={`text-sm sm:text-base h-9 sm:h-10 ${errors.username ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.username && (
                    <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    required
                    className={`text-sm sm:text-base h-9 sm:h-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors({ ...errors, password: undefined });
                      }}
                      required
                      className={`pr-10 sm:pr-12 text-sm sm:text-base h-9 sm:h-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => toggleTimed('pwd')}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                  )}
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                      }}
                      required
                      className={`pr-10 sm:pr-12 text-sm sm:text-base h-9 sm:h-10 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      onClick={() => toggleTimed('confirm')}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full mb-3 sm:mb-4 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Sign up'}
              </button>

              {/* OAuth Providers */}
              <div className="my-3 sm:my-4 flex items-center gap-2 sm:gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                type="button"
                className="btn-secondary w-full mb-3 sm:mb-4 text-sm sm:text-base"
                onClick={() => handleOAuth('Google')}
                disabled={!!oauthProvider}
              >
                Continue with Google
              </button>
              <button
                type="button"
                className="btn-secondary w-full mb-3 sm:mb-4 text-sm sm:text-base"
                onClick={() => handleOAuth('GitHub')}
                disabled={!!oauthProvider}
              >
                Continue with GitHub
              </button>

              {/* Login Link */}
              <p className="text-center text-xs sm:text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-bold hover:opacity-80 transition-quick">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
      {oauthProvider && (
        <div className="flex items-center justify-center">
          <SigningInLoader message={`Signing you in with ${oauthProvider}...`} />
        </div>
      )}
    </div>
  );
}
