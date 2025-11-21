import { useBadges } from '@/hooks/useBadges';
import { Award, Shield, Star, Gem, Clock } from 'lucide-react';
import { format } from '@/utils/date';

interface ProjectBadgesProps {
  projectId: string;
}

const BADGE_CONFIG = {
  stone: {
    icon: Shield,
    label: 'Stone',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    emoji: '🪨',
    points: 5,
  },
  silver: {
    icon: Award,
    label: 'Silver',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/30',
    emoji: '🥈',
    points: 10,
  },
  gold: {
    icon: Star,
    label: 'Gold',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    emoji: '🥇',
    points: 15,
  },
  platinum: {
    icon: Gem,
    label: 'Platinum',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    emoji: '💎',
    points: 20,
  },
  demerit: {
    icon: Award,
    label: 'Demerit',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    emoji: '⚠️',
    points: -10,
  },
};

export function ProjectBadges({ projectId }: ProjectBadgesProps) {
  const { data: badgesResponse, isLoading } = useBadges(projectId);

  if (isLoading) {
    return (
      <div className="card-elevated p-4 animate-pulse">
        <div className="h-6 w-32 bg-secondary rounded mb-3"></div>
        <div className="h-16 bg-secondary rounded"></div>
      </div>
    );
  }

  // Safely extract badges array from response
  // Response structure: axios wraps backend response, so it's response.data.data
  const badges = Array.isArray(badgesResponse?.data?.data) ? badgesResponse.data.data : [];

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="card-elevated p-4">
      <h3 className="font-black text-sm mb-3 text-foreground flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        Validation Badges
      </h3>

      <div className="space-y-3">
        {badges.map((badge: any) => {
          const config = BADGE_CONFIG[badge.badge_type as keyof typeof BADGE_CONFIG] || BADGE_CONFIG.silver;
          const Icon = config.icon;

          return (
            <div
              key={badge.id}
              className={`p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor} transition-smooth`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-black text-sm ${config.color}`}>
                      {config.label} Badge
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({config.points > 0 ? '+' : ''}{config.points} pts)
                    </span>
                  </div>

                  {(() => {
                    const awardedBy = badge.validator?.displayName || badge.validator?.email;
                    if (!awardedBy) return null;
                    return (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>Awarded by</span>
                        <span className="font-bold text-foreground">{awardedBy}</span>
                      </div>
                    );
                  })()}

                  {badge.createdAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(badge.createdAt), 'MMM d, yyyy')}
                    </div>
                  )}

                  {badge.rationale && (
                    <div className="mt-2 p-2 bg-secondary/50 rounded text-xs text-foreground">
                      <strong className="text-muted-foreground">Rationale:</strong>{' '}
                      {badge.rationale}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
