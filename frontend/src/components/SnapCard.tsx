import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const imageUrl = snap.image_url.startsWith('http')
    ? snap.image_url
    : `${API_BASE_URL}${snap.image_url}`;

  const timeAgo = formatDistanceToNow(new Date(snap.created_at), { addSuffix: true });

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl overflow-hidden border-2 border-orange-500/20">
      {/* Creator Header */}
      {snap.creator && (
        <div className="p-4 flex items-center gap-3 border-b border-orange-500/10">
          <img
            src={snap.creator.avatar_url || '/default-avatar.png'}
            alt={snap.creator.display_name}
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

      {/* Image */}
      <div className="relative aspect-square bg-black">
        <img
          src={imageUrl}
          alt={snap.caption || 'Snap'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-image.png';
          }}
        />

        {/* Location Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
          <div className="flex items-start gap-2 text-white">
            <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-orange-500" />
            <div>
              <div className="font-bold text-orange-500">{snap.city || 'Unknown'}</div>
              <div className="text-sm text-gray-300 line-clamp-1">
                {snap.location_name}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      {snap.caption && (
        <div className="p-4">
          <p className="text-gray-200">{snap.caption}</p>
        </div>
      )}
    </div>
  );
};

export default SnapCard;
