import { Community } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin, Users, Eye, Lock, Star, Settings, UserPlus, UserCheck,
  ExternalLink, Twitter, Globe, MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFollowCommunity, useUnfollowCommunity } from '@/hooks/useCommunities';

interface CommunityHeaderProps {
  community: Community;
  stats?: {
    total_views: number;
    total_upvotes: number;
    avg_trust_score: number;
  };
}

export function CommunityHeader({ community, stats }: CommunityHeaderProps) {
  const { user } = useAuth();
  const followMutation = useFollowCommunity();
  const unfollowMutation = useUnfollowCommunity();

  const isOwner = user?.id === community.creator_id;
  const isFollowing = community.is_following;

  const handleFollow = () => {
    if (!user) {
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate(community.slug);
    } else {
      followMutation.mutate(community.slug);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
        {community.banner_url && (
          <img
            src={community.banner_url}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-20 md:-mt-16 px-4">
        {/* Logo */}
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          {community.logo_url ? (
            <AvatarImage src={community.logo_url} alt={community.name} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {community.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Info */}
        <div className="flex-1 space-y-3">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{community.name}</h1>
            {community.is_featured && (
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            )}
            {!community.is_public && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            {community.requires_approval && (
              <Badge variant="outline">Requires Approval</Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="font-medium text-foreground">{community.project_count || community.itinerary_count || 0}</span>
              <span>itineraries</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{community.follower_count}</span>
              <span>followers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium text-foreground">{community.view_count}</span>
              <span>views</span>
            </div>
          </div>

          {/* Categories */}
          {community.categories && community.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {community.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {user && !isOwner && (
            <Button
              onClick={handleFollow}
              variant={isFollowing ? 'outline' : 'default'}
              className="gap-2"
              disabled={followMutation.isPending || unfollowMutation.isPending}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Follow
                </>
              )}
            </Button>
          )}
          {isOwner && (
            <>
              <Button asChild variant="outline" className="gap-2">
                <Link to={`/communities/${community.slug}/edit`}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
              {community.requires_approval && (
                <Button asChild variant="outline">
                  <Link to={`/communities/${community.slug}/requests`}>
                    Requests
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-4">
        <p className="text-muted-foreground">{community.description}</p>
      </div>

      {/* Social Links */}
      {community.social_links && Object.keys(community.social_links).length > 0 && (
        <div className="flex flex-wrap gap-2 px-4">
          {community.social_links.website && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={community.social_links.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
                Website
              </a>
            </Button>
          )}
          {community.social_links.twitter && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={community.social_links.twitter} target="_blank" rel="noopener noreferrer">
                <Twitter className="h-4 w-4" />
                Twitter
              </a>
            </Button>
          )}
          {community.social_links.discord && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={community.social_links.discord} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Discord
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Creator */}
      {community.creator && (
        <div className="px-4 text-sm text-muted-foreground">
          Created by{' '}
          <Link
            to={`/user/${community.creator.username}`}
            className="text-foreground font-medium hover:text-primary transition-colors"
          >
            {community.creator.username}
          </Link>
        </div>
      )}
    </div>
  );
}
