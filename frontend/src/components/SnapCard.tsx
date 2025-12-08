import React, { useState, useEffect, useRef } from "react";
import { MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ------------------------------------------------
// PERFECT NON-FLICKER LAZY IMAGE LOADER (NO FALLBACK)
// ------------------------------------------------

const imageCache = new Map<string, string>();

const LazyImage = ({
  src,
  alt,
  className,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  [key: string]: any;
}) => {
  const ref = useRef<HTMLImageElement>(null);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!src) return;

    if (imageCache.has(src)) {
      setFinalSrc(src);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.01, rootMargin: "200px" }
    );

    if (ref.current) observer.observe(ref.current);

    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    if (!isVisible || !src) return;

    const img = new Image();
    img.src = src;

    img.onload = () => {
      imageCache.set(src, src);
      setFinalSrc(src);
    };

    // If image fails → do NOT show anything
    img.onerror = () => setFinalSrc(null);
  }, [isVisible, src]);

  // If image failed or src invalid → render nothing
  if (!finalSrc) {
    return <div ref={ref} className={className} {...props} />;
  }

  return (
    <img
      ref={ref}
      src={finalSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

// ------------------------------------------------
// SNAP CARD COMPONENT
// ------------------------------------------------

interface Snap {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  latitude: number;
  longitude: number;
  location_name: string;
  city: string;
  country: string;
  view_count: number;
  like_count: number;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface SnapCardProps {
  snap: Snap;
}

const SnapCard: React.FC<SnapCardProps> = ({ snap }) => {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const hasImage = !!snap.image_url;

  const imageUrl =
    hasImage && snap.image_url.startsWith("http")
      ? snap.image_url
      : hasImage
      ? `${API}${snap.image_url}`
      : "";

  const hasValidImage = Boolean(imageUrl);

  const timeAgo = formatDistanceToNow(new Date(snap.created_at), {
    addSuffix: true,
  });

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl overflow-hidden border-2 border-orange-500/20 h-full flex flex-col">
      {/* CREATOR HEADER */}
      {snap.creator && (
        <div className="p-4 flex items-center gap-3 border-b border-orange-500/10">
          <LazyImage
            src={snap.creator.avatar_url || ""}
            alt={snap.creator.display_name || ""}
            className="w-10 h-10 rounded-full object-cover border-2 border-orange-500/30"
          />

          <div className="flex-1">
            <div className="font-semibold text-white">
              {snap.creator.display_name}
            </div>
            <div className="text-sm text-gray-400">@{snap.creator.username}</div>
          </div>

          <div className="text-xs text-orange-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </div>
        </div>
      )}

      {/* MAIN IMAGE — ONLY if exists */}
      {hasValidImage && (
        <div className="relative flex-1 bg-black min-h-0">
          <LazyImage
            src={imageUrl}
            alt={snap.caption || ""}
            className="w-full h-full object-cover"
          />

          {/* LOCATION OVERLAY */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4">
            <div className="flex items-start gap-2 text-white">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-500" />
              <div>
                <div className="font-bold text-orange-500">
                  {snap.city || "Unknown"}
                </div>
                <div className="text-sm text-gray-300 line-clamp-1">
                  {snap.location_name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAPTION */}
      {snap.caption && (
        <div className="p-4">
          <p className="text-gray-200 text-sm line-clamp-2">{snap.caption}</p>
        </div>
      )}
    </div>
  );
};

export default SnapCard;
