import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Itinerary, Traveler } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MessageSquare, Github, ExternalLink, Share2, Bookmark, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckIfSaved, useSaveProject, useUnsaveProject } from '@/hooks/useSavedProjects';
import { useAuth } from '@/context/AuthContext';
import { SafetyRatingWidget } from '@/components/SafetyRatingWidget';
import { IntroRequest } from '@/components/IntroRequest';
import { InteractiveScrollBackground } from '@/components/InteractiveScrollBackground';
import { ShareDialog } from '@/components/ShareDialog';
import { ChainBadge } from '@/components/ChainBadge';
import { formatScore } from '@/utils/score';

type CredibilityScore =
  | number
  | {
      total?: number;
      identity_score?: number;
      travel_history_score?: number;
      community_score?: number;
      safety_score_component?: number;
      quality_score?: number;
    };

interface ItineraryCardProps {
  itinerary: Itinerary & {
    tagline?: string;
    travel_credibility_score?: CredibilityScore;
    travelCredibilityScore?: CredibilityScore;
    safety_ratings_avg?: number;
    safety_ratings_count?: number;
    safety_rating_count?: number;
    safetyRatingCount?: number;
    travel_intel_count?: number;
    travelIntelCount?: number;
    userSafetyRating?: number | null;
    isFeatured?: boolean;
    is_featured?: boolean;
    creator?: Traveler;
    author?: Traveler;
    authorId?: string;
    user_id?: string;
  };
}

const getCredibilityScore = (score?: CredibilityScore) => {
  if (typeof score === 'number') return score;
  if (score?.total !== undefined) return score.total;
  const parts = [
    score?.identity_score,
    score?.travel_history_score,
    score?.community_score,
    score?.safety_score_component,
    score?.quality_score,
  ].filter((v) => typeof v === 'number') as number[];
  return parts.length ? parts.reduce((a, b) => a + b, 0) : 0;
};

