import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Smartphone, Monitor } from 'lucide-react';

export default function SOS() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect if user is on mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    };
    setIsMobile(checkMobile());
  }, []);

  const handleSOSClick = () => {
    // Deep link to TripIt-SOS Android app
    const deepLinkUrl = 'tripitsos://open';
    const intentUrl = 'intent://open#Intent;scheme=tripitsos;package=com.bitchat.android;end';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.bitchat.android';

    // Use intent URL for better Android compatibility
    const urlToOpen = isMobile ? intentUrl : deepLinkUrl;

    // Try to open the app
    window.location.href = urlToOpen;

    // Fallback after 2 seconds if app didn't open
    setTimeout(() => {
      if (isMobile && confirm('TripIt-SOS app not found. Would you like to install it from Play Store?')) {
        window.location.href = playStoreUrl;
      }
    }, 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-[80vh] flex items-center justify-center">
      <Card className="max-w-md w-full p-8 space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-16 w-16 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Emergency SOS</h1>
          <p className="text-muted-foreground">
            Press the button below to launch the TripIt-SOS emergency application
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleSOSClick}
            size="lg"
            className="w-full h-24 text-2xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg"
          >
            <AlertTriangle className="h-8 w-8 mr-3" />
            SOS
          </Button>

          {isMobile && (
            <div className="flex items-center gap-2 text-sm text-green-500 justify-center">
              <Smartphone className="h-4 w-4" />
              <span>Mobile device detected</span>
            </div>
          )}
        </div>

        <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold">⚡ This page works offline</p>
          <p>
            The SOS button will launch the TripIt-SOS emergency application
            on your device (works offline)
          </p>
        </div>

        <div className="pt-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-semibold">Standard Emergency Numbers:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>USA: 911</div>
            <div>Europe: 112</div>
            <div>UK: 999</div>
            <div>India: 112</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
