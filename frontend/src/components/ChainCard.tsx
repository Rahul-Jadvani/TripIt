import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Chain } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Folder, Users, Eye, Lock, Star } from 'lucide-react';
import { chainApi } from '@/services/chainApi';

interface ChainCardProps {
  chain: Chain;
}

export function ChainCard({ chain }: ChainCardProps) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch chain details on hover for instant navigation
    queryClient.prefetchQuery({
      queryKey: ['chain', chain.slug],
      queryFn: () => chainApi.getChain(chain.slug),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Prefetch chain projects
    queryClient.prefetchQuery({
      queryKey: ['chainProjects', chain.slug, { sort: 'trending', page: 1, limit: 12 }],
      queryFn: () => chainApi.getChainProjects(chain.slug, { sort: 'trending', page: 1, limit: 12 }),
      staleTime: 1000 * 60 * 5,
    });
  };

  return (
    <Link to={`/layerz/${chain.slug}`} onMouseEnter={handleMouseEnter}>
      <Card className="card-interactive overflow-hidden relative h-full transition-all duration-300 hover:shadow-lg">
        {/* Banner */}
        {chain.banner_url && (
          <div className="h-24 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
            <img
              src={chain.banner_url}
              alt={chain.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {!chain.banner_url && (
          <div className="h-24 w-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        <div className="p-5 space-y-3">
          {/* Header with logo and title */}
          <div className="flex items-start gap-3 -mt-8">
            <Avatar className="h-16 w-16 border-4 border-background">
              {chain.logo_url ? (
                <AvatarImage src={chain.logo_url} alt={chain.name} />
              ) : (
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {chain.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>

            <div className="flex-1 mt-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                  {chain.name}
                </h3>
                {chain.is_featured && (
                  <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                )}
                {!chain.is_public && (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {chain.description}
          </p>

          {/* Categories */}
          {chain.categories && chain.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {chain.categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {chain.categories.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{chain.categories.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Folder className="h-3.5 w-3.5" />
              <span>{chain.project_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{chain.follower_count}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{chain.view_count}</span>
            </div>
          </div>

          {/* Creator */}
          {chain.creator && (
            <div className="text-xs text-muted-foreground">
              by <span className="text-foreground font-medium">{chain.creator.username}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
