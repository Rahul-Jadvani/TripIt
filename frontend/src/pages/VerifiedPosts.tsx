import { CreatePostWithSignature } from '@/components/CreatePostWithSignature';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function VerifiedPosts() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasSBT = Boolean(user?.sbt_id);

  if (!hasSBT) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                SBT Required
              </CardTitle>
              <CardDescription>
                You need to mint your Travel SBT before creating verified posts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/blockchain-identity')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Blockchain Identity
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/blockchain-identity')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Create Verified Post
            </h1>
            <p className="text-muted-foreground mt-1">
              Sign your content with your blockchain identity
            </p>
          </div>
        </div>

        {/* Main Content */}
        <CreatePostWithSignature
          onPostCreated={() => {
            toast.success('Your verified post was created! 🎉');
            // Optionally navigate somewhere after post creation
          }}
        />

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              What are Verified Posts?
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Cryptographically signed using your wallet and SBT</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Permanently linked to your blockchain identity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Cannot be forged or modified after creation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>Earn TRIP tokens and reputation for verified content</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
