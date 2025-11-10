import { useRef, useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const { login, user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🚀 Attempting login with:', { email });
      await login(email, password);
      console.log('✅ Login successful');
      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      console.error('❌ Login error:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data,
        errorMessage: error.message,
      });
      toast.error(error.response?.data?.message || error.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShowPassword = () => {
    if (showPassword) {
      setShowPassword(false);
      if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
      return;
    }
    setShowPassword(true);
    if (showTimerRef.current) window.clearTimeout(showTimerRef.current);
    showTimerRef.current = window.setTimeout(() => {
      setShowPassword(false);
      showTimerRef.current = null;
    }, 3000);
  };

  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-md">
          <form onSubmit={handleSubmit}>
            <div className="card-elevated p-8">
              {/* Header */}
              <div className="mb-8 flex justify-center">
                <div className="h-14 w-14 rounded-[12px] border-4 border-black bg-secondary grid place-items-center shadow-[6px_6px_0_0_#000]">
                  <img src="/logo.png" alt="ZERO" className="h-8 w-8 object-contain" />
                </div>
              </div>

              <div className="mb-8 text-center">
                <h1 className="text-4xl font-black text-foreground mb-2">Welcome back</h1>
                <p className="text-base text-muted-foreground">
                  Enter your credentials to access your account
                </p>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={toggleShowPassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full mb-4"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-bold hover:opacity-80 transition-quick">
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