export function ItineraryCard({ itinerary }: ItineraryCardProps) {
  const { user } = useAuth();
  const { data: isSaved, isLoading: checkingIfSaved } = useCheckIfSaved(itinerary.id);
  const saveMutation = useSaveProject();
  const unsaveMutation = useUnsaveProject();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedLocal, setSavedLocal] = useState<boolean | null>(null);

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
      unsaveMutation.mutate(itinerary.id, { onError: () => setSavedLocal(current) });
    } else {
      saveMutation.mutate(itinerary.id, { onError: () => setSavedLocal(current) });
    }
  };

  const truncateText = (text: string, maxWords: number) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const credibilityScore = getCredibilityScore(
    itinerary.travel_credibility_score || (itinerary as any).travelCredibilityScore
  );
  const intelCount =
    itinerary.travel_intel_count ?? itinerary.travelIntelCount ?? (itinerary as any).commentCount ?? 0;
  const safetyAvg =
    itinerary.safety_ratings_avg ?? (itinerary as any).safety_score ?? (itinerary as any).safetyScore ?? 0;
  const safetyCount =
    itinerary.safety_ratings_count ?? itinerary.safety_rating_count ?? itinerary.safetyRatingCount ?? 0;
  const creator = itinerary.creator || itinerary.author;
  const isFeatured = itinerary.isFeatured || itinerary.is_featured;

  return (
    <div className="group relative w-full h-full z-0 itinerary-card">
      <Card className="card-interactive overflow-hidden relative w-full h-full min-h-0 box-border flex flex-col transition-all duration-300 group-hover:z-10">
        <InteractiveScrollBackground className="text-primary/20" />
        <Link to={`/itinerary/${itinerary.id}`} className="flex flex-col flex-1 min-h-0 relative z-10">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  {isFeatured && <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0 mt-0.5" />}
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-smooth line-clamp-2">
                    {truncateText(itinerary.title, 8)}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-tight line-clamp-2 flex items-center gap-1.5">
                  {itinerary.destination && <MapPin className="h-3 w-3 text-primary flex-shrink-0" />}
                  {truncateText(itinerary.destination || itinerary.tagline || itinerary.description, 12)}
                </p>
              </div>

              <div className="flex-shrink-0 flex flex-col gap-2 items-end itinerary-credibility">
                <div className="flex gap-1">
                  <button
                    onClick={handleShare}
                    className="p-1.5 rounded-lg bg-secondary/50 hover:bg-primary hover:text-black text-muted-foreground transition-smooth border border-border/40"
                    title="Share itinerary"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={checkingIfSaved || saveMutation.isPending || unsaveMutation.isPending}
                    className={`p-1.5 rounded-lg transition-smooth border border-border/40 disabled:opacity-50 ${
                      (savedLocal ?? isSaved)
                        ? 'bg-primary text-black'
                        : 'bg-secondary/50 hover:bg-primary hover:text-black text-muted-foreground'
                    }`}
                    title={(savedLocal ?? isSaved) ? 'Unsave itinerary' : 'Save itinerary'}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${(savedLocal ?? isSaved) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 px-3 py-2 min-w-[80px] text-center">
                  <span className="text-xl font-bold text-primary">
                    {formatScore(credibilityScore)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Credibility Score</span>
                </div>
              </div>
            </div>

            {itinerary.description && (
              <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 w-full">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {truncateText(itinerary.description, 35)}
                </p>
              </div>
            )}

            {itinerary.activity_tags && itinerary.activity_tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {itinerary.activity_tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="badge bg-secondary/30 text-foreground text-[10px] py-0.5 px-2 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary border border-black" />
                    {tag}
                  </span>
                ))}
                {itinerary.activity_tags.length > 4 && (
                  <span className="badge bg-secondary/30 text-foreground text-[10px] py-0.5 px-2">
                    +{itinerary.activity_tags.length - 4}
                  </span>
                )}
              </div>
            )}

            {itinerary.chains && itinerary.chains.length > 0 && (
              <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {itinerary.chains.slice(0, 3).map((chain) => (
                  <ChainBadge key={chain.id} chain={chain} size="sm" showPin={chain.is_pinned} />
                ))}
                {itinerary.chains.length > 3 && (
                  <Badge variant="secondary" className="text-[10px] bg-secondary/50 py-0.5 px-2">
                    +{itinerary.chains.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {creator && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={creator.avatar || creator.avatar_url} alt={creator.username} />
                    <AvatarFallback className="bg-card text-[10px] font-semibold">
                      {creator.username?.slice(0, 2).toUpperCase() || 'NA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {creator.username}
                    </p>
                    {itinerary.start_date && itinerary.end_date && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {itinerary.start_date} → {itinerary.end_date}
                      </p>
                    )}
                  </div>
                </div>

                {(itinerary.travel_companions || itinerary.team_members) &&
                  (itinerary.travel_companions || itinerary.team_members)!.length > 0 && (
                    <div className="flex-shrink-0">
                      <div className="flex -space-x-1.5">
                        {(itinerary.travel_companions || itinerary.team_members)!.slice(0, 3).map((member: any, idx) => {
                          const avatarUrl = member.avatar || member.avatar_url || member.image;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 border border-accent/30 text-[9px] font-semibold text-accent overflow-hidden"
                              title={member.name}
                            >
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                member.name?.slice(0, 1).toUpperCase() || '?'
                              )}
                            </div>
                          );
                        })}
                        {(itinerary.travel_companions || itinerary.team_members)!.length > 3 && (
                          <div
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50 border border-border/50 text-[9px] font-semibold text-muted-foreground"
                            title={`+${(itinerary.travel_companions || itinerary.team_members)!.length - 3} more`}
                          >
                            +{(itinerary.travel_companions || itinerary.team_members)!.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </Link>

        <div className="px-4 py-3 space-y-1.5 border-t border-border/40 bg-card/60 backdrop-blur-sm flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2 justify-center">
            {itinerary.route_map_url && (
              <a
                href={itinerary.route_map_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 p-2 rounded-lg bg-secondary/70 hover:bg-primary hover:text-black text-muted-foreground hover:text-foreground transition-smooth border border-border text-center text-xs font-medium flex items-center justify-center gap-1"
                title="View route map"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Route</span>
              </a>
            )}
            {itinerary.githubUrl && (
              <a
                href={itinerary.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 p-2 rounded-lg bg-secondary/70 hover:bg-primary hover:text-black text-muted-foreground hover:text-foreground transition-smooth border border-border text-center text-xs font-medium flex items-center justify-center gap-1"
                title="View details"
              >
                <Github className="h-3 w-3" />
                <span>Docs</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">
              <SafetyRatingWidget
                itineraryId={itinerary.id}
                averageScore={safetyAvg}
                ratingCount={safetyCount}
                userRating={(itinerary as any).userSafetyRating ?? null}
                itineraryOwnerId={itinerary.traveler_id || creator?.id || itinerary.authorId || itinerary.user_id}
              />
            </div>
            <Link
              to={`/itinerary/${itinerary.id}#travel-intel`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth border border-border text-xs font-medium"
              title="View travel intel"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{intelCount}</span>
            </Link>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <IntroRequest projectId={itinerary.id} builderId={itinerary.traveler_id || itinerary.authorId} />
          </div>
        </div>
      </Card>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/itinerary/${itinerary.id}`}
        title={itinerary.title}
        description={itinerary.tagline || itinerary.destination || itinerary.description}
      />
    </div>
  );
}
