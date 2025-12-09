/**
 * VendorLogin - Login page for vendor portal
 */
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Building2, ShieldCheck } from 'lucide-react';
import { vendorLogin, isVendorLoggedIn } from '@/services/vendorApi';

export default function VendorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  if (isVendorLoggedIn()) {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await vendorLogin({ contact_email: email, password });
      toast.success('Welcome to the Vendor Portal!');
      navigate('/vendor/dashboard');
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto px-3 sm:px-6 py-6 sm:py-12">
        <div className="mx-auto max-w-md">
          <form onSubmit={handleSubmit}>
            <div className="card-elevated p-4 sm:p-8">
              {/* Header */}
              <div className="mb-6 sm:mb-8 flex justify-center">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-[12px] border-4 border-black bg-secondary grid place-items-center shadow-[6px_6px_0_0_#000]">
                  <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>

              <div className="mb-6 sm:mb-8 text-center">
                <h1 className="text-2xl sm:text-3xl font-black text-foreground mb-2">
                  Vendor Portal
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  TripIt SBT Verification System
                </p>
              </div>

              {/* Info Banner */}
              <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-2">
                  <Building2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This portal is for authorized vendors (hotels, transport, hospitals, police)
                    to verify traveler SBT QR codes and access emergency contact information.
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-3 sm:space-y-4 mb-5 sm:mb-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vendor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-sm sm:text-base h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10 sm:pr-12 text-sm sm:text-base h-10 sm:h-11"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full mb-4 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In to Vendor Portal'
                )}
              </button>

              {/* Footer */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Need vendor access?{' '}
                  <a
                    href="mailto:support@tripit.com"
                    className="text-primary hover:underline"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
          </form>

          {/* Test Credentials Info (for development) */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Test Vendor Credentials:
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                Email: test.hotel@tripit.demo
                <br />
                Password: TestVendor123!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
