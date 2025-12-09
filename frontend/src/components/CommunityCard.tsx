import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Community } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Map, Users, Eye, Lock, Star } from 'lucide-react';
import { communityApi } from '@/services/communityApi';

interface CommunityCardProps {
  community: Community;
}

export function CommunityCard({ community }: CommunityCardProps) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch community details on hover for instant navigation
    queryClient.prefetchQuery({
      queryKey: ['community', community.slug],
      queryFn: () => communityApi.getCommunity(community.slug),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Prefetch community itineraries
    queryClient.prefetchQuery({
      queryKey: ['communityItineraries', community.slug, { sort: 'trending', page: 1, limit: 12 }],
      queryFn: () => communityApi.getCommunityItineraries(community.slug, { sort: 'trending', page: 1, limit: 12 }),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <Link to={`/community/${community.slug}`} onMouseEnter={handleMouseEnter}>
      <Card className="card-interactive overflow-hidden relative h-full transition-all duration-300 hover:shadow-lg">
        {/* Banner */}
        {community.banner_url && (
          <div className="h-24 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
            <img
              src={community.banner_url}
              alt={community.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!community.banner_url && (
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        <div className="p-5 space-y-3">
          {/* Header with logo and title */}
          <div className="flex items-start gap-3 -mt-8">
            <Avatar className="h-16 w-16 border-4 border-background">
              {community.logo_url ? (
                <AvatarImage src={community.logo_url} alt={community.name} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {community.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 mt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                  {community.name}
                </h3>
                {community.is_featured && (
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                )}
                {!community.is_public && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {community.description}
          </p>

          {/* Categories */}
          {community.categories && community.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {community.categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {community.categories.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{community.categories.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Map className="h-3.5 w-3.5" />
              <span>{community.itinerary_count || community.project_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{community.follower_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{community.view_count}</span>
            </div>
          </div>

          {/* Creator */}
          {community.creator && (
            <div className="text-xs text-muted-foreground">
              by <span className="text-foreground font-medium">{community.creator.username}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
