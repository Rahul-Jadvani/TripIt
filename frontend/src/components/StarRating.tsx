import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number; // 0-5 stars
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StarRating({
  rating,
  size = 'md',
  showCount = false,
  count = 0,
  interactive = false,
  onRate,
  className = ''
}: StarRatingProps) {
  const stars = Math.min(Math.max(Math.round(rating), 0), 5); // Clamp between 0-5
  const sizeClass = sizeClasses[size];

  const handleClick = (starValue: number) => {
    if (interactive && onRate) {
      onRate(starValue);
    }
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= stars;

        return (
          <Star
            key={index}
            className={cn(
              sizeClass,
              'transition-colors',
              isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300',
              interactive && 'cursor-pointer hover:text-yellow-400 hover:fill-yellow-400'
            )}
            onClick={() => handleClick(starValue)}
          />
        );
      })}
      {showCount && (
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          ({count} {count === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  );
}

// Badge type to star rating mapper (5-star system)
export const badgeToStars: Record<string, number> = {
  stone: 2,
  silver: 3,
  gold: 4,
  platinum: 5,
  demerit: 0, // Special case - will show warning instead
};

// Get star rating from badge type
export function getStarRating(badgeType: string): number {
  return badgeToStars[badgeType] ?? 0;
}

// Convert star rating to badge type for backend
export function starsToBadgeType(stars: number): string {
  if (stars <= 2) return 'stone';
  if (stars === 3) return 'silver';
  if (stars === 4) return 'gold';
  return 'platinum'; // 5 stars
}

// Rating Display Component
interface RatingDisplayProps {
  rating: number;
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingDisplay({ rating, count, size = 'md' }: RatingDisplayProps) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-[8px] bg-secondary border-2 border-black">
          <span className="text-xs font-bold">⚠️ Not rated</span>
        </div>
        <span className="text-xs text-muted-foreground">0 ratings</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <StarRating rating={rating} size={size} />
      <span className="text-xs text-muted-foreground">
        {count} {count === 1 ? 'rating' : 'ratings'}
      </span>
    </div>
  );
}
