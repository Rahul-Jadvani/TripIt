import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Wallet, Shield, Star, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { WalletBindFlow } from '@/components/WalletBindFlow';

export default function Settings() {
  const { user } = useAuth();
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const isVerifiedUser = (user as any)?.isValidator || (user as any)?.is_validator;

  const handleRequestVerification = () => {
    // Show success message - in production, this could send a notification to admins
    toast.success('Request submitted! Our team will review your application.');
    setVerificationDialogOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-4xl font-bold">Settings</h1>

        <div className="space-y-6">
          {/* Become a Verified User Card */}
          {!isVerifiedUser && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle>Become a Verified User</CardTitle>
                </div>
                <CardDescription>
                  Join our caravan of trusted travelers who review and verify itineraries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Review travel itineraries from fellow travelers</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Award 1-4 star ratings based on quality and authenticity</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Get special "Verified User" badge on your profile</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                    <p className="text-sm text-muted-foreground">Help build a trusted travel caravan</p>
                  </div>
                </div>

                <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full btn-primary">
                      <Shield className="mr-2 h-4 w-4" />
                      Apply to Become Verified User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Apply for Verified User Status</DialogTitle>
                      <DialogDescription>
                        Join our team of verified users who help maintain quality on TripIt
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">What Verified Users Do:</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <Star className="h-4 w-4 text-primary mt-0.5" />
                            <span>Review itineraries and award ratings (1-4 stars)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Star className="h-4 w-4 text-primary mt-0.5" />
                            <span>Provide feedback to help travelers improve their content</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Star className="h-4 w-4 text-primary mt-0.5" />
                            <span>Flag inappropriate or low-quality content</span>
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Requirements:</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                            <span>Active member of the TripIt caravan</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                            <span>Posted quality itineraries</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                            <span>Good standing in the caravan</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-secondary/50 p-3 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Note:</strong> Our team will review your application and get back to you within 3-5 business days.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setVerificationDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 btn-primary"
                          onClick={handleRequestVerification}
                        >
                          Submit Application
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Show verified status if already verified */}
          {isVerifiedUser && (
            <Card className="border-blue-500/50 bg-blue-500/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-600">Verified User Status</CardTitle>
                </div>
                <CardDescription>
                  You are a verified user on TripIt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-600">Active Verified User</p>
                    <p className="text-xs text-muted-foreground">
                      You can review itineraries and award star ratings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Blockchain Identity - Wallet Binding */}
          <WalletBindFlow />

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-votes" className="flex flex-col space-y-1">
                  <span>Email on votes</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Receive email when someone votes on your project
                  </span>
                </Label>
                <Switch id="email-votes" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="email-comments" className="flex flex-col space-y-1">
                  <span>Email on comments</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Receive email when someone comments on your project
                  </span>
                </Label>
                <Switch id="email-comments" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="email-intros" className="flex flex-col space-y-1">
                  <span>Email on intro requests</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Receive email when someone requests an introduction
                  </span>
                </Label>
                <Switch id="email-intros" defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Control your profile visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="public-profile" className="flex flex-col space-y-1">
                  <span>Public profile</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Make your profile visible to everyone
                  </span>
                </Label>
                <Switch id="public-profile" defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="show-email" className="flex flex-col space-y-1">
                  <span>Show email on profile</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    Display your email address on your public profile
                  </span>
                </Label>
                <Switch id="show-email" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
