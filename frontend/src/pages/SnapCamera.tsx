import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, X, Send, Loader2, MapPin, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName: string;
  city: string;
  country: string;
}

const SnapCamera: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [geolocation, setGeolocation] = useState<GeolocationData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    getGeolocation();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please grant camera permissions.');
      toast.error('Unable to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const getGeolocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Reverse geocode using OpenStreetMap Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();

        setGeolocation({
          latitude,
          longitude,
          accuracy: accuracy || 0,
          locationName: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          city: data.address?.city || data.address?.town || data.address?.village || '',
          country: data.address?.country || ''
        });
        toast.success('Location captured!');
      } catch (geocodeError) {
        setGeolocation({
          latitude,
          longitude,
          accuracy: accuracy || 0,
          locationName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          city: '',
          country: ''
        });
        toast.success('GPS location captured!');
      }
    } catch (err) {
      console.error('Error getting location:', err);
      setError('Unable to get your location. Please enable location services.');
      toast.error('Unable to get your location. Please enable location services.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready');
      return;
    }

    if (!geolocation) {
      toast.error('Waiting for location...');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(imageData);
      stopCamera();
      toast.success('Photo captured!');
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCaption('');
    setError(null);
    startCamera();
  };

  const publishSnap = async () => {
    if (!capturedImage || !geolocation) {
      toast.error('Missing photo or location data');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, `snap-${Date.now()}.jpg`);
      formData.append('caption', caption);
      formData.append('latitude', geolocation.latitude.toString());
      formData.append('longitude', geolocation.longitude.toString());
      formData.append('location_name', geolocation.locationName);
      formData.append('city', geolocation.city);
      formData.append('country', geolocation.country);
      formData.append('location_accuracy', geolocation.accuracy.toString());

      await api.post('/snaps', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Invalidate snaps cache to fetch fresh data with correct timestamps
      queryClient.invalidateQueries({ queryKey: ['snaps'] });

      toast.success('Snap published!');
      navigate('/feed');
    } catch (err: any) {
      console.error('Error uploading snap:', err);
      const errorMsg = err.response?.data?.message || 'Failed to publish snap';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  // Camera View (Before Capture)
  if (!capturedImage) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/feed')}
              className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-orange-500/80 transition-colors border-2 border-white/30"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-white text-xl font-bold">Create Snap</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Camera Preview */}
        <div className="flex-1 relative bg-gray-900">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover relative z-0"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Location Status */}
          {isLoadingLocation && (
            <div className="absolute top-20 left-4 right-4 z-40 bg-black/60 backdrop-blur-md rounded-lg p-4 text-white">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Getting your location...</span>
              </div>
            </div>
          )}

          {geolocation && !isLoadingLocation && (
            <div className="absolute top-20 left-4 right-4 z-40 bg-gradient-to-r from-orange-500 to-orange-600 backdrop-blur-md rounded-lg p-4 text-white shadow-lg border-2 border-white/20">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold">{geolocation.city || 'Location Captured'}</div>
                  <div className="text-sm opacity-95 line-clamp-1">{geolocation.locationName}</div>
                  <div className="text-xs opacity-90 mt-1">Accuracy: ±{Math.round(geolocation.accuracy)}m</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-20 left-4 right-4 z-40 bg-red-500/90 backdrop-blur-md rounded-lg p-4 text-white">
              <div className="text-sm">{error}</div>
            </div>
          )}
        </div>

        {/* Capture Button - Fixed positioning */}
        <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={capturePhoto}
              disabled={!stream || !geolocation || isLoadingLocation}
              className="relative w-20 h-20 rounded-full border-4 border-white shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </button>
            <p className="text-white text-sm font-semibold drop-shadow-lg">
              {!geolocation ? 'Waiting for location...' : 'Tap to capture'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Preview & Publish View (After Capture)
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black shadow-lg p-4 border-b-2 border-orange-500/20">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <button
            onClick={retakePhoto}
            className="flex items-center gap-2 px-4 py-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors font-semibold border-2 border-orange-500/30 hover:border-orange-500"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Retake</span>
          </button>
          <h1 className="text-lg font-bold text-white">Preview Snap</h1>
          <div className="w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-black">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Image Preview */}
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden border-2 border-orange-500/20">
            <img
              src={capturedImage}
              alt="Captured snap"
              className="w-full aspect-square object-cover"
            />
          </div>

          {/* Geolocation Info */}
          {geolocation && (
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl p-6 border-2 border-orange-500/30">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg mb-1">
                    {geolocation.city || 'Location'}
                  </h3>
                  <p className="text-gray-300 text-sm mb-2">{geolocation.locationName}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>📍 {geolocation.latitude.toFixed(6)}, {geolocation.longitude.toFixed(6)}</span>
                    <span>±{Math.round(geolocation.accuracy)}m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Caption Input */}
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl p-6 border-2 border-orange-500/30">
            <label className="block text-sm font-semibold text-orange-500 mb-3">
              Add a caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's happening?"
              className="w-full px-4 py-3 bg-black border-2 border-orange-500/40 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none text-white placeholder-gray-500 transition-all"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-2">
              {caption.length}/500 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border-2 border-red-500/50 rounded-lg p-4 text-red-300 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          {/* Publish Button */}
          <button
            onClick={publishSnap}
            disabled={isUploading || !geolocation}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl px-6 py-4 font-bold text-lg hover:from-orange-600 hover:to-orange-700 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-2xl border-2 border-orange-400/30"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                Publish Snap
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnapCamera;
