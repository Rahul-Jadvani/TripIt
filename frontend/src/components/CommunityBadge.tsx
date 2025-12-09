import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin } from 'lucide-react';

interface CommunityBadgeProps {
  community: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    is_pinned?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  showPin?: boolean;
}

export function CommunityBadge({ community, size = 'sm', showPin = false }: CommunityBadgeProps) {
  const navigate = useNavigate();

  const sizeClasses = {
    sm: {
      avatar: 'h-4 w-4',
      text: 'text-xs',
      padding: 'px-2 py-0.5',
    },
    md: {
      avatar: 'h-5 w-5',
      text: 'text-sm',
      padding: 'px-2.5 py-1',
    },
    lg: {
      avatar: 'h-6 w-6',
      text: 'text-base',
      padding: 'px-3 py-1.5',
    },
  };

  const classes = sizeClasses[size];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Navigate programmatically to avoid nested Link issue (no full page refresh)
    navigate(`/communities/${community.slug}`);
  };

  return (
    <Badge
      variant="secondary"
      className={`${classes.padding} flex items-center gap-1.5 hover:bg-secondary/80 transition-colors cursor-pointer`}
      onClick={handleClick}
    >
      {community.logo_url ? (
        <Avatar className={classes.avatar}>
          <AvatarImage src={community.logo_url} alt={community.name} />
          <AvatarFallback className={classes.text}>
            {community.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className={`${classes.avatar} rounded-full bg-primary/20 flex items-center justify-center`}>
          <span className={`${classes.text} text-primary font-semibold`}>
            {community.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <span className={`${classes.text} font-medium`}>{community.name}</span>
      {showPin && community.is_pinned && (
        <Pin className="h-3 w-3 text-primary" fill="currentColor" />
      )}
    </Badge>
  );
}
