import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Itinerary } from '@/types';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Share2, Bookmark, ChevronLeft, ChevronRight, MapPin, Calendar, TrendingUp, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckIfSavedItinerary, useSaveItinerary, useUnsaveItinerary } from '@/hooks/useSavedItineraries';
import { useAuth } from '@/context/AuthContext';
import { ShareDialog } from '@/components/ShareDialog';
import { VoteButtons } from '@/components/VoteButtons';

// OPTIMIZED: Lazy image loading component for better performance
function LazyImage({ src, alt, className, ...props }: { src: string; alt: string; className?: string; [key: string]: any }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt}
      className={className}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      {...props}
    />
  );
}

interface ItineraryCardProps {
  project: Itinerary;
}

interface TravelCompanion {
  name: string;
}

export function ItineraryCard({ project }: ItineraryCardProps) {
  const { user } = useAuth();
  const { data: isSaved, isLoading: checkingIfSaved } = useCheckIfSavedItinerary(project.id);
  const saveMutation = useSaveItinerary();
  const unsaveMutation = useUnsaveItinerary();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedLocal, setSavedLocal] = useState<boolean | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get images from screenshots - only if they exist
  const images = project.screenshots && project.screenshots.length > 0
    ? project.screenshots
    : [];

  const author = project.creator || project.author;
  const authorUsername = author?.username || 'NA';
  const authorAvatar = author?.avatar_url || author?.avatar;

  // Auto-scroll carousel
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 6000); // Change image every 6 seconds (slower)

    return () => clearInterval(interval);
  }, [images.length]);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareDialogOpen(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to save itineraries');
      return;
    }

    const current = savedLocal ?? !!isSaved;
    setSavedLocal(!current);
    if (current) {
      unsaveMutation.mutate(project.id, {
        onError: () => setSavedLocal(current),
      });
    } else {
      saveMutation.mutate(project.id, {
        onError: () => setSavedLocal(current),
      });
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const formatDuration = () => {
    if (project.duration_days) {
      return `${project.duration_days} ${project.duration_days === 1 ? 'day' : 'days'}`;
    }
    return 'N/A';
  };

  const formatBudget = () => {
    if (project.estimated_budget_min && project.estimated_budget_max) {
      return `$${project.estimated_budget_min} - $${project.estimated_budget_max}`;
    }
    if (project.budget_amount) {
      return `${project.budget_currency || '$'}${project.budget_amount}`;
    }
    return 'N/A';
  };

  const isSavedState = savedLocal ?? isSaved;
  const userVote = project.user_vote || project.userVote;
  const projectOwnerId = project.created_by_traveler_id || project.user_id;

  return (
    <div className="group relative w-full">
      <Card className="overflow-hidden relative w-full border border-border/40 hover:border-primary/30 transition-all duration-300">
        {/* Caption Section - Creator + Title */}
        <div className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${authorUsername}`} onClick={(e) => e.stopPropagation()}>
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarImage
                  src={authorAvatar}
                  alt={authorUsername}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {authorUsername.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/profile/${authorUsername}`} onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                  {authorUsername}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {project.destination}
              </p>
            </div>
          </div>

          {/* Title/Caption */}
          <Link to={`/project/${project.id}`}>
            <div className="flex items-start justify-between gap-3 mt-3">
              <div className="flex-1">
                <h3 className="text-base font-bold text-foreground mb-1 hover:text-primary transition-colors">
                  {project.title}
                </h3>
                {project.tagline && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.tagline}
                  </p>
                )}
              </div>
              {/* Credibility Score badge - Always visible */}
              <div className="px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-bold text-primary">{project.proof_score || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Photo Carousel - Only show if images exist */}
        {images.length > 0 && (
          <Link to={`/project/${project.id}`}>
            <div className="relative w-full aspect-[4/3] bg-secondary/20 overflow-hidden group/carousel">
              <LazyImage
                src={images[currentImageIndex]}
                alt={`${project.title} - ${currentImageIndex + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover/carousel:scale-105"
              />

              {/* Carousel controls */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Dots indicator */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentImageIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all ${
                          idx === currentImageIndex
                            ? 'w-6 bg-white'
                            : 'w-1.5 bg-white/50 hover:bg-white/75'
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </Link>
        )}

        {/* Engagement Actions */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-4">
            <VoteButtons
              projectId={project.id}
              voteCount={(project.upvotes || 0) - (project.downvotes || 0)}
              userVote={userVote}
              projectOwnerId={projectOwnerId}
            />

            <Link
              to={`/project/${project.id}#comments`}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">{project.comment_count || 0}</span>
            </Link>

            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors ml-auto"
              aria-label="Share itinerary"
            >
              <Share2 className="h-5 w-5" />
            </button>

            <button
              onClick={handleSave}
              disabled={checkingIfSaved || saveMutation.isPending || unsaveMutation.isPending}
              className={`transition-colors disabled:opacity-50 ${
                isSavedState ? 'text-primary' : 'text-muted-foreground hover:text-primary'
              }`}
              aria-label={isSavedState ? "Remove from saved" : "Save itinerary"}
            >
              <Bookmark className={`h-5 w-5 ${isSavedState ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Trip Overview */}
        <Link to={`/project/${project.id}`}>
          <div className="px-4 py-3 space-y-3">
            {/* Description */}
            {project.description && (
              <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                {project.description}
              </p>
            )}

            {/* Trip Details Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-medium text-foreground">{formatDuration()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium text-foreground">{formatBudget()}</p>
                </div>
              </div>

              {project.difficulty_level && (
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-muted-foreground">Difficulty</p>
                    <p className="font-medium text-foreground capitalize">{project.difficulty_level}</p>
                  </div>
                </div>
              )}

              {project.travel_type && (
                <div className="flex items-center gap-2 text-xs">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <p className="font-medium text-foreground capitalize">{project.travel_type}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Activity Tags */}
            {project.activity_tags && project.activity_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {project.activity_tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20"
                  >
                    #{tag}
                  </span>
                ))}
                {project.activity_tags.length > 5 && (
                  <span className="px-2 py-1 text-xs font-medium bg-secondary text-muted-foreground rounded-full">
                    +{project.activity_tags.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Crew/Travel Companions */}
        {project.travel_companions && project.travel_companions.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Travel Crew</p>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {project.travel_companions.slice(0, 4).map((companion: TravelCompanion, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 rounded-full bg-primary/10 border-2 border-card flex items-center justify-center text-xs font-bold text-primary"
                    title={companion.name}
                  >
                    {companion.name?.slice(0, 1).toUpperCase() || '?'}
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {project.travel_companions.length === 1
                  ? project.travel_companions[0].name
                  : `${project.travel_companions.length} travelers`}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/project/${project.id}`}
        title={project.title}
        description={project.tagline || project.destination}
      />
    </div>
  );
}
