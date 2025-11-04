import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pin } from 'lucide-react';

interface ChainBadgeProps {
  chain: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    is_pinned?: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  showPin?: boolean;
}

export function ChainBadge({ chain, size = 'sm', showPin = false }: ChainBadgeProps) {
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

  return (
    <Link to={`/chains/${chain.slug}`} onClick={(e) => e.stopPropagation()}>
      <Badge
        variant="secondary"
        className={`${classes.padding} flex items-center gap-1.5 hover:bg-secondary/80 transition-colors cursor-pointer`}
      >
        {chain.logo_url ? (
          <Avatar className={classes.avatar}>
            <AvatarImage src={chain.logo_url} alt={chain.name} />
            <AvatarFallback className={classes.text}>
              {chain.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={`${classes.avatar} rounded-full bg-primary/20 flex items-center justify-center`}>
            <span className={`${classes.text} text-primary font-semibold`}>
              {chain.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <span className={`${classes.text} font-medium`}>{chain.name}</span>
        {showPin && chain.is_pinned && (
          <Pin className="h-3 w-3 text-primary" fill="currentColor" />
        )}
      </Badge>
    </Link>
  );
}
