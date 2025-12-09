import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { GuideBookingDialog } from '@/components/GuideBookingDialog';
import {
  Star,
  MapPin,
  Languages,
  Award,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Shield,
  Heart,
  Phone,
  Mail,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { WomenGuide, GuideReview } from '@/types';
import api from '@/services/api';

export function WomenGuideDetail() {
  const { guideId } = useParams<{ guideId: string }>();
  const navigate = useNavigate();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);

  const { data: guide, isLoading } = useQuery({
    queryKey: ['women-guide', guideId],
    queryFn: async () => {
      const response = await api.get(`/women-safety/guides/${guideId}`);
      return response.data.data as WomenGuide;
    },
    enabled: !!guideId,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['guide-reviews', guideId],
    queryFn: async () => {
      const response = await api.get(`/women-safety/guides/${guideId}/reviews`);
      return response.data.data;
    },
    enabled: !!guideId,
  });

  const reviews: GuideReview[] = reviewsData?.reviews || [];

  const getVerificationColor = (level?: string) => {
    switch (level) {
      case 'platinum':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'gold':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white';
      case 'silver':
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 'bronze':
        return 'bg-gradient-to-r from-orange-600 to-orange-700 text-white';
      default:
        return 'bg-secondary text-muted-foreground';
    }
  };

  const getVerificationIcon = (level?: string) => {
    switch (level) {
      case 'platinum':
        return '💎';
      case 'gold':
        return '👑';
      case 'silver':
        return '🥈';
      case 'bronze':
        return '🥉';
      default:
        return '';
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    };

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              rating >= star ? 'fill-primary text-primary' : 'text-muted-foreground'
            }`}
          />
        ))}
      </div>
    );
  };

  const calculateRatingBreakdown = () => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const rating = Math.round(review.rating);
      breakdown[rating as keyof typeof breakdown]++;
    });
    return breakdown;
  };

  const ratingBreakdown = calculateRatingBreakdown();

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Skeleton className="h-12 w-64 mb-8" />
        <Card className="p-8 space-y-6">
          <div className="flex gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="container max-w-5xl mx-auto py-16 px-4">
        <Card className="p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Guide not found</h2>
          <p className="text-muted-foreground mb-4">
            The guide you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/women-safety/guides')}>
            Browse All Guides
          </Button>
        </Card>
      </div>
    );
  }

  const statusColors = {
    available: 'bg-green-500/20 text-green-600 border-green-500/30',
    unavailable: 'bg-red-500/20 text-red-600 border-red-500/30',
    on_leave: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/women-safety/guides')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Directory
      </Button>

      {/* Header Card */}
      <Card className="mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar */}
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage
                src={guide.traveler?.avatar || guide.traveler?.avatar_url}
                alt={guide.traveler?.username || 'Guide'}
              />
              <AvatarFallback className="text-3xl font-bold bg-primary/10">
                {guide.traveler?.username?.slice(0, 2).toUpperCase() || 'GD'}
              </AvatarFallback>
            </Avatar>

            {/* Header Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">
                      {guide.traveler?.displayName || guide.traveler?.username || 'Anonymous Guide'}
                    </h1>
                    {guide.is_verified && (
                      <Badge
                        className={`px-3 py-1 flex items-center gap-1.5 ${getVerificationColor(
                          guide.verification_level
                        )}`}
                      >
                        {getVerificationIcon(guide.verification_level)}
                        {guide.verification_level?.toUpperCase() || 'VERIFIED'}
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-3 mb-3">
                    {renderStars(guide.average_rating, 'lg')}
                    <span className="text-2xl font-bold text-foreground">
                      {guide.average_rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({guide.total_reviews} reviews)
                    </span>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{guide.years_of_experience} years experience</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{guide.women_travelers_guided} women guided</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      <span>{guide.successful_trips_count} successful trips</span>
                    </div>
                  </div>
                </div>

                {/* Availability Badge */}
                <Badge
                  className={`text-sm px-3 py-1.5 border ${statusColors[guide.availability_status]}`}
                >
                  {guide.availability_status === 'available'
                    ? 'Available'
                    : guide.availability_status === 'on_leave'
                    ? 'On Leave'
                    : 'Unavailable'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Hourly Rate & Book Button */}
          <div className="mt-6 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg border border-border">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                {guide.hourly_rate_usd || 0}
              </span>
              <span className="text-sm text-muted-foreground">/hour</span>
            </div>
            <Button
              size="lg"
              onClick={() => setBookingDialogOpen(true)}
              className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-black font-semibold"
              disabled={guide.availability_status !== 'available'}
            >
              {guide.availability_status === 'available' ? 'Book This Guide' : 'Unavailable'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Languages */}
          {guide.languages_spoken && guide.languages_spoken.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Languages className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Languages</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {guide.languages_spoken.map((lang, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {lang}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Specializations */}
          {guide.specializations && guide.specializations.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Specializations</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {guide.specializations.map((spec, idx) => (
                  <Badge
                    key={idx}
                    className="bg-primary/10 text-primary border border-primary/20 text-sm"
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Service Locations */}
          {guide.service_locations && guide.service_locations.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Service Locations</h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {guide.service_locations.map((location, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{location}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Reviews Section */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Reviews & Ratings</h2>

            {/* Rating Breakdown */}
            <div className="bg-secondary/30 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {guide.average_rating.toFixed(1)}
                  </div>
                  {renderStars(guide.average_rating, 'lg')}
                  <div className="text-sm text-muted-foreground mt-2">
                    Based on {guide.total_reviews} reviews
                  </div>
                </div>

                {/* Stars Breakdown */}
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm w-8">{star} star</span>
                      <Progress
                        value={
                          guide.total_reviews > 0
                            ? (ratingBreakdown[star as keyof typeof ratingBreakdown] /
                                guide.total_reviews) *
                              100
                            : 0
                        }
                        className="h-2 flex-1"
                      />
                      <span className="text-sm w-8 text-right text-muted-foreground">
                        {ratingBreakdown[star as keyof typeof ratingBreakdown]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.traveler?.avatar} />
                          <AvatarFallback>
                            {review.traveler?.username?.slice(0, 2).toUpperCase() || 'TR'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            {review.traveler?.displayName || review.traveler?.username || 'Anonymous'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {renderStars(review.rating)}
                    </div>
                    {review.review_title && (
                      <h4 className="font-semibold mb-1">{review.review_title}</h4>
                    )}
                    <p className="text-sm text-muted-foreground">{review.review_text}</p>
                    {review.verified_traveler && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified Traveler
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No reviews yet. Be the first to review this guide!
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Right Column */}
        <div className="space-y-6">
          {/* Certifications & Safety */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Safety & Certifications</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'First Aid Certified', value: guide.first_aid_certified },
                { label: 'Background Check', value: guide.background_check_completed },
                { label: 'Emergency Response', value: guide.emergency_response_training },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.value ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not verified</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Services Offered */}
          <Card className="p-6">
            <h3 className="text-lg font-bold mb-4">Services Offered</h3>
            <div className="space-y-3">
              {[
                { label: 'Accommodation', value: guide.offers_accommodation },
                { label: 'Meals Included', value: guide.offers_meals },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {item.value ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not included</span>
                  )}
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Max Group Size</span>
                <span className="font-semibold">{guide.max_group_size} people</span>
              </div>
            </div>
          </Card>

          {/* Contact (placeholder) */}
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="text-lg font-bold mb-4">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Book a consultation to discuss your travel plans and get personalized recommendations.
            </p>
            <Button
              variant="outline"
              onClick={() => setBookingDialogOpen(true)}
              className="w-full"
            >
              Schedule Consultation
            </Button>
          </Card>
        </div>
      </div>

      {/* Booking Dialog */}
      <GuideBookingDialog
        guideId={guide.id}
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
      />
    </div>
  );
}
