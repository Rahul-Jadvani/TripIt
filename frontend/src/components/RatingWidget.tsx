import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { StarRating, RatingDisplay, starsToBadgeType, getStarRating } from './StarRating';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/services/api';
import { useQuery } from '@tanstack/react-query';

interface RatingWidgetProps {
  projectId: string;
  currentRating?: {
    badge_type: string;
    validator_id: string;
    rationale?: string;
  };
  canRate: boolean; // Whether current user can rate (is validator/admin)
  onRatingSubmitted?: () => void;
}

export function RatingWidget({
  projectId,
  currentRating,
  canRate,
  onRatingSubmitted,
}: RatingWidgetProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [rationale, setRationale] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Optimistic state to show rating immediately after submission
  const [optimisticRating, setOptimisticRating] = useState<{ badge_type: string; validator_id: string; rationale?: string } | null>(null);

  // Check if user is assigned to this itinerary
  const { data: assignmentData } = useQuery({
    queryKey: ['assignment-check', projectId, user?.id],
    queryFn: async () => {
      if (!user?.id || !canRate) return { is_assigned: false };
      const response = await api.get(`/validator/assignments/check/${projectId}`);
      return response.data.data;
    },
    enabled: !!user?.id && canRate,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Use optimistic rating if available, otherwise use actual rating
  const displayRating = optimisticRating || currentRating;
  const existingRating = displayRating ? getStarRating(displayRating.badge_type) : 0;
  const hasRating = displayRating !== undefined;
  const isMyRating = displayRating?.validator_id === user?.id;

  // Clear optimistic rating when actual rating arrives
  useEffect(() => {
    if (currentRating && optimisticRating) {
      setOptimisticRating(null);
    }
  }, [currentRating, optimisticRating]);

  // Only show rating widget if user is assigned OR is admin
  const isAssigned = assignmentData?.is_assigned || user?.is_admin;
  const showRatingWidget = canRate && isAssigned;

  const handleRateClick = () => {
    if (!canRate) {
      toast.error('Only verified users can rate itineraries');
      return;
    }
    setSelectedRating(existingRating || 0);
    setRationale(currentRating?.rationale || '');
    setIsDialogOpen(true);
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const badgeType = starsToBadgeType(selectedRating);

      await api.post('/validator/badges/award', {
        project_id: projectId,
        badge_type: badgeType,
        rationale: rationale.trim(),
      });

      // Set optimistic state to show rating immediately
      setOptimisticRating({
        badge_type: badgeType,
        validator_id: user?.id || '',
        rationale: rationale.trim(),
      });

      toast.success(`Rated ${selectedRating} stars successfully!`);
      setIsDialogOpen(false);
      onRatingSubmitted?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit rating';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render anything if user can't rate or isn't assigned
  if (!showRatingWidget) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {hasRating ? (
          <>
            <RatingDisplay rating={existingRating} count={1} size="md" />
            {isMyRating && (
              <Button
                onClick={handleRateClick}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Update Rating
              </Button>
            )}
          </>
        ) : (
          <>
            <RatingDisplay rating={0} count={0} size="md" />
            <Button
              onClick={handleRateClick}
              variant="default"
              size="sm"
              className="text-xs font-bold"
            >
              Rate this itinerary
            </Button>
          </>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rate this Itinerary</DialogTitle>
            <DialogDescription>
              As a verified user, your rating helps others discover quality content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Rating</label>
              <div className="flex items-center gap-2">
                <StarRating
                  rating={selectedRating}
                  size="lg"
                  interactive
                  onRate={setSelectedRating}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedRating > 0 ? `${selectedRating} stars` : 'Click to rate'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Comments (Optional)
              </label>
              <Textarea
                placeholder="Share why you gave this rating..."
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={isSubmitting || selectedRating === 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
