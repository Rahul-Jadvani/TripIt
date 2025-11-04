import { Chain } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Folder, Users, Eye, Lock, Star, Settings, UserPlus, UserCheck,
  ExternalLink, Twitter, Globe, MessageCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFollowChain, useUnfollowChain } from '@/hooks/useChains';

interface ChainHeaderProps {
  chain: Chain;
  stats?: {
    total_views: number;
    total_upvotes: number;
    avg_proof_score: number;
  };
}

export function ChainHeader({ chain, stats }: ChainHeaderProps) {
  const { user } = useAuth();
  const followMutation = useFollowChain();
  const unfollowMutation = useUnfollowChain();

  const isOwner = user?.id === chain.creator_id;
  const isFollowing = chain.is_following;

  const handleFollow = () => {
    if (!user) {
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate(chain.slug);
    } else {
      followMutation.mutate(chain.slug);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
        {chain.banner_url && (
          <img
            src={chain.banner_url}
            alt={chain.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-20 md:-mt-16 px-4">
        {/* Logo */}
        <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
          {chain.logo_url ? (
            <AvatarImage src={chain.logo_url} alt={chain.name} />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
              {chain.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Info */}
        <div className="flex-1 space-y-3">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{chain.name}</h1>
            {chain.is_featured && (
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            )}
            {!chain.is_public && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Private
              </Badge>
            )}
            {chain.requires_approval && (
              <Badge variant="outline">Requires Approval</Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Folder className="h-4 w-4" />
              <span className="font-medium text-foreground">{chain.project_count}</span>
              <span>projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span className="font-medium text-foreground">{chain.follower_count}</span>
              <span>followers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium text-foreground">{chain.view_count}</span>
              <span>views</span>
            </div>
          </div>

          {/* Categories */}
          {chain.categories && chain.categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chain.categories.map((category) => (
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
                <Link to={`/chains/${chain.slug}/edit`}>
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
              {chain.requires_approval && (
                <Button asChild variant="outline">
                  <Link to={`/chains/${chain.slug}/requests`}>
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
        <p className="text-muted-foreground">{chain.description}</p>
      </div>

      {/* Social Links */}
      {chain.social_links && Object.keys(chain.social_links).length > 0 && (
        <div className="flex flex-wrap gap-2 px-4">
          {chain.social_links.website && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={chain.social_links.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" />
                Website
              </a>
            </Button>
          )}
          {chain.social_links.twitter && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={chain.social_links.twitter} target="_blank" rel="noopener noreferrer">
                <Twitter className="h-4 w-4" />
                Twitter
              </a>
            </Button>
          )}
          {chain.social_links.discord && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={chain.social_links.discord} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Discord
              </a>
            </Button>
          )}
        </div>
      )}

      {/* Creator */}
      {chain.creator && (
        <div className="px-4 text-sm text-muted-foreground">
          Created by{' '}
          <Link
            to={`/user/${chain.creator.username}`}
            className="text-foreground font-medium hover:text-primary transition-colors"
          >
            {chain.creator.username}
          </Link>
        </div>
      )}
    </div>
  );
}
