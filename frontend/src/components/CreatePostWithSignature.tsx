import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';

interface CreatePostWithSignatureProps {
  onPostCreated?: () => void;
}

export const CreatePostWithSignature = ({ onPostCreated }: CreatePostWithSignatureProps) => {
  const { user } = useAuth();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [contentUrl, setContentUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet is bound
  const isWalletBound = Boolean(user?.wallet_address);
  const walletMatches = isWalletBound && user?.wallet_address?.toLowerCase() === address?.toLowerCase();

  const canCreatePost = isConnected && isWalletBound && walletMatches;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreatePost || !address) {
      toast.error('Please connect your bound wallet first');
      return;
    }

    if (!contentUrl.trim()) {
      toast.error('Content URL is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Create timestamp (ISO 8601 format)
      const timestamp = new Date().toISOString();

      // Create message to sign (must match backend format exactly)
      const message = `TripIt Post\nContent: ${contentUrl}\nCaption: ${caption}\nTimestamp: ${timestamp}`;

      // Request signature from user
      const signature = await signMessageAsync({ message });

      // Parse tags
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Submit to backend
      const response = await api.post('/posts', {
        content_url: contentUrl,
        caption: caption || null,
        signature,
        wallet_address: address,
        timestamp,
        location: location || null,
        tags: tagArray.length > 0 ? tagArray : null,
        post_type: 'photo', // Default to photo, can be extended
      });

      if (response.data.success) {
        toast.success('Post created and verified! 🎉');

        // Reset form
        setContentUrl('');
        setCaption('');
        setLocation('');
        setTags('');

        // Callback
        onPostCreated?.();
      }
    } catch (error: any) {
      console.error('Post creation error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create post';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Create Verified Post
        </CardTitle>
        <CardDescription>
          Create a signature-verified post using your blockchain identity. Your post will be cryptographically signed and permanently linked to your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Wallet Status Badge */}
        <div className="mb-4">
          {!isConnected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to create verified posts.
              </AlertDescription>
            </Alert>
          )}

          {isConnected && !isWalletBound && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to bind your wallet to your account first. Go to Settings → Identity to bind your wallet.
              </AlertDescription>
            </Alert>
          )}

          {isConnected && isWalletBound && !walletMatches && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connected wallet ({address?.slice(0, 6)}...{address?.slice(-4)}) doesn't match your bound wallet ({user?.wallet_address?.slice(0, 6)}...{user?.wallet_address?.slice(-4)}). Please connect the correct wallet.
              </AlertDescription>
            </Alert>
          )}

          {canCreatePost && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-green-800 dark:text-green-200">
                  ✓ Ready to create verified posts
                </span>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Post Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contentUrl">
              Content URL <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="contentUrl"
                type="url"
                placeholder="https://example.com/image.jpg or ipfs://..."
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                disabled={!canCreatePost || isSubmitting}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!canCreatePost || isSubmitting}
                title="Upload to IPFS (coming soon)"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct link to your image or video (HTTPS/IPFS)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              placeholder="Share your travel story..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={!canCreatePost || isSubmitting}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/500
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              type="text"
              placeholder="Paris, France"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={!canCreatePost || isSubmitting}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              type="text"
              placeholder="travel, adventure, food (comma-separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              disabled={!canCreatePost || isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              What happens when you submit?
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>You'll be asked to sign a message with your wallet</li>
              <li>Your signature proves ownership of the wallet</li>
              <li>The post is permanently linked to your blockchain identity</li>
              <li>The post receives a "Verified" badge</li>
              <li>You earn reputation and TRIP tokens</li>
            </ol>
          </div>

          <Button
            type="submit"
            disabled={!canCreatePost || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating & Signing...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Create Verified Post
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
