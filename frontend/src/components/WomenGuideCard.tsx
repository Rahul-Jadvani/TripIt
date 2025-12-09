import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Languages, Award, DollarSign, Clock } from 'lucide-react';
import { WomenGuide } from '@/types';

interface WomenGuideCardProps {
  guide: WomenGuide;
  onBook?: (guideId: string) => void;
}

export function WomenGuideCard({ guide, onBook }: WomenGuideCardProps) {
  const getVerificationColor = (level?: string) => {
    switch (level) {
      case 'platinum':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'gold':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      case 'silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 'bronze':
        return 'bg-gradient-to-r from-orange-600 to-orange-700 text-white';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const getVerificationIcon = (level?: string) => {
    switch (level) {
      case 'platinum':
        return '💎';
      case 'gold':
        return '👑';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return '';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              rating >= star ? 'fill-primary text-primary' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  const statusColors = {
    available: 'bg-green-500/20 text-green-600 border-green-500/30',
    unavailable: 'bg-red-500/20 text-red-600 border-red-500/30',
    on_leave: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  };

  return (
    <Card className="card-interactive overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <Link to={`/women-safety/guides/${guide.id}`} className="block">
        {/* Header with Avatar and Verification */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage
                src={guide.traveler?.avatar || guide.traveler?.avatar_url}
                alt={guide.traveler?.username || 'Guide'}
              />
              <AvatarFallback className="text-lg font-bold bg-primary/10">
                {guide.traveler?.username?.slice(0, 2).toUpperCase() || 'GD'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {guide.traveler?.displayName || guide.traveler?.username || 'Anonymous Guide'}
                </h3>
                {guide.is_verified && (
                  <Badge
                    className={`text-xs px-2 py-0.5 flex items-center gap-1 ${getVerificationColor(
                      guide.verification_level
                    )}`}
                  >
                    {getVerificationIcon(guide.verification_level)}
                    {guide.verification_level?.toUpperCase() || 'VERIFIED'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{guide.years_of_experience}y exp</span>
                </div>
                <div className="flex items-center gap-1">
                  <Languages className="h-3.5 w-3.5" />
                  <span>{guide.languages_spoken.length} languages</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                {renderStars(guide.average_rating)}
                <span className="text-sm font-semibold text-foreground">
                  {guide.average_rating.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({guide.total_reviews} reviews)
                </span>
              </div>
            </div>

            {/* Availability Status */}
            <Badge
              className={`text-xs px-2 py-1 border ${
                statusColors[guide.availability_status]
              }`}
            >
              {guide.availability_status === 'available'
                ? 'Available'
                : guide.availability_status === 'on_leave'
                ? 'On Leave'
                : 'Unavailable'}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 pt-4 space-y-4">
          {/* Specializations */}
          {guide.specializations && guide.specializations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                <span>Specializations</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {guide.specializations.slice(0, 4).map((spec, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs bg-secondary/50 hover:bg-secondary"
                  >
                    {spec}
                  </Badge>
                ))}
                {guide.specializations.length > 4 && (
                  <Badge variant="secondary" className="text-xs bg-secondary/50">
                    +{guide.specializations.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Service Locations */}
          {guide.service_locations && guide.service_locations.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-muted-foreground truncate">
                {guide.service_locations.slice(0, 2).join(', ')}
                {guide.service_locations.length > 2 &&
                  ` +${guide.service_locations.length - 2} more`}
              </span>
            </div>
          )}

          {/* Stats Row */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-foreground">
                {guide.women_travelers_guided}
              </div>
              <div className="text-xs text-muted-foreground">Women Guided</div>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-foreground">
                {guide.successful_trips_count}
              </div>
              <div className="text-xs text-muted-foreground">Successful Trips</div>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div className="flex-1 text-center">
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4" />
                {guide.hourly_rate_usd || 0}
              </div>
              <div className="text-xs text-muted-foreground">/hour</div>
            </div>
          </div>
        </div>
      </Link>

      {/* Footer - Book Button */}
      <div className="px-6 pb-6">
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBook?.(guide.id);
          }}
          className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
          disabled={guide.availability_status !== 'available'}
        >
          {guide.availability_status === 'available' ? 'Book Now' : 'Unavailable'}
        </Button>
      </div>
    </Card>
  );
}
