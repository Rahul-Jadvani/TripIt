import { Award, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { StarRating, getStarRating } from './StarRating';

interface Badge {
  badge_type: string;
  rationale: string;
  awarded_by: {
    username: string;
  };
  awarded_at: string;
}

interface ValidationStatusCardProps {
  badges?: Badge[];
  className?: string;
}

// Star rating labels
const starLabels: Record<number, string> = {
  1: 'Basic',
  2: 'Good',
  3: 'Excellent',
  4: 'Outstanding',
};

const badgeColors: Record<string, string> = {
  stone: 'bg-stone-400/20 border-stone-500/50',
  silver: 'bg-gray-400/20 border-gray-400/50',
  gold: 'bg-primary border-primary text-black font-semibold',
  platinum: 'bg-purple-400/20 border-purple-500/50',
  demerit: 'bg-red-400/20 border-red-500/50',
};

const badgeScores: Record<string, number> = {
  stone: 5,
  silver: 10,
  gold: 15,
  platinum: 20,
  demerit: -10,
};

export function ValidationStatusCard({ badges = [], className = '' }: ValidationStatusCardProps) {
  const hasValidation = badges && badges.length > 0;

  // Get the highest badge if multiple exist
  const highestBadge = hasValidation
    ? badges.reduce((highest, current) => {
        const badgeOrder = { platinum: 3, gold: 2, silver: 1 };
        const currentLevel = badgeOrder[current.badge_type as keyof typeof badgeOrder] || 0;
        const highestLevel = badgeOrder[highest.badge_type as keyof typeof badgeOrder] || 0;
        return currentLevel > highestLevel ? current : highest;
      })
    : null;

  return (
    <div className={`card-elevated p-5 ${className}`}>
      <h3 className="font-black text-sm mb-3 text-foreground flex items-center gap-2">
        <Award className="h-4 w-4 text-primary" />
        Verification Status
      </h3>

      {hasValidation && highestBadge ? (
        <div className="space-y-3">
          {/* Badge Display with Stars */}
          <div
            className={`rounded-lg p-4 border-2 ${
              badgeColors[highestBadge.badge_type]
            } transition-all`}
          >
            <div className="flex items-center gap-3 mb-2">
              {highestBadge.badge_type === 'demerit' ? (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              ) : (
                <StarRating rating={getStarRating(highestBadge.badge_type)} size="lg" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {highestBadge.badge_type === 'demerit' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-black text-foreground uppercase">
                    {highestBadge.badge_type === 'demerit'
                      ? 'Warning'
                      : `${starLabels[getStarRating(highestBadge.badge_type)]} Rating`
                    }
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awarded by @{highestBadge.awarded_by?.username}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-xl font-black ${badgeScores[highestBadge.badge_type] < 0 ? 'text-red-600' : 'text-primary'}`}>
                  {badgeScores[highestBadge.badge_type] > 0 ? '+' : ''}{badgeScores[highestBadge.badge_type]}
                </div>
                <div className="text-xs text-muted-foreground">points</div>
              </div>
            </div>

            {/* Rationale */}
            {highestBadge.rationale && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Rationale:</p>
                <p className="text-sm text-foreground font-medium">
                  {highestBadge.rationale}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <div className="mt-2 text-xs text-muted-foreground">
              {new Date(highestBadge.awarded_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* All Badges if multiple */}
          {badges.length > 1 && (
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-2">All Ratings Received:</p>
              <div className="space-y-2">
                {badges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-secondary/30 rounded border border-border"
                  >
                    <div className="flex items-center gap-2">
                      {badge.badge_type === 'demerit' ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <StarRating rating={getStarRating(badge.badge_type)} size="sm" />
                      )}
                      <span className="text-xs font-bold">
                        {badge.badge_type === 'demerit'
                          ? 'Warning'
                          : starLabels[getStarRating(badge.badge_type)]
                        }
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${badge.badge_type === 'demerit' ? 'text-red-600' : 'text-primary'}`}>
                      {badgeScores[badge.badge_type] > 0 ? '+' : ''}{badgeScores[badge.badge_type]}pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Score Breakdown */}
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <span className="text-sm text-foreground font-semibold">Expert Verified</span>
              <p className="text-xs text-muted-foreground">
                Itinerary reviewed by verified user
              </p>
            </div>
            <span className="text-lg text-primary font-black">
              +{badgeScores[highestBadge.badge_type]}
            </span>
          </div>
        </div>
      ) : (
        // Pending Validation State
        <div className="space-y-3">
          <div className="rounded-lg p-4 border-2 border-primary bg-primary/20">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-primary animate-spin" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-foreground">Pending Verification</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This itinerary is awaiting review by our verified users
                </p>
              </div>
            </div>
          </div>

          {/* Info about validation */}
          <div className="p-3 bg-secondary/30 rounded border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Itineraries are reviewed by verified users who assess quality, authenticity, and
              completeness. Verified itineraries receive badges (Silver, Gold, or Platinum) that boost
              their credibility score.
            </p>
          </div>

          {/* Potential Points */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Possible Ratings:</p>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((stars) => {
                const types = Object.entries({ stone: 1, silver: 2, gold: 3, platinum: 4 });
                const [type] = types.find(([_, s]) => s === stars) || ['stone', 1];
                return (
                  <div
                    key={stars}
                    className={`p-3 rounded-lg border ${badgeColors[type]} text-center`}
                  >
                    <div className="flex justify-center mb-1">
                      <StarRating rating={stars} size="sm" />
                    </div>
                    <div className={`text-xs font-bold ${type === 'gold' ? 'text-black' : 'text-foreground'}`}>
                      {starLabels[stars]}
                    </div>
                    <div className={`text-xs font-bold ${type === 'gold' ? 'text-black' : 'text-primary'}`}>
                      +{badgeScores[type]}pts
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`p-2 rounded-lg border ${badgeColors['demerit']} text-center`}>
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs font-bold text-foreground">Warning</span>
              </div>
              <div className="text-xs font-bold text-red-600">-10pts</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
