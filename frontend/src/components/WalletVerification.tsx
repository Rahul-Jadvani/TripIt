import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle2, XCircle, Loader2, AlertCircle, Github, ExternalLink, Shield, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/api';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function WalletVerification() {
  const { user, refreshUser } = useAuth();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [verifying, setVerifying] = useState(false);
  const [connectingGithub, setConnectingGithub] = useState(false);

  // Check for GitHub OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubSuccess = params.get('github_success');
    const githubUsername = params.get('github_username');
    const githubError = params.get('github_error');

    if (githubSuccess === 'true' && githubUsername) {
      toast.success(`GitHub connected! Welcome @${githubUsername}`);
      if (refreshUser) {
        refreshUser();
      }
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (githubError) {
      toast.error(`GitHub connection failed: ${githubError}`);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refreshUser]);

  const handleVerifyCert = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setVerifying(true);
    try {
      const token = localStorage.getItem('token'); // Changed from 'access_token' to 'token'

      if (!token) {
        toast.error('Not authenticated. Please log in again.');
        setVerifying(false);
        return;
      }

      const response = await axios.post(
        `${API_URL}/api/blockchain/verify-cert`,
        { wallet_address: address },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 'success') {
        const hasCert = response.data.data.has_cert;

        if (hasCert) {
          toast.success('0xCert verified! Your projects now have +10 verification score');
        } else {
          toast.error('No 0xCert found in this wallet');
        }

        // Refresh user data
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (error: any) {
      console.error('Cert verification error:', error);
      toast.error(error.response?.data?.message || 'Failed to verify 0xCert');
    } finally {
      setVerifying(false);
    }
  };

  const handleGithubConnect = async () => {
    setConnectingGithub(true);
    try {
      const response = await authService.githubConnect();
      const authUrl = response.data.data.auth_url;
      // Redirect to GitHub OAuth
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('GitHub connect error:', error);
      toast.error(error.response?.data?.message || 'Failed to connect GitHub');
      setConnectingGithub(false);
    }
  };

  const handleGithubDisconnect = async () => {
    try {
      await authService.githubDisconnect();
      toast.success('GitHub account disconnected');
      if (refreshUser) {
        await refreshUser();
      }
    } catch (error: any) {
      console.error('GitHub disconnect error:', error);
      toast.error(error.response?.data?.message || 'Failed to disconnect GitHub');
    }
  };

  return (
    <Card className="card-elevated p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-foreground mb-2 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Verification
          </h2>
          <p className="text-sm text-muted-foreground">Quickly connect and verify — fewer steps, same benefits.</p>
        </div>

        {/* Compact status summary */}
        <div className="flex flex-wrap gap-2">
          {(user?.isVerified || user?.email_verified) ? (
            <Badge className="badge-success gap-1"><CheckCircle2 className="h-3 w-3" /> Email +5</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Email</Badge>
          )}
          {(isConnected && address) ? (
            <Badge className="badge-success gap-1"><CheckCircle2 className="h-3 w-3" /> {address.slice(0,6)}...{address.slice(-4)}</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Wallet</Badge>
          )}
          {(user?.hasOxcert || (user as any)?.has_oxcert) ? (
            <Badge className="badge-success gap-1"><CheckCircle2 className="h-3 w-3" /> 0xCert +10</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> 0xCert</Badge>
          )}
          {user?.github_connected ? (
            <Badge className="badge-success gap-1"><CheckCircle2 className="h-3 w-3" /> @{user.github_username} +5</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> GitHub</Badge>
          )}
        </div>

        {/* (Optional) NFT details removed for a cleaner, focused flow */}

        {/* Wallet Connection */}
        <div className="space-y-3">
          {!isConnected ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Step 1: Connect Your Wallet</p>
              {connectors.map((connector) => (
                <Button
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className="btn-primary w-full"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect {connector.name}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-md border border-border">
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">{address}</p>
                <Button onClick={() => disconnect()} variant="outline" size="sm" className="btn-secondary">Disconnect</Button>
              </div>

              {/* Verify 0xCert */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Step 2: Verify 0xCert NFT</p>
                <Button
                  onClick={handleVerifyCert}
                  disabled={verifying || !!user?.hasOxcert || !!(user as any)?.has_oxcert}
                  className={`w-full ${!!user?.hasOxcert || (user as any)?.has_oxcert ? 'btn-secondary opacity-60 cursor-not-allowed' : 'btn-primary'}`}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : !!user?.hasOxcert || (user as any)?.has_oxcert ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Verified
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Verify 0xCert Ownership
                    </>
                  )}
                </Button>
                {!user?.hasOxcert && !(user as any)?.has_oxcert && (
                  <p className="text-xs text-muted-foreground">Checks Kaia (Kairos) for your 0xCert. Verified accounts get +10.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GitHub Connection */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-2"><Github className="h-4 w-4" /> GitHub</p>
          {!user?.github_connected ? (
            <>
              <Button
                onClick={handleGithubConnect}
                disabled={connectingGithub}
                className="btn-primary w-full"
              >
                {connectingGithub ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Connect with GitHub
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Connect to earn +5 and validate GitHub URLs automatically.</p>
            </>
          ) : (
            <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-md border border-border">
              <p className="text-sm font-medium text-foreground">@{user?.github_username} • +5</p>
              <Button onClick={handleGithubDisconnect} variant="outline" size="sm" className="btn-secondary">Disconnect</Button>
            </div>
          )}
        </div>

        {/* Minimal helper text removed to reduce clutter */}
      </div>
    </Card>
  );
}
