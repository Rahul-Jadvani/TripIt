import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Mail, Key, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminApi } from '@/services/adminApi';

interface AdminOTPLoginProps {
  onSuccess: () => void;
}

export function AdminOTPLogin({ onSuccess }: AdminOTPLoginProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useToast();

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      await adminApi.requestOTP(email.trim());

      setOtpSent(true);
      setStep('otp');

      toast({
        title: 'OTP Sent',
        description: 'Check your email for the 6-digit code (valid for 10 minutes)',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send OTP',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode.trim() || otpCode.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter the 6-digit OTP code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await adminApi.verifyOTP(email, otpCode.trim());

      if (response.data.status === 'success') {
        toast({
          title: 'Success',
          description: 'Admin authentication successful',
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Authentication Failed',
        description: error.response?.data?.message || 'Invalid or expired OTP code',
        variant: 'destructive',
      });
      setOtpCode('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtpCode('');
    setOtpSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 via-background to-purple-50 dark:from-purple-950/10 dark:via-background dark:to-purple-950/10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-purple-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          <CardDescription>
            {step === 'email'
              ? 'Enter your admin email to receive an OTP code'
              : 'Enter the 6-digit code sent to your email'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleRequestOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send OTP Code
                  </>
                )}
              </Button>

              <div className="text-xs text-center text-muted-foreground space-y-1">
                <p>Only registered admin users can access this area.</p>
                <p>The OTP code is valid for 10 minutes.</p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      OTP Sent Successfully
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Check your email: <strong>{email}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || otpCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Verify & Login
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  Back to Email
                </Button>
              </div>

              <div className="text-xs text-center text-muted-foreground">
                <p>Didn't receive the code? Check your spam folder or try again.</p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
