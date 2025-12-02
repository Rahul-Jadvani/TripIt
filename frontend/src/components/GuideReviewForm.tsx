import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface GuideReviewFormProps {
  guideId: string;
  bookingId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReviewFormData {
  rating: number;
  review_title: string;
  review_text: string;
  safety_rating: number;
  knowledge_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  value_for_money_rating: number;
}

export function GuideReviewForm({
  guideId,
  bookingId,
  open,
  onOpenChange,
}: GuideReviewFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 0,
    review_title: '',
    review_text: '',
    safety_rating: 0,
    knowledge_rating: 0,
    communication_rating: 0,
    professionalism_rating: 0,
    value_for_money_rating: 0,
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: ReviewFormData) => {
      if (!user) {
        throw new Error('Please login to submit a review');
      }

      const response = await api.post('/women-safety/reviews', {
        guide_id: guideId,
        booking_id: bookingId,
        ...data,
      });

      return response.data.data;
    },
    onSuccess: () => {
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['women-guide', guideId] });
      queryClient.invalidateQueries({ queryKey: ['guide-reviews', guideId] });
      toast.success('Review submitted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit review');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.rating === 0) {
      toast.error('Please select an overall rating');
      return;
    }
    if (!formData.review_text.trim()) {
      toast.error('Please write a review');
      return;
    }
    if (formData.review_text.trim().length < 20) {
      toast.error('Review must be at least 20 characters');
      return;
    }

    reviewMutation.mutate(formData);
  };

  const handleClose = () => {
    if (!reviewMutation.isPending) {
      onOpenChange(false);
      // Reset form after dialog closes
      setTimeout(() => {
        setFormData({
          rating: 0,
          review_title: '',
          review_text: '',
          safety_rating: 0,
          knowledge_rating: 0,
          communication_rating: 0,
          professionalism_rating: 0,
          value_for_money_rating: 0,
        });
        setShowSuccess(false);
      }, 300);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
    size = 'md',
  }: {
    value: number;
    onChange: (rating: number) => void;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
  }) => {
    const [hover, setHover] = useState(0);

    const sizeClasses = {
      sm: 'h-5 w-5',
      md: 'h-7 w-7',
      lg: 'h-9 w-9',
    };

    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  (hover || value) >= star
                    ? 'fill-primary text-primary'
                    : 'text-muted-foreground'
                )}
              />
            </button>
          ))}
          {value > 0 && (
            <span className="ml-2 text-sm text-muted-foreground self-center">
              {value} / 5
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          // Success State
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <DialogTitle className="text-2xl mb-2">Review Submitted!</DialogTitle>
            <DialogDescription className="text-base mb-6">
              Thank you for taking the time to share your experience. Your review helps other
              travelers make informed decisions.
            </DialogDescription>

            <div className="bg-secondary/30 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-4xl font-bold text-primary">{formData.rating}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        'h-6 w-6',
                        formData.rating >= star
                          ? 'fill-primary text-primary'
                          : 'text-muted-foreground'
                      )}
                    />
                  ))}
                </div>
              </div>
              {formData.review_title && (
                <h4 className="font-semibold text-lg mb-2">{formData.review_title}</h4>
              )}
              <p className="text-sm text-muted-foreground">{formData.review_text}</p>
            </div>

            <Button onClick={handleClose} className="w-full" size="lg">
              Done
            </Button>
          </div>
        ) : (
          // Review Form
          <>
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>
                Share your experience with this guide to help other travelers
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Overall Rating */}
              <div className="bg-primary/5 rounded-lg p-6 text-center">
                <StarRating
                  value={formData.rating}
                  onChange={(rating) => setFormData({ ...formData, rating })}
                  label="Overall Rating"
                  size="lg"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Required - Rate your overall experience
                </p>
              </div>

              <Separator />

              {/* Detailed Ratings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Rate Specific Aspects (Optional)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <StarRating
                    value={formData.safety_rating}
                    onChange={(rating) => setFormData({ ...formData, safety_rating: rating })}
                    label="Safety"
                    size="sm"
                  />

                  <StarRating
                    value={formData.knowledge_rating}
                    onChange={(rating) => setFormData({ ...formData, knowledge_rating: rating })}
                    label="Local Knowledge"
                    size="sm"
                  />

                  <StarRating
                    value={formData.communication_rating}
                    onChange={(rating) =>
                      setFormData({ ...formData, communication_rating: rating })
                    }
                    label="Communication"
                    size="sm"
                  />

                  <StarRating
                    value={formData.professionalism_rating}
                    onChange={(rating) =>
                      setFormData({ ...formData, professionalism_rating: rating })
                    }
                    label="Professionalism"
                    size="sm"
                  />

                  <StarRating
                    value={formData.value_for_money_rating}
                    onChange={(rating) =>
                      setFormData({ ...formData, value_for_money_rating: rating })
                    }
                    label="Value for Money"
                    size="sm"
                  />
                </div>
              </div>

              <Separator />

              {/* Review Title */}
              <div className="space-y-2">
                <Label htmlFor="review_title">Review Title (Optional)</Label>
                <Input
                  id="review_title"
                  placeholder="e.g., Amazing experience in Jaipur!"
                  value={formData.review_title}
                  onChange={(e) => setFormData({ ...formData, review_title: e.target.value })}
                  maxLength={100}
                />
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label htmlFor="review_text">
                  Your Review <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="review_text"
                  placeholder="Share your experience with this guide. What did you like? What could be improved?"
                  value={formData.review_text}
                  onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                  rows={6}
                  required
                  minLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 20 characters ({formData.review_text.length}/20)
                </p>
              </div>

              {/* Guidelines */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2">Review Guidelines</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Be honest and constructive in your feedback</li>
                  <li>• Focus on your personal experience</li>
                  <li>• Avoid offensive language or personal attacks</li>
                  <li>• Include specific details to help other travelers</li>
                </ul>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={reviewMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reviewMutation.isPending || !user}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-semibold"
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : !user ? (
                    'Login to Review'
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </div>

              {!user && (
                <p className="text-xs text-center text-muted-foreground">
                  Please login to submit a review
                </p>
              )}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
