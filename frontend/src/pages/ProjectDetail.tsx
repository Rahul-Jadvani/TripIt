import { useParams, Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Github, ExternalLink, Award, Calendar, Code, Loader2, AlertCircle, Shield, Image as ImageIcon, Users, Share2, Bookmark, Eye, Tag, Lightbulb, TrendingUp, Sparkles, FileText, Edit, Trophy, Link2, Layers, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import { ChainBadge } from '@/components/ChainBadge';
import { useCheckIfSaved, useSaveProject, useUnsaveProject } from '@/hooks/useSavedProjects';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { BadgeAwarder } from '@/components/BadgeAwarder';
import { ProjectBadges } from '@/components/ProjectBadges';
import { IntroRequest } from '@/components/IntroRequest';
import { AIScoringBreakdownCard } from '@/components/AIScoringBreakdownCard';
import { ProjectDetailSkeleton } from '@/components/ProjectDetailSkeleton';
import { ShareDialog } from '@/components/ShareDialog';
import { ProjectUpdateSticker } from '@/components/ProjectUpdateSticker';
import { PostUpdateModal } from '@/components/PostUpdateModal';
import { useAuth } from '@/context/AuthContext';
import { useProjectById } from '@/hooks/useProjects';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { formatScore, getProjectScore } from '@/utils/score';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, error } = useProjectById(id || '');
  const { data: isSaved, isLoading: checkingIfSaved } = useCheckIfSaved(id || '');
  const saveMutation = useSaveProject();
  const unsaveMutation = useUnsaveProject();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showPostUpdate, setShowPostUpdate] = useState(false);
  const [showProfileChecklist, setShowProfileChecklist] = useState(false);
  const queryClient = useQueryClient();

  // Track which projects have been viewed to prevent duplicate API calls
  const viewTrackedRef = useRef<Set<string>>(new Set());

  // Manage sticker positions (persist in localStorage)
  const [stickerPositions, setStickerPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const saved = localStorage.getItem(`sticker-positions-${id}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch project updates
  const { data: updatesData } = useQuery({
    queryKey: ['projectUpdates', id],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${id}/updates`);
      return response.data.data;
    },
    enabled: !!id
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
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${id}/view`, {
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
    return <ProjectDetailSkeleton />;
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
    project.project_story && (
      <div key="story" className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Project Journey
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.project_story}
        </div>
      </div>
    ),
    project.inspiration && (
      <div
        key="inspiration"
        className="card-elevated p-6 bg-gradient-to-br from-secondary/30 to-secondary/10 border-2 border-primary/20"
      >
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          The Spark
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm italic">
          {project.inspiration}
        </div>
      </div>
    ),
    project.market_comparison && (
      <div key="market" className="card-elevated p-6">
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Market Landscape
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
          {project.market_comparison}
        </div>
      </div>
    ),
    project.novelty_factor && (
      <div
        key="novelty"
        className="card-elevated p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30"
      >
        <h2 className="text-lg font-black mb-3 text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          What Makes It Unique
        </h2>
        <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm font-medium">
          {project.novelty_factor}
        </div>
      </div>
    ),
  ].filter(Boolean) as ReactNode[];

  const renderMissingFieldsAlert = () => {
    if (user?.id !== project.authorId) return null;

    const missingFields: string[] = [];
    if (!project.categories || project.categories.length === 0) missingFields.push('Categories');
    if (!project.project_story) missingFields.push('Project Journey');
    if (!project.inspiration) missingFields.push('Inspiration');
    if (!project.market_comparison) missingFields.push('Market Comparison');
    if (!project.novelty_factor) missingFields.push('Novelty Factor');
    if (!project.pitch_deck_url) missingFields.push('Pitch Deck');

    if (!missingFields.length) return null;

    if (!showProfileChecklist) {
      return (
        <button
          type="button"
          onClick={() => setShowProfileChecklist(true)}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-dashed border-yellow-500/50 rounded-full px-3 py-1 hover:bg-yellow-500/10 transition-colors"
        >
          <Info className="h-3.5 w-3.5 text-yellow-500" />
          Complete your project profile
        </button>
      );
    }

    return (
      <div className="card-elevated p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-foreground mb-1">Complete Your Project Profile</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add these sections to improve your profile visibility:
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {missingFields.map((field) => (
                <span
                  key={field}
                  className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-600 rounded border border-yellow-500/30"
                >
                  {field}
                </span>
              ))}
            </div>
            <Link
              to={`/project/${project.id}/edit`}
              className="inline-block px-3 py-1.5 bg-yellow-500 text-black rounded text-xs font-semibold hover:bg-yellow-600 transition-colors"
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

  const renderChainsCard = () => {
    if (!project.chains || project.chains.length === 0) return null;

    return (
      <div className="card-elevated p-5">
        <h3 className="text-sm font-black mb-3 text-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Chains ({project.chains.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {project.chains.map((chain: any) => (
            <ChainBadge key={chain.id} chain={chain} size="sm" showPin={chain.is_pinned} />
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
          <Code className="h-4 w-4 text-primary" />
          Tech Stack
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
        {/* Project Updates - Post-it stickers (draggable anywhere) */}
        {updatesData && updatesData.length > 0 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {updatesData.slice(0, 5).map((update: any, index: number) => (
              <div key={update.id} className="pointer-events-auto">
                <ProjectUpdateSticker
                  update={update}
                  index={index}
                  canDelete={user?.id === project?.authorId}
                  onDelete={handleDeleteUpdate}
                  position={stickerPositions[update.id] || getDefaultPosition(index)}
                  onPositionChange={handleStickerPositionChange}
                  noteImageSrc="/pin3.png"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-8">
          {/* ===== HERO SECTION ===== */}
          <div className="card-elevated p-6">
            {/* Title & Score Row */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {project.isFeatured && (
                    <span className="badge-primary text-xs px-2 py-1">⭐ Featured</span>
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
                  <VoteButtons
                    projectId={project.id}
                    voteCount={project.voteCount}
                    userVote={project.userVote as 'up' | 'down' | null}
                    projectOwnerId={project.authorId || project.user_id}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <div className="flex gap-2">
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
                <div className="badge-primary flex flex-col items-center justify-center px-6 py-3 rounded-[15px] whitespace-nowrap min-w-[110px]">
                  <div className="text-2xl font-black text-black">{formatScore(displayScore)}</div>
                  <div className="text-xs font-bold text-black mt-1">Score</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <ExternalLink className="h-4 w-4" />
                  Demo
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Github className="h-4 w-4" />
                  Code
                </a>
              )}
              {project.pitch_deck_url && (
                <a
                  href={project.pitch_deck_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileText className="h-4 w-4" />
                  Pitch Deck
                </a>
              )}
              <BadgeAwarder projectId={project.id} />
              {user?.id !== project.authorId && (
                <IntroRequest projectId={project.id} builderId={project.authorId} />
              )}
              {user?.id === project.authorId && (
                <>
                  <button onClick={() => setShowPostUpdate(true)} className="btn-primary text-sm flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    Post Update
                  </button>
                  <Link to={`/project/${project.id}/edit`} className="btn-secondary text-sm flex items-center gap-1.5">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <div className="space-y-6">
              {renderMissingFieldsAlert()}

              <div className="card-elevated p-6">
                <h2 className="text-lg font-black mb-3 text-foreground">About This Project</h2>
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
                    Screenshots
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
                          alt={`${project.title} - Screenshot ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-border/60 shadow-lg group-hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white px-2 py-1 rounded-full">
                          Screenshot {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div id="comments" className="card-elevated p-6 scroll-mt-20">
                <h2 className="text-lg font-black mb-4 text-foreground">Comments & Discussion</h2>
                <CommentSection projectId={id || String(project.id)} altProjectId={String(project.id)} />
              </div>
            </div>

            <div className="space-y-6">
              {renderCreatorCard()}
              {renderTeamCard()}
              <AIScoringBreakdownCard project={project} />
              <ProjectBadges projectId={project.id} />
              {renderCategoriesCard()}
              {renderChainsCard()}
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

      {/* Post Update Modal */}
      <PostUpdateModal
        projectId={project.id}
        isOpen={showPostUpdate}
        onClose={() => setShowPostUpdate(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['projectUpdates', id] });
        }}
      />
    </div>
  );
}
