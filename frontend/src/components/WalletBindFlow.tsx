import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Wallet, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';

interface WalletBindFlowProps {
  onBindSuccess?: () => void;
}

export const WalletBindFlow = ({ onBindSuccess }: WalletBindFlowProps) => {
  const { user, refreshUser } = useAuth();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [isBinding, setIsBinding] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  // Check if wallet is already bound
  const isWalletBound = Boolean(user?.wallet_address);
  const boundToCurrentWallet = isWalletBound && user?.wallet_address?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    if (isWalletBound && boundToCurrentWallet) {
      // Already bound to current wallet
      setBindError(null);
    } else if (isWalletBound && address && !boundToCurrentWallet) {
      // Bound to different wallet
      setBindError(`Your account is permanently bound to wallet ${user?.wallet_address?.slice(0, 6)}...${user?.wallet_address?.slice(-4)}. Wallet binding is immutable for identity integrity.`);
    }
  }, [isWalletBound, boundToCurrentWallet, address, user?.wallet_address]);

  const handleBindWallet = async () => {
    if (!address || !user?.email) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (isWalletBound) {
      toast.error('Wallet already bound. Cannot change.');
      return;
    }

    try {
      setIsBinding(true);
      setBindError(null);

      // Create message to sign
      const message = `Bind wallet ${address} to TripIt account ${user.email}`;

      // Request signature from user
      const signature = await signMessageAsync({ message });

      // Send to backend
      const response = await api.post('/identity/bind-wallet', {
        wallet_address: address,
        signature,
      });

      if (response.data.success) {
        toast.success('Wallet bound successfully! This binding is permanent.');
        await refreshUser();
        onBindSuccess?.();
      }
    } catch (error: any) {
      console.error('Wallet binding error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to bind wallet';
      setBindError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Binding
        </CardTitle>
        <CardDescription>
          Connect your Web3 wallet to enable blockchain identity features. Once bound, this association is permanent and cannot be changed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RainbowKit Connect Button */}
        <div className="flex justify-center">
          <ConnectButton />
        </div>

        {/* Wallet Status */}
        {isConnected && address && (
          <Alert className={isWalletBound && boundToCurrentWallet ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
            <div className="flex items-start gap-3">
              {isWalletBound && boundToCurrentWallet ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <Wallet className="h-5 w-5 text-primary mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {isWalletBound && boundToCurrentWallet ? 'Wallet Bound' : 'Wallet Connected'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {address}
                </p>
                {isWalletBound && boundToCurrentWallet && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ This wallet is permanently bound to your account
                  </p>
                )}
              </div>
            </div>
          </Alert>
        )}

        {/* Bind Error */}
        {bindError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{bindError}</AlertDescription>
          </Alert>
        )}

        {/* Bind Button */}
        {isConnected && address && !isWalletBound && (
          <div className="space-y-3">
            <div className="p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                ⚠️ Important: Permanent Binding
              </h4>
              <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1 list-disc list-inside">
                <li>Once bound, you cannot change or unbind this wallet</li>
                <li>This ensures identity integrity and prevents fraud</li>
                <li>Make sure this is the wallet you want to use permanently</li>
                <li>You'll need this wallet to create signature-verified posts</li>
              </ul>
            </div>

            <Button
              onClick={handleBindWallet}
              disabled={isBinding}
              className="w-full"
              size="lg"
            >
              {isBinding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Binding Wallet...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Bind Wallet (Permanent)
                </>
              )}
            </Button>
          </div>
        )}

        {/* Already Bound to Different Wallet */}
        {isWalletBound && !boundToCurrentWallet && address && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <p>Your account is already permanently bound to a different wallet:</p>
              <p className="font-mono text-xs">{user?.wallet_address}</p>
              <p className="text-xs">
                Connected wallet: {address}
              </p>
              <p className="text-xs mt-2">
                Please connect the bound wallet or contact support if you believe this is an error.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Next Steps */}
        {isWalletBound && boundToCurrentWallet && (
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">✓ What's Next?</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Complete your profile to generate a profile hash</li>
              <li>Mint your Travel SBT (Soul-Bound Token)</li>
              <li>Create signature-verified posts and earn reputation</li>
              <li>Access blockchain-verified travel features</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
