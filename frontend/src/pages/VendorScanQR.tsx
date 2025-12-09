/**
 * VendorScanQR - QR code scanning page for vendor verification
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Camera,
  CameraOff,
  QrCode,
  CheckCircle,
  AlertCircle,
  Phone,
  Droplets,
  RefreshCw,
  ArrowLeft,
  Keyboard,
  ScanLine,
  User,
  Shield,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyUserToken, UserVerificationData } from '@/services/vendorApi';

type ScanMode = 'camera' | 'manual';
type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export default function VendorScanQR() {
  const [mode, setMode] = useState<ScanMode>('manual'); // Default to manual since camera requires library
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [manualToken, setManualToken] = useState('');
  const [verificationResult, setVerificationResult] = useState<UserVerificationData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [html5QrCode, setHtml5QrCode] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Initialize QR scanner library
  useEffect(() => {
    let scanner: any = null;

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('qr-reader');
        setHtml5QrCode(scanner);
      } catch (error) {
        console.error('Failed to load QR scanner:', error);
        setCameraError('QR scanner library not available. Use manual entry instead.');
      }
    };

    initScanner();

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, []);

  // Start camera scanning
  const startCamera = async () => {
    if (!html5QrCode) {
      setCameraError('Scanner not initialized. Please use manual entry.');
      return;
    }

    try {
      setCameraError(null);
      setIsCameraActive(true);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          handleQrScanned(decodedText);
        },
        (errorMessage: string) => {
          // Ignore scan errors (no QR found in frame)
        }
      );
    } catch (error: any) {
      setIsCameraActive(false);
      setCameraError(error.message || 'Failed to start camera. Please grant camera permissions.');
      toast.error('Camera access denied. Please use manual entry.');
    }
  };

  // Stop camera scanning
  const stopCamera = async () => {
    if (html5QrCode && html5QrCode.isScanning) {
      try {
        await html5QrCode.stop();
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
    setIsCameraActive(false);
  };

  // Handle QR code scanned
  const handleQrScanned = async (decodedText: string) => {
    // Stop scanning while processing
    await stopCamera();

    try {
      // Parse QR data (expected JSON format)
      const qrData = JSON.parse(decodedText);

      if (qrData.type !== 'tripit_sbt_verification') {
        setErrorMessage('Invalid QR code. This is not a TripIt SBT verification QR.');
        setScanState('error');
        return;
      }

      // Verify the token
      await verifyToken(qrData.token);
    } catch (error) {
      // If not JSON, try as raw token
      if (decodedText.length === 64 && /^[a-f0-9]+$/i.test(decodedText)) {
        await verifyToken(decodedText);
      } else {
        setErrorMessage('Invalid QR code format.');
        setScanState('error');
      }
    }
  };

  // Verify token with backend
  const verifyToken = async (token: string) => {
    setIsLoading(true);
    setScanState('scanning');
    setErrorMessage('');

    try {
      const result = await verifyUserToken(token);
      setVerificationResult(result);
      setScanState('success');
      toast.success('Verification successful!');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Verification failed';
      setErrorMessage(message);
      setScanState('error');
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual token verification
  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = manualToken.trim();

    // Validate format
    if (token.length !== 64) {
      setErrorMessage('Token must be exactly 64 characters');
      setScanState('error');
      return;
    }

    if (!/^[a-f0-9]+$/i.test(token)) {
      setErrorMessage('Token must be hexadecimal (0-9, a-f)');
      setScanState('error');
      return;
    }

    await verifyToken(token);
  };

  // Reset state for new scan
  const resetScan = () => {
    setScanState('idle');
    setVerificationResult(null);
    setErrorMessage('');
    setManualToken('');
  };

  // Render verification result card
  const renderResult = () => {
    if (!verificationResult) return null;

    return (
      <div className="card-elevated p-6 border-2 border-green-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-green-500">Verified</h3>
            <p className="text-sm text-muted-foreground">
              Scan #{verificationResult.scan_count}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* User Name */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <User className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-semibold text-lg">
                {verificationResult.full_name || 'Not provided'}
              </p>
            </div>
          </div>

          {/* SBT Token ID */}
          {verificationResult.sbt_token_id && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">SBT Token ID</p>
                <p className="font-mono text-sm">#{verificationResult.sbt_token_id}</p>
              </div>
            </div>
          )}

          {/* Blood Group */}
          {verificationResult.blood_group && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10">
              <Droplets className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Blood Group</p>
                <p className="font-bold text-xl text-red-500">
                  {verificationResult.blood_group}
                </p>
              </div>
            </div>
          )}

          {/* Emergency Contacts */}
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              Emergency Contacts
            </h4>

            {verificationResult.emergency_contact_1_name ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">
                      {verificationResult.emergency_contact_1_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Primary Contact</p>
                  </div>
                  {verificationResult.emergency_contact_1_phone && (
                    <a
                      href={`tel:${verificationResult.emergency_contact_1_phone}`}
                      className="btn-primary text-sm px-4"
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </a>
                  )}
                </div>

                {verificationResult.emergency_contact_2_name && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">
                        {verificationResult.emergency_contact_2_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Secondary Contact
                      </p>
                    </div>
                    {verificationResult.emergency_contact_2_phone && (
                      <a
                        href={`tel:${verificationResult.emergency_contact_2_phone}`}
                        className="btn-secondary text-sm px-4"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No emergency contacts provided
              </p>
            )}
          </div>
        </div>

        <button
          onClick={resetScan}
          className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Scan Another QR Code
        </button>
      </div>
    );
  };

  // Render error state
  const renderError = () => (
    <div className="card-elevated p-6 border-2 border-red-500">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-red-500">Verification Failed</h3>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </div>

      <button
        onClick={resetScan}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="h-10 w-10 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-foreground">Scan SBT QR</h1>
            <p className="text-sm text-muted-foreground">
              Verify traveler identity
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          {/* Show result or error if applicable */}
          {scanState === 'success' && renderResult()}
          {scanState === 'error' && renderError()}

          {/* Show scanner if idle or scanning */}
          {(scanState === 'idle' || scanState === 'scanning') && (
            <>
              {/* Mode Tabs */}
              <div className="flex rounded-lg border border-border p-1 mb-6">
                <button
                  onClick={() => {
                    setMode('camera');
                    stopCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === 'camera'
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  Camera
                </button>
                <button
                  onClick={() => {
                    setMode('manual');
                    stopCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    mode === 'manual'
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Keyboard className="h-4 w-4" />
                  Manual Entry
                </button>
              </div>

              {/* Camera Mode */}
              {mode === 'camera' && (
                <div className="card-elevated p-4">
                  {cameraError ? (
                    <div className="text-center py-8">
                      <CameraOff className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        {cameraError}
                      </p>
                      <button
                        onClick={() => setMode('manual')}
                        className="btn-secondary text-sm"
                      >
                        Use Manual Entry
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        id="qr-reader"
                        ref={scannerRef}
                        className="w-full aspect-square rounded-lg overflow-hidden bg-black mb-4"
                      />

                      {!isCameraActive ? (
                        <button
                          onClick={startCamera}
                          className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Start Camera
                        </button>
                      ) : (
                        <button
                          onClick={stopCamera}
                          className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                          <CameraOff className="h-4 w-4" />
                          Stop Camera
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Manual Entry Mode */}
              {mode === 'manual' && (
                <form onSubmit={handleManualVerify} className="card-elevated p-4">
                  <div className="text-center mb-6">
                    <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <QrCode className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-bold">Enter Verification Token</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the 64-character token from the QR code
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <Label htmlFor="token">Verification Token</Label>
                    <Input
                      id="token"
                      type="text"
                      placeholder="Enter 64-character token..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value.toLowerCase())}
                      className="font-mono text-sm"
                      maxLength={64}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {manualToken.length}/64 characters
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                    disabled={isLoading || manualToken.length !== 64}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-4 w-4" />
                        Verify Token
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
