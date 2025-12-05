import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  AlertCircle,
  Wallet,
  Loader2,
  Shield,
  Hash,
  ExternalLink,
  Award,
  Sparkles,
  Trophy,
  Coins,
  Heart,
  Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from 'sonner';
import { CreatePostWithSignature } from '@/components/CreatePostWithSignature';

export default function BlockchainIdentity() {
  const { user, refreshUser } = useAuth();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // State management
  const [isBinding, setIsBinding] = useState(false);
  const [isCreatingHash, setIsCreatingHash] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);

  // Profile hash form
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');

  // Emergency contacts form
  const [contact1Name, setContact1Name] = useState('');
  const [contact1Phone, setContact1Phone] = useState('');
  const [contact2Name, setContact2Name] = useState('');
  const [contact2Phone, setContact2Phone] = useState('');
  const [isUpdatingContacts, setIsUpdatingContacts] = useState(false);

  // Computed states
  const isWalletBound = Boolean(user?.wallet_address);
  const boundToCurrentWallet = isWalletBound && user?.wallet_address?.toLowerCase() === address?.toLowerCase();
  const hasProfileHash = Boolean(user?.profile_hash);
  const hasSBT = user?.sbt_status === 'issued' || user?.sbt_status === 'verified';

  // Validation effect
  useEffect(() => {
    if (isWalletBound && address && !boundToCurrentWallet) {
      setBindError(
        `⚠️ Wallet Mismatch: Your TripIt account is permanently bound to ${user?.wallet_address?.slice(0, 6)}...${user?.wallet_address?.slice(-4)}. ` +
        `Please connect that wallet instead. Current wallet: ${address?.slice(0, 6)}...${address?.slice(-4)}`
      );
    } else {
      setBindError(null);
    }
  }, [isWalletBound, boundToCurrentWallet, address, user?.wallet_address]);

  // Handler: Bind Wallet
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

      const message = `Bind wallet ${address} to TripIt account ${user.email}`;
      const signature = await signMessageAsync({ message });

      const response = await api.post('/identity/bind-wallet', {
        wallet_address: address,
        signature,
      });

      if (response.data.status === 'success') {
        toast.success('✓ Wallet bound successfully! This binding is permanent.');
        await refreshUser();
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

  // Handler: Create Profile Hash
  const handleCreateProfileHash = async () => {
    if (!fullName || !dateOfBirth) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsCreatingHash(true);

      const response = await api.post('/identity/create-profile-hash', {
        full_name: fullName,
        date_of_birth: dateOfBirth,
        phone: phone || undefined,
      });

      if (response.data.status === 'success') {
        toast.success('✓ Profile hash created successfully!');
        await refreshUser();
      }
    } catch (error: any) {
      console.error('Profile hash error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create profile hash';
      toast.error(errorMsg);
    } finally {
      setIsCreatingHash(false);
    }
  };

  // Handler: Mint SBT
  const handleMintSBT = async () => {
    try {
      setIsMinting(true);

      const response = await api.post('/identity/mint-sbt');

      if (response.data.status === 'success') {
        toast.success('✓ Travel SBT minted successfully!');
        await refreshUser();
      }
    } catch (error: any) {
      console.error('SBT minting error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to mint SBT';
      toast.error(errorMsg);
    } finally {
      setIsMinting(false);
    }
  };

  // Handler: Update Emergency Contacts
  const handleUpdateEmergencyContacts = async () => {
    if (!contact1Name || !contact1Phone) {
      toast.error('Please provide at least one emergency contact');
      return;
    }

    try {
      setIsUpdatingContacts(true);

      const response = await api.put('/identity/update-emergency-contacts', {
        contact1_name: contact1Name,
        contact1_phone: contact1Phone,
        contact2_name: contact2Name || undefined,
        contact2_phone: contact2Phone || undefined,
      });

      if (response.data.status === 'success') {
        toast.success('✓ Emergency contacts updated! Profile hash refreshed.');
        await refreshUser();
      }
    } catch (error: any) {
      console.error('Emergency contacts update error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to update emergency contacts';
      toast.error(errorMsg);
    } finally {
      setIsUpdatingContacts(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Blockchain Identity
          </h1>
          <p className="text-muted-foreground">
            Connect your wallet, create your identity hash, and mint your Travel Soul-Bound Token (SBT) for verified on-chain reputation.
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {isWalletBound ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span className={isWalletBound ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  1. Bind Wallet
                </span>
              </div>
              <Separator orientation="horizontal" className="flex-1" />
              <div className="flex items-center gap-2">
                {hasProfileHash ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span className={hasProfileHash ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  2. Profile Hash
                </span>
              </div>
              <Separator orientation="horizontal" className="flex-1" />
              <div className="flex items-center gap-2">
                {hasSBT ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted" />
                )}
                <span className={hasSBT ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                  3. Mint SBT
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Wallet Connection & Binding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Step 1: Connect & Bind Wallet
            </CardTitle>
            <CardDescription>
              Connect your Web3 wallet and bind it to your TripIt account. This is a one-time, permanent action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connect Button */}
            <div className="flex justify-center">
              <ConnectButton />
            </div>

            {/* Wallet Status */}
            {isConnected && address && (
              <Alert className={isWalletBound && boundToCurrentWallet ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
                <div className="flex items-start gap-3">
                  {isWalletBound && boundToCurrentWallet ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <Wallet className="h-5 w-5 text-primary mt-0.5" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {isWalletBound && boundToCurrentWallet ? '✓ Wallet Bound' : 'Wallet Connected'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {address}
                    </p>
                    {isWalletBound && boundToCurrentWallet && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Permanently Bound
                      </Badge>
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
            {isConnected && address && !isWalletBound && !bindError && (
              <div className="space-y-3">
                <div className="p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    ⚠️ Important: Permanent Binding
                  </h4>
                  <ul className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
                    <li>• One Google account = One wallet forever</li>
                    <li>• Cannot change or unbind once completed</li>
                    <li>• Ensures identity integrity and prevents fraud</li>
                    <li>• Required for signature-verified posts and SBT minting</li>
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
                      Bind Wallet to Account (Permanent)
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Create Profile Hash */}
        {isWalletBound && boundToCurrentWallet && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Step 2: Create Profile Hash
              </CardTitle>
              <CardDescription>
                Generate a cryptographic hash of your identity for on-chain verification. Your data is hashed locally and only the hash is stored on-chain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasProfileHash ? (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="space-y-1">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      ✓ Profile Hash Created
                    </p>
                    <p className="text-xs text-green-800 dark:text-green-200 font-mono break-all">
                      {user?.profile_hash}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {user?.profile_hash_updated_at ? new Date(user.profile_hash_updated_at).toLocaleString() : 'N/A'}
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      <strong>Privacy:</strong> Your personal information is hashed using SHA-256 with a unique salt.
                      Only the hash is stored on-chain, ensuring your privacy while maintaining verifiability.
                    </p>
                  </div>

                  <Button
                    onClick={handleCreateProfileHash}
                    disabled={isCreatingHash || !fullName || !dateOfBirth}
                    className="w-full"
                    size="lg"
                  >
                    {isCreatingHash ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Hash...
                      </>
                    ) : (
                      <>
                        <Hash className="mr-2 h-4 w-4" />
                        Generate Profile Hash
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2.5: Emergency Contacts (Optional) - Clean Modern Design */}
        {isWalletBound && boundToCurrentWallet && hasProfileHash && (
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Optional - Add contacts for safety. Hashed for privacy.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Contact 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    1
                  </div>
                  <Label className="text-sm font-semibold">Primary Contact *</Label>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    value={contact1Name}
                    onChange={(e) => setContact1Name(e.target.value)}
                    placeholder="Full Name"
                    className="text-sm"
                  />
                  <Input
                    type="tel"
                    value={contact1Phone}
                    onChange={(e) => setContact1Phone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="text-sm"
                  />
                </div>
              </div>

              <Separator />

              {/* Contact 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                    2
                  </div>
                  <Label className="text-sm font-semibold">Secondary Contact</Label>
                  <Badge variant="outline" className="text-[10px] h-5">Optional</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    value={contact2Name}
                    onChange={(e) => setContact2Name(e.target.value)}
                    placeholder="Full Name"
                    className="text-sm"
                  />
                  <Input
                    type="tel"
                    value={contact2Phone}
                    onChange={(e) => setContact2Phone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Privacy Notice */}
              <Alert className="bg-primary/5 border-primary/20">
                <Shield className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  <span className="font-semibold">Privacy-Preserving</span>: Contacts are SHA-256 hashed before storage.
                  Only the hash goes on-chain, protecting your emergency contacts' privacy.
                </AlertDescription>
              </Alert>

              {/* Save Button */}
              <Button
                onClick={handleUpdateEmergencyContacts}
                disabled={isUpdatingContacts || !contact1Name || !contact1Phone}
                className="w-full"
                size="lg"
              >
                {isUpdatingContacts ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Contacts...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Emergency Contacts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Mint SBT */}
        {isWalletBound && boundToCurrentWallet && hasProfileHash && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Step 3: Mint Travel SBT
              </CardTitle>
              <CardDescription>
                Mint your Soul-Bound Token (SBT) - a non-transferable NFT representing your verified travel identity on Base network.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hasSBT ? (
                <div className="space-y-4">
                  {/* Success Banner */}
                  <div className="relative overflow-hidden rounded-lg border-2 border-green-500 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 p-6">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-green-500/10 blur-2xl" />
                    <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />

                    <div className="relative space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500">
                          <CheckCircle2 className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                            Travel SBT Minted Successfully!
                          </h3>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Your verified travel identity is now on-chain
                          </p>
                        </div>
                      </div>

                      {/* Token Details Grid - Dark Themed */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-green-900/20 dark:bg-green-900/30 p-3 border border-green-500/30">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1 font-medium">Token ID</p>
                          <p className="text-lg font-bold font-mono text-green-800 dark:text-green-200">
                            #{user?.sbt_id || 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-lg bg-green-900/20 dark:bg-green-900/30 p-3 border border-green-500/30">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1 font-medium">Status</p>
                          <Badge className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                            {user?.sbt_status?.toUpperCase() || 'ISSUED'}
                          </Badge>
                        </div>
                        <div className="rounded-lg bg-green-900/20 dark:bg-green-900/30 p-3 border border-green-500/30">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1 font-medium">Reputation Score</p>
                          <p className="text-lg font-bold text-green-800 dark:text-green-200">
                            {user?.reputation_score || 0}/100
                          </p>
                        </div>
                        <div className="rounded-lg bg-green-900/20 dark:bg-green-900/30 p-3 border border-green-500/30">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1 font-medium">Minted On</p>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                            {user?.sbt_verified_date
                              ? new Date(user.sbt_verified_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'Today'}
                          </p>
                        </div>
                      </div>

                      {/* Blockchain Link */}
                      {user?.sbt_blockchain_hash && (
                        <Button
                          variant="outline"
                          className="w-full border-green-600 text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950"
                          asChild
                        >
                          <a
                            href={`http://localhost:8545/tx/${user.sbt_blockchain_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Transaction on Block Explorer
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* SBT Utility & Benefits */}
                  <div className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background p-5">
                    <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Your SBT Unlocks These Benefits
                    </h4>

                    <div className="grid gap-3">
                      {/* Verified Contributions */}
                      <div className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm mb-1">Verified Travel Contributions</h5>
                          <p className="text-xs text-muted-foreground">
                            Your itineraries, safety ratings, and travel intel are cryptographically signed and verifiable. Community members can trust your content is authentic.
                          </p>
                        </div>
                      </div>

                      {/* Reputation Building */}
                      <div className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm mb-1">On-Chain Reputation System</h5>
                          <p className="text-xs text-muted-foreground">
                            Earn reputation points stored on the blockchain for quality contributions, verified trips, and helpful safety reports. Your reputation follows you permanently.
                          </p>
                        </div>
                      </div>

                      {/* TRIP Token Rewards */}
                      <div className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm mb-1">TRIP Token Rewards</h5>
                          <p className="text-xs text-muted-foreground">
                            Earn TRIP tokens for verified itineraries, safety ratings, and emergency assistance. Use tokens to boost content visibility or access premium features.
                          </p>
                        </div>
                      </div>

                      {/* Women's Safety Network */}
                      <div className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm mb-1">Women's Safety Network Access</h5>
                          <p className="text-xs text-muted-foreground">
                            Join verified women-only travel groups, access certified guides, and contribute to safety ratings that help other women travelers worldwide.
                          </p>
                        </div>
                      </div>

                      {/* Travel Groups & Layerz */}
                      <div className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm mb-1">Trusted Travel Groups (Layerz)</h5>
                          <p className="text-xs text-muted-foreground">
                            Create and join verified travel groups. Your SBT proves your identity and reputation, enabling safe group travel with real-time location sharing and emergency features.
                          </p>
                        </div>
                      </div>

                      {/* Emergency Services */}
                      <div className="flex gap-3 p-3 rounded-lg bg-background/80 border border-border">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-sm mb-1">Emergency Identity Verification</h5>
                          <p className="text-xs text-muted-foreground">
                            Your SBT stores a cryptographic hash of your emergency contacts and medical info. In emergencies, this can be verified without revealing private details on-chain.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Key Features Summary */}
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">KEY FEATURES:</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">Non-Transferable NFT</Badge>
                        <Badge variant="secondary" className="text-xs">Immutable Identity</Badge>
                        <Badge variant="secondary" className="text-xs">Privacy-Preserving</Badge>
                        <Badge variant="secondary" className="text-xs">Revocable by Platform</Badge>
                        <Badge variant="secondary" className="text-xs">On Base Network</Badge>
                        <Badge variant="secondary" className="text-xs">Zero Gas Fees</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <h4 className="text-sm font-semibold mb-2">Soul-Bound Token Features:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Non-transferable NFT tied to your identity</li>
                      <li>• Stores your reputation score on-chain</li>
                      <li>• Verifiable on Base network blockchain</li>
                      <li>• Enables signature-verified content creation</li>
                      <li>• Backend mints it for you (no gas fees!)</li>
                    </ul>
                  </div>

                  <Button
                    onClick={handleMintSBT}
                    disabled={isMinting}
                    className="w-full"
                    size="lg"
                  >
                    {isMinting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Minting SBT...
                      </>
                    ) : (
                      <>
                        <Award className="mr-2 h-4 w-4" />
                        Mint Travel SBT
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* SBT Success: Full Width Benefits Grid */}
        {hasSBT && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Your SBT Benefits & Access
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Exclusive features unlocked with your verified travel identity
                  </CardDescription>
                </div>
                <Button variant="default" size="sm" asChild>
                  <a href="/verified-posts">
                    <Shield className="mr-2 h-4 w-4" />
                    Create Verified Post
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Verified Contributions */}
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center ring-2 ring-blue-500/20">
                    <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1.5">Verified Contributions</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Cryptographically signed content
                    </p>
                  </div>
                </div>

                {/* Reputation Building */}
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center ring-2 ring-purple-500/20">
                    <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1.5">On-Chain Reputation</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Score: <span className="font-bold text-foreground">{user?.reputation_score || 0}/100</span>
                    </p>
                  </div>
                </div>

                {/* TRIP Tokens */}
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center ring-2 ring-amber-500/20">
                    <Coins className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1.5">TRIP Token Rewards</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Earn for contributions
                    </p>
                  </div>
                </div>

                {/* Women's Safety Network */}
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-pink-500/10 dark:bg-pink-500/20 flex items-center justify-center ring-2 ring-pink-500/20">
                    <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1.5">Women's Safety Network</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Verified women-only groups
                    </p>
                  </div>
                </div>

                {/* Travel Groups */}
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-500/10 dark:bg-green-500/20 flex items-center justify-center ring-2 ring-green-500/20">
                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1.5">Trusted Travel Groups</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Join verified groups (Layerz)
                    </p>
                  </div>
                </div>

                {/* Emergency Services */}
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center ring-2 ring-red-500/20">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-sm mb-1.5">Emergency Verification</h5>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Secure identity in emergencies
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Why Blockchain Identity?</p>
                <p className="text-xs text-muted-foreground">
                  Blockchain-based identity ensures immutability, transparency, and verifiability. Your Travel SBT builds trust in the community,
                  proves your contributions, and enables signature-verified posts that can't be forged. All while maintaining privacy through cryptographic hashing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
