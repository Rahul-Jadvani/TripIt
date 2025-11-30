import { useEffect, useState } from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { safetyRatingsService } from '@/services/api';
import { toast } from 'sonner';

interface SafetyRatingWidgetProps {
  itineraryId: string;
  averageScore?: number;
  ratingCount?: number;
  userRating?: number | null;
  onRatingChange?: (rating: number) => void;
  itineraryOwnerId?: string;
}

export function SafetyRatingWidget({
  itineraryId,
  averageScore = 0,
  ratingCount = 0,
  userRating = null,
  onRatingChange,
  itineraryOwnerId,
}: SafetyRatingWidgetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [localRating, setLocalRating] = useState<number | null>(userRating);

  useEffect(() => setLocalRating(userRating), [userRating]);

  const rateMutation = useMutation({
    mutationFn: (score: number) =>
      safetyRatingsService.addRating(itineraryId, {
        overall_safety_score: score,
        rating_type: 'overall',
      }),
    onSuccess: (_res, score) => {
      toast.success('\''Safety rating submitted'\'');
      setLocalRating(score);
      onRatingChange?.(score);
      queryClient.invalidateQueries({ queryKey: ['\''itinerary'\'', itineraryId] });
      queryClient.invalidateQueries({ queryKey: ['\''itineraries'\''] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '\''Unable to submit rating'\'');
    },
  });

  const handleRate = (value: number) => {
    if (!user) {
      navigate('\''/login'\'');
      return;
    }
    if (itineraryOwnerId && user.id === itineraryOwnerId) {
      toast.info('\''You can'\'''\''t rate your own itinerary'\'');
      return;
    }
    rateMutation.mutate(value);
  };

  const displayScore = hoverValue ?? localRating ?? averageScore;
  const disabled = rateMutation.isPending || (itineraryOwnerId && user?.id === itineraryOwnerId);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-2.5 backdrop-blur-sm itinerary-safety-rating">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onMouseEnter={() => setHoverValue(value)}
            onMouseLeave={() => setHoverValue(null)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRate(value);
            }}
            disabled={disabled}
            className="h-8 w-8 rounded-md flex items-center justify-center transition-transform duration-150 hover:scale-105 disabled:opacity-60"
            title={}
          >
            <Star
              className={}
            />
          </button>
        ))}
      </div>

      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>{displayScore ? displayScore.toFixed(1) : '\''Not rated'\''}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {ratingCount} rating{ratingCount === 1 ? '\'''\'' : '\''s'\''}
        </span>
      </div>
    </div>
  );
}
