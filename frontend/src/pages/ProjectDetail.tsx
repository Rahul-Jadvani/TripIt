import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Github, ExternalLink, Award, Calendar, Code, Loader2, AlertCircle, Shield, Image as ImageIcon, Users, Share2, Bookmark, Eye, Tag, Lightbulb, TrendingUp, FileText, Edit, Trophy, Link2, Layers, Info, X, MapPin, DollarSign, Sun, Map, ChevronDown, Navigation, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckIfSavedItinerary, useSaveItinerary, useUnsaveItinerary } from '@/hooks/useSavedItineraries';
import { SafetyRatingWidget } from '@/components/SafetyRatingWidget';
import { TravelIntelSection } from '@/components/TravelIntelSection';
import { IntroRequest } from '@/components/IntroRequest';
import { ShareDialog } from '@/components/ShareDialog';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { RatingWidget } from '@/components/RatingWidget';
import { useAuth } from '@/context/AuthContext';
import { useProjectById } from '@/hooks/useProjects';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { formatScore, getProjectScore } from '@/utils/score';
import { useItineraryCaravans } from '@/hooks/useItineraryCaravans';
import { RouteMapModal } from '@/components/RouteMapModal';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, error } = useProjectById(id || '');
  const { data: isSaved, isLoading: checkingIfSaved } = useCheckIfSavedItinerary(id || '');
  const { data: caravans } = useItineraryCaravans(id);

  // Fetch source itineraries if this is a remixed itinerary
  const { data: sourceItineraries } = useQuery({
    queryKey: ['sourceItineraries', data?.data?.remixed_from_ids],
    queryFn: async () => {
      const ids = data?.data?.remixed_from_ids || [];
      console.log('[ProjectDetail] Fetching source itineraries for IDs:', ids);
      if (ids.length === 0) return [];

      // Fetch each source itinerary
      const results = await Promise.all(
        ids.map(async (sourceId: string) => {
          try {
            const response = await axios.get(
              `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/itineraries/${sourceId}`
            );
            return response.data.data;
          } catch {
            return null;
          }
        })
      );
      console.log('[ProjectDetail] Fetched source itineraries:', results.filter(Boolean));
      return results.filter(Boolean);
    },
    enabled: !!(data?.data?.is_remixed && data?.data?.remixed_from_ids?.length > 0)
  });
  const saveMutation = useSaveItinerary();
  const unsaveMutation = useUnsaveItinerary();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showProfileChecklist, setShowProfileChecklist] = useState(false);
  const [expandedScores, setExpandedScores] = useState<Record<string, boolean>>({});
  const [showRouteMap, setShowRouteMap] = useState(false);
  const queryClient = useQueryClient();

  // Track which projects have been viewed to prevent duplicate API calls
  const viewTrackedRef = useRef<Set<string>>(new Set());

  // Manage sticker positions (persist in localStorage)
  const [stickerPositions, setStickerPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const saved = localStorage.getItem(`sticker-positions-${id}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch project updates (disabled - endpoint doesn't exist yet)
  const { data: updatesData } = useQuery({
    queryKey: ['projectUpdates', id],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${id}/updates`);
      return response.data.data;
    },
    enabled: false  // Disabled - updates endpoint not implemented
  });

  // Delete update mutation
  const deleteUpdateMutation = useMutation({
    mutationFn: async (updateId: string) => {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${id}/updates/${updateId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectUpdates', id] });
      toast.success('Update deleted');
    },
    onError: () => {
      toast.error('Failed to delete update');
    }
  });

  const handleDeleteUpdate = (updateId: string) => {
    if (confirm('Are you sure you want to delete this update?')) {
      deleteUpdateMutation.mutate(updateId);
    }
  };

  const handleStickerPositionChange = (updateId: string, position: { x: number; y: number }) => {
    setStickerPositions((prev) => {
      const updated = { ...prev, [updateId]: position };
      localStorage.setItem(`sticker-positions-${id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const getDefaultPosition = (index: number) => {
    // Place near the right edge with a safe margin and stack vertically
    const rightMargin = 260; // leave room so the note doesn't overflow
    const topStart = 80;     // initial top offset
    const verticalGap = 170; // spacing between notes
    const x = Math.max(0, window.innerWidth - rightMargin);
    const y = topStart + index * verticalGap;
    return { x, y };
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Please login to save projects');
      return;
    }

    if (!id) return;

    if (isSaved) {
      unsaveMutation.mutate(id);
    } else {
      saveMutation.mutate(id);
    }
  };

  // Track unique project view on page load and handle comment anchors
  useEffect(() => {
    if (id && !isLoading && !error) {
      // Check if we've already tracked this view in this session
      if (viewTrackedRef.current.has(id)) {
        return; // Already tracked, skip
      }

      // Mark as tracked immediately to prevent duplicate calls
      viewTrackedRef.current.add(id);

      // Get or create anonymous session ID for unique tracking
      let sessionId = localStorage.getItem('viewer_session_id');
      if (!sessionId) {
        // Generate unique session ID for anonymous users
        sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('viewer_session_id', sessionId);
      }

      // Track view (fire and forget)
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/itineraries/${id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          })
        },
        body: JSON.stringify({ session_id: sessionId })
      }).catch(() => {
        // Silently fail - view tracking is not critical
      });

      // Handle comment anchor navigation (jump to specific comment)
      const hash = window.location.hash;
      if (hash.startsWith('#comment-')) {
        // Delay scroll to ensure comments are loaded
        const timer = setTimeout(() => {
          const commentId = hash.replace('#comment-', '');
          const commentElement = document.getElementById(`comment-${commentId}`);
          if (commentElement) {
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Highlight the comment briefly
            commentElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
              commentElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 3000);
          }
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [id, isLoading, error]);

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-lg text-muted-foreground">Loading itinerary details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data?.data) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto px-6 py-12">
          <div className="mx-auto max-w-5xl card-elevated p-20 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-black text-foreground mb-2">Project Not Found</h2>
            <p className="text-muted-foreground">{(error as any)?.message || 'Failed to load project'}</p>
          </div>
        </div>
      </div>
    );
  }

  const project = data.data;
  const displayScore = getProjectScore(project);

  const insightCards = [
    project.trip_highlights && (
      <div key="highlights" className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Trip Highlights
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.trip_highlights}
        </div>
      </div>
    ),
    project.trip_journey && (
      <div
        key="journey"
        className="card-elevated p-6 bg-gradient-to-br from-secondary/30 to-secondary/10 border-2 border-primary/20"
      >
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Trip Journey & Experience
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.trip_journey}
        </div>
      </div>
    ),
    project.day_by_day_plan && (
      <div key="dayplan" className="card-elevated p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Day-by-Day Itinerary
          </h2>
          <button
            onClick={() => setShowRouteMap(true)}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Navigation className="h-4 w-4" />
            View Route Map
          </button>
        </div>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.day_by_day_plan}
        </div>
      </div>
    ),
    project.hidden_gems && (
      <div key="gems" className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Hidden Gems & Local Businesses
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.hidden_gems}
        </div>
      </div>
    ),
    project.unique_highlights && (
      <div
        key="unique"
        className="card-elevated p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30"
      >
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Unique Highlights
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm font-medium">
          {project.unique_highlights}
        </div>
      </div>
    ),
    project.safety_tips && (
      <div
        key="safety"
        className="card-elevated p-6 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-2 border-orange-500/30"
      >
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-orange-500" />
          Safety Intelligence & Travel Tips
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.safety_tips}
        </div>
      </div>
    ),
  ].filter(Boolean) as ReactNode[];

  const renderMissingFieldsAlert = () => {
    if (user?.id !== project.authorId) return null;

    const missingFields: string[] = [];
    if (!project.categories || project.categories.length === 0) missingFields.push('Categories');
    if (!project.trip_highlights) missingFields.push('Trip Highlights');
    if (!project.trip_journey) missingFields.push('Trip Journey & Experience');
    if (!project.day_by_day_plan) missingFields.push('Day-by-Day Itinerary');
    if (!project.hidden_gems) missingFields.push('Hidden Gems');
    if (!project.unique_highlights) missingFields.push('Unique Highlights');
    if (!project.safety_tips) missingFields.push('Safety Intelligence & Travel Tips');

    if (!missingFields.length) return null;

    if (!showProfileChecklist) {
      return (
        <button
          type="button"
          onClick={() => setShowProfileChecklist(true)}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-orange-500/50 rounded-full px-3 py-1 hover:bg-orange-500/10 transition-colors"
        >
          <Info className="h-3.5 w-3.5 text-orange-500" />
          Complete your project profile
        </button>
      );
    }

    return (
      <div className="card-elevated p-4 bg-gradient-to-r from-orange-500/10 to-orange-500/10 border-2 border-orange-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">Complete Your Project Profile</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add these sections to improve your profile visibility:
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {missingFields.map((field) => (
                <span
                  key={field}
                  className="text-xs px-2 py-1 bg-orange-500/20 text-orange-600 rounded border border-orange-500/30"
                >
                  {field}
                </span>
              ))}
            </div>
            <Link
              to={`/project/${project.id}/edit`}
              className="inline-block px-3 py-1.5 bg-orange-500 text-black rounded text-xs font-semibold hover:bg-orange-600 transition-colors"
            >
              Edit Project
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowProfileChecklist(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Hide profile checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderCreatorCard = () => {
    if (!project.author) return null;

    return (
      <div className="card-elevated p-5">
        <h3 className="font-black text-sm mb-3 text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Creator
        </h3>
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border-2 border-primary">
            <AvatarImage src={project.author.avatar} alt={project.author.username} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">
              {project.author?.username?.slice(0, 2).toUpperCase() || 'NA'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link
              to={`/u/${project.author?.username}`}
              className="text-base font-bold text-primary hover:opacity-80 transition-quick block truncate"
            >
              {project.author?.username}
            </Link>
            {project.hackathonName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                {project.hackathonName}
                {project.hackathonDate && (
                  <span className="text-muted-foreground/80">
                    • {new Date(project.hackathonDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };


  const renderCategoriesCard = () => {
    if (!project.categories || project.categories.length === 0) return null;

    return (
      <div className="card-elevated p-5">
        <h3 className="text-sm font-black mb-3 text-foreground flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {project.categories.map((category: string) => (
            <Badge
              key={category}
              variant="default"
              className="px-2.5 py-1 text-xs font-semibold bg-primary text-black hover:bg-primary/90"
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  // Chains card removed - layerz feature deprecated in TripIt

  const renderAIAttributionSection = () => {
    console.log('[ProjectDetail] AI Attribution check:', {
      is_remixed: project?.is_remixed,
      remixed_from_ids: project?.remixed_from_ids,
      sourceItineraries: sourceItineraries
    });
    if (!project?.is_remixed || !sourceItineraries || sourceItineraries.length === 0) return null;

    return (
      <div className="card-elevated p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full font-bold shadow-lg">
            <Sparkles className="w-4 h-4" />
            <span>Generated with TripIt AI</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          This itinerary was created using TripIt's AI Remix feature, combining elements from the following source trips:
        </p>

        <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Inspired by:
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {sourceItineraries.map((source: any) => (
            <Link
              key={source.id}
              to={`/project/${source.id}`}
              className="flex items-start gap-3 p-3 bg-card/80 rounded-lg border-2 border-border hover:border-purple-500/50 transition-colors group"
            >
              {source.screenshots?.[0] && (
                <img
                  src={source.screenshots[0]}
                  alt={source.title}
                  className="w-16 h-16 object-cover rounded-lg border border-border flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground mb-1 text-sm group-hover:text-purple-400 transition-colors truncate">
                  {source.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-2">
                  by {source.creator?.username || source.author?.username || 'Anonymous'}
                </p>
                <div className="flex items-center gap-3 text-xs text-primary">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {source.destination}
                  </span>
                  {source.duration_days && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {source.duration_days} days
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderCaravansCard = () => {
    if (!caravans || caravans.length === 0) return null;

    return (
      <div className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Part of Caravans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {caravans.map((caravan: any) => (
            <Link
              key={caravan.id}
              to={`/c/${caravan.slug}`}
              className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={caravan.logo_url} alt={caravan.name} />
                <AvatarFallback>{caravan.name[0]?.toUpperCase() || 'C'}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{caravan.name}</p>
                <p className="text-xs text-muted-foreground">{caravan.follower_count || 0} followers</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const renderTechStackCard = () => {
    if (!project.techStack || project.techStack.length === 0) return null;

    return (
      <div className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Safety Gear & Tags
        </h2>
        <div className="flex flex-wrap gap-2">
          {project.techStack.map((tech: string) => (
            <span key={tech} className="label-chip">
              {tech}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderTeamCard = () => {
    if (!project.team_members || project.team_members.length === 0) return null;

    return (
      <div className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team & Crew
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {project.team_members.map((member: any, index: number) => {
            const MemberCard = (
              <div className="flex items-center gap-3 p-3 bg-secondary/20 rounded-lg border border-border">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/20 border-2 border-primary/30 flex-shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.role || 'Team Member'}</p>
                </div>
              </div>
            );

            return member.user_id && member.username ? (
              <Link key={index} to={`/u/${member.username}`} className="hover:opacity-80 transition-opacity">
                {MemberCard}
              </Link>
            ) : (
              <div key={index}>{MemberCard}</div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderItineraryDetailsCard = () => {
    const hasDuration = project.duration_days;
    const hasBudget = project.budget_amount;
    const hasRouteMap = project.githubUrl || project.route_map_url;
    const hasSeason = project.best_season;
    const hasTravelStyle = project.travel_style;

    if (!hasDuration && !hasBudget && !hasRouteMap && !hasSeason && !hasTravelStyle) return null;

    return (
      <div className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Trip Details
        </h2>
        <div className="space-y-3">
          {hasTravelStyle && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Travel Type:</span>
              <span className="text-foreground font-medium">{project.travel_style}</span>
            </div>
          )}
          {hasDuration && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="text-foreground font-medium">{project.duration_days} days</span>
            </div>
          )}
          {hasBudget && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Budget:</span>
              <span className="text-foreground font-medium">
                {project.budget_currency || '₹'}{project.budget_amount?.toLocaleString()}
              </span>
            </div>
          )}
          {hasSeason && (
            <div className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Best Season:</span>
              <span className="text-foreground font-medium">{project.best_season}</span>
            </div>
          )}
          {hasRouteMap && (
            <div className="flex items-center gap-2 text-sm">
              <Map className="h-4 w-4 text-muted-foreground" />
              <a
                href={project.githubUrl || project.route_map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                View Route Map →
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderScoringBreakdownCard = () => {
    // Debug logging
    console.log('[ProjectDetail] Scoring Breakdown Data:', {
      identity_score: project.identity_score,
      travel_history_score: project.travel_history_score,
      community_score: project.community_score,
      safety_score_component: project.safety_score_component,
      quality_score: project.quality_score,
      proof_score: project.proof_score,
      score_explanations: project.score_explanations
    });

    // Check if we have proof_score (even if it's 0)
    const hasProofScore = project.proof_score !== undefined && project.proof_score !== null;

    if (!hasProofScore) {
      return null;
    }

    // Helper function to toggle score explanation
    const toggleScoreExplanation = (scoreKey: string) => {
      setExpandedScores(prev => ({ ...prev, [scoreKey]: !prev[scoreKey] }));
    };

    // Helper function to render a score component with explanation
    const renderScoreComponent = (
      key: string,
      label: string,
      score: number,
      explanationKey?: string
    ) => {
      const explanation = explanationKey && project.score_explanations?.[explanationKey];
      const isExpanded = expandedScores[key];

      return (
        <div key={key} className="border border-border/30 rounded-lg overflow-hidden">
          {/* Score Header - Clickable */}
          <button
            onClick={() => toggleScoreExplanation(key)}
            className="w-full flex items-center justify-between p-3 hover:bg-accent/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isExpanded ? 'transform rotate-180' : ''
                }`}
              />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <span className="font-semibold text-foreground">{formatScore(score)}</span>
          </button>

          {/* Explanation Dropdown */}
          {isExpanded && explanation && (
            <div className="px-3 pb-3 pt-1 bg-accent/5 border-t border-border/30">
              <div className="space-y-2">
                {/* Summary */}
                <p className="text-xs text-muted-foreground italic">
                  {explanation.summary}
                </p>

                {/* Score Stats */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-foreground font-medium">
                    {explanation.score.toFixed(1)} / {explanation.max.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({explanation.percentage.toFixed(0)}%)
                  </span>
                </div>

                {/* Detailed Reasons */}
                {explanation.details && explanation.details.length > 0 && (
                  <ul className="space-y-1 mt-2">
                    {explanation.details.map((detail: string, idx: number) => (
                      <li key={idx} className="text-xs text-foreground/80 leading-relaxed">
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="card-elevated p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
        <h2 className="text-lg font-black mb-4 text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Proof Score Breakdown
        </h2>
        <div className="space-y-3">
          {/* Total Score */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/30">
            <span className="text-sm font-bold text-foreground">Total Score</span>
            <span className="text-xl font-black text-primary">{formatScore(displayScore)}</span>
          </div>

          {/* Score Components with Explanations */}
          <div className="space-y-2 pt-2">
            {renderScoreComponent(
              'identity',
              'Identity Score',
              project.identity_score || 0,
              'identity_score'
            )}
            {renderScoreComponent(
              'travel_history',
              'Travel History',
              project.travel_history_score || 0,
              'travel_history_score'
            )}
            {renderScoreComponent(
              'community',
              'Caravan Engagement',
              project.community_score || 0,
              'community_score'
            )}
            {renderScoreComponent(
              'safety',
              'Safety Rating',
              project.safety_score_component || 0,
              'safety_score_component'
            )}
            {renderScoreComponent(
              'quality',
              'Content Quality',
              project.quality_score || 0,
              'quality_score'
            )}
          </div>

          {/* Additional metrics */}
          <div className="pt-3 border-t border-border/50 space-y-2">
            {project.safety_score !== undefined && project.safety_score > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Caravan Safety Score</span>
                <span className="font-medium text-foreground">{project.safety_score.toFixed(1)}/5.0</span>
              </div>
            )}
            {project.safety_ratings_count !== undefined && project.safety_ratings_count > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Safety Ratings</span>
                <span className="font-medium text-foreground">{project.safety_ratings_count} ratings</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderHackathonCard = () => {
    if (
      !(
        (project.hackathons && project.hackathons.length > 0) ||
        project.hackathonName ||
        project.hackathonDate
      )
    ) {
      return null;
    }

    return (
      <div className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Hackathon Details
        </h2>
        <div className="space-y-4">
          {project.hackathons && project.hackathons.length > 0 ? (
            project.hackathons.map((hackathon: any, index: number) => (
              <div key={index} className="p-4 bg-secondary/20 rounded-lg border-2 border-border">
                <div className="space-y-2">
                  {hackathon.name && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Event:</span>
                      <span className="text-sm text-foreground">{hackathon.name}</span>
                    </div>
                  )}
                  {hackathon.result && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Result:</span>
                      <span className="text-sm text-foreground">{hackathon.result}</span>
                    </div>
                  )}
                  {hackathon.date && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Date:</span>
                      <span className="text-sm text-foreground">
                        {new Date(hackathon.date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {hackathon.details && (
                    <div className="text-sm text-muted-foreground">
                      {hackathon.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-secondary/20 rounded-lg border-2 border-border space-y-2 text-sm text-foreground">
              {project.hackathonName && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Event:</span>
                  <span className="text-sm text-foreground">{project.hackathonName}</span>
                </div>
              )}
              {project.hackathonDate && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Date:</span>
                  <span className="text-sm text-foreground">
                    {new Date(project.hackathonDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-8 py-8 relative">
        {/* Project Updates - Post-it stickers removed in TripIt version */}

        <div className="space-y-8">
          {/* ===== HERO SECTION ===== */}
          <div className="card-elevated p-6">
            {/* Title & Score Row */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {project.isFeatured && (
                    <span className="badge-primary text-xs px-2 py-1">⭐ Featured</span>
                  )}
                  {project.is_remixed && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30 font-medium">
                      <Sparkles className="h-3 w-3" />
                      Generated with TripIt AI
                    </span>
                  )}
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-foreground mb-2 break-words">
                  {project.title}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.tagline}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Eye className="h-4 w-4" />
                    {project.viewCount?.toLocaleString() || 0} views
                  </div>
                  <div className="flex items-center gap-2">
                    <VoteButtons
                      projectId={project.id}
                      voteCount={project.voteCount}
                      userVote={project.userVote as 'up' | 'down' | null}
                      projectOwnerId={project.authorId || project.user_id}
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 px-3 py-2 min-w-[70px]">
                <span className="text-xl font-bold text-primary">{formatScore(displayScore)}</span>
                <span className="text-[10px] text-muted-foreground font-medium">Score</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-2 mt-4">
              <div className="flex flex-wrap gap-2">
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="h-4 w-4" />
                  Booking Link
                </a>
              )}
              {(project.githubUrl || project.route_map_url) && (
                <a
                  href={project.githubUrl || project.route_map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary h-10 px-4 text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Map className="h-4 w-4" />
                  Maps Link
                </a>
              )}
              {project.pitch_deck_url && (
                <a
                  href={project.pitch_deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary h-10 px-4 text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText className="h-4 w-4" />
                  Pitch Deck
                </a>
              )}
                <RatingWidget
                  projectId={project.id}
                  currentRating={project.badges?.find((b: any) => b.validator_id === user?.id)}
                  canRate={!!(user && (user.email_verified || user.is_admin || user.is_validator))}
                  onRatingSubmitted={() => {
                    queryClient.invalidateQueries({ queryKey: ['project', id] });
                    queryClient.invalidateQueries({ queryKey: ['projects'] });
                  }}
                />
                {user?.id !== (project.authorId || project.user_id) && (
                  <IntroRequest
                    projectId={project.id}
                    recipientId={project.authorId || project.user_id}
                    contentType={project.destination ? "itinerary" : "project"}
                  />
                )}
                {/* Book This Trip Button - Available to all users */}
                {project.destination && (
                  <Link
                    to={`/booking/${project.id}`}
                    className="btn-primary bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-10 px-4 text-sm flex items-center gap-1.5 font-semibold shadow-lg"
                  >
                    <Sparkles className="h-4 w-4" />
                    Make It Happen
                  </Link>
                )}

                {user?.id === (project.authorId || project.user_id) && (
                  <>
                    <Link to={`/project/${project.id}/edit`} className="btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Link>
                  </>
                )}
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={handleSave}
                  disabled={checkingIfSaved || saveMutation.isPending || unsaveMutation.isPending}
                  className={`btn-secondary h-10 px-4 text-sm flex items-center gap-1.5 disabled:opacity-50 ${isSaved ? 'bg-primary text-black hover:bg-primary/90' : ''}`}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
                <button onClick={handleShare} className="btn-secondary h-10 px-4 text-sm flex items-center gap-1.5">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <div className="space-y-6">
              {renderMissingFieldsAlert()}

              <div className="card-elevated p-6">
                <h2 className="text-lg font-black mb-3 text-foreground">Trip Overview</h2>
                {project.destination && (
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">{project.destination}</span>
                  </div>
                )}
                <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                  {project.description}
                </div>
              </div>

              {insightCards.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  {insightCards}
                </div>
              )}

              {project.screenshots && project.screenshots.length > 0 && (
                <div className="card-elevated p-6">
                  <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Photos
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.screenshots.map((screenshot: string, index: number) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => window.open(screenshot, '_blank')}
                      >
                        <img
                          src={screenshot}
                          alt={`${project.title} - Photo ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-border/60 shadow-lg group-hover:opacity-90 transition-opacity"
                          onError={(e) => {
                            console.error('Image failed to load:', screenshot);
                            e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div id="comments" className="card-elevated p-6 scroll-mt-20">
                <h2 className="text-lg font-black mb-4 text-foreground">Travel Intel & Discussion</h2>
                <CommentSection projectId={id || String(project.id)} altProjectId={String(project.id)} />
              </div>
            </div>

            <div className="space-y-6">
              {renderCreatorCard()}
              {renderAIAttributionSection()}
              {renderScoringBreakdownCard()}
              {renderTeamCard()}
              {renderCategoriesCard()}
              {renderCaravansCard()}
              {renderItineraryDetailsCard()}
              {renderTechStackCard()}
              {renderHackathonCard()}
            </div>
          </div>
        </div>
      </div>
      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/project/${id}`}
        title={project.title}
        description={project.tagline}
      />

      {/* Route Map Modal */}
      <RouteMapModal
        isOpen={showRouteMap}
        onClose={() => setShowRouteMap(false)}
        dayByDayPlan={project.day_by_day_plan || ''}
        destination={project.destination}
        title={`${project.title} - Route Map`}
      />
    </div>
  );
}



