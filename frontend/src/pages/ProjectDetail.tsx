import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Github, ExternalLink, Award, Calendar, Code, Loader2, AlertCircle, Shield, Image as ImageIcon, Users, Share2, Bookmark, Eye, Tag, Lightbulb, TrendingUp, Sparkles, FileText, Edit, Trophy, Link2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ChainBadge } from '@/components/ChainBadge';
import { useCheckIfSaved, useSaveProject, useUnsaveProject } from '@/hooks/useSavedProjects';
import { VoteButtons } from '@/components/VoteButtons';
import { CommentSection } from '@/components/CommentSection';
import { BadgeAwarder } from '@/components/BadgeAwarder';
import { IntroRequest } from '@/components/IntroRequest';
import { ValidationStatusCard } from '@/components/ValidationStatusCard';
import { ProjectDetailSkeleton } from '@/components/ProjectDetailSkeleton';
import { ShareDialog } from '@/components/ShareDialog';
import { ProjectUpdateSticker } from '@/components/ProjectUpdateSticker';
import { PostUpdateModal } from '@/components/PostUpdateModal';
import { useAuth } from '@/context/AuthContext';
import { useProjectById } from '@/hooks/useProjects';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data, isLoading, error } = useProjectById(id || '');
  const { data: isSaved, isLoading: checkingIfSaved } = useCheckIfSaved(id || '');
  const saveMutation = useSaveProject();
  const unsaveMutation = useUnsaveProject();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [showPostUpdate, setShowPostUpdate] = useState(false);
  const queryClient = useQueryClient();

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

  // Track unique project view on page load
  useEffect(() => {
    if (id && !isLoading && !error) {
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

  return (
    <div className="bg-background min-h-screen overflow-hidden">
      <div className="container mx-auto px-6 py-12 relative">
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

        <div className="mx-auto max-w-5xl w-full box-border px-3 sm:px-6">
          {/* Hero Header Section */}
          <div className="mb-6 sm:mb-8 card-elevated p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  {project.isFeatured && (
                    <span className="badge-primary text-xs px-2 py-1">⭐ Featured</span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground mb-2 break-words">
                  {project.title}
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
                  {project.tagline}
                </p>
              </div>

              {/* Score Badge */}
              <div className="badge-primary flex flex-col items-center justify-center px-4 sm:px-6 py-3 sm:py-4 rounded-[15px] flex-shrink-0 whitespace-nowrap">
                <div className="text-xl sm:text-2xl lg:text-3xl font-black text-black">{project.proofScore?.total || 0}</div>
                <div className="text-xs font-bold text-black mt-1">Score</div>
              </div>
            </div>

            {/* Vote Section */}
            <div className="border-t-4 border-black pt-3 sm:pt-4 mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <VoteButtons
                  projectId={project.id}
                  voteCount={project.voteCount}
                  userVote={project.userVote as 'up' | 'down' | null}
                />
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Vote to show your support for this project
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  <ExternalLink className="mr-2 h-5 w-5 inline" />
                  View Live Demo
                </a>
              )}
              {project.githubUrl && (
                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                  <Github className="mr-2 h-5 w-5 inline" />
                  View Code
                </a>
              )}
              <BadgeAwarder projectId={project.id} />

              {/* Project Owner Actions */}
              {user?.id === project.authorId && (
                <>
                  <button onClick={() => setShowPostUpdate(true)} className="btn-primary">
                    <Sparkles className="mr-2 h-4 w-4 inline" />
                    Post Update
                  </button>
                  <Link to={`/project/${project.id}/edit`} className="btn-secondary">
                    <Edit className="mr-2 h-4 w-4 inline" />
                    Edit Project
                  </Link>
                </>
              )}

              {/* Share and Save buttons */}
              <button onClick={handleShare} className="btn-secondary">
                <Share2 className="mr-2 h-4 w-4 inline" />
                Share
              </button>
              <button
                onClick={handleSave}
                disabled={checkingIfSaved || saveMutation.isPending || unsaveMutation.isPending}
                className={`btn-secondary disabled:opacity-50 ${isSaved ? 'bg-primary text-black hover:bg-primary/90' : ''}`}
              >
                <Bookmark className={`mr-2 h-4 w-4 inline ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </button>
              {user?.id !== project.authorId && (
                <IntroRequest projectId={project.id} builderId={project.authorId} />
              )}
            </div>

            {/* View Count - Subtle display in corner */}
            <div className="mt-4 pt-4 border-t border-border/30 flex justify-end">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/40 rounded-lg border border-border/50">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {project.viewCount?.toLocaleString() || 0} {project.viewCount === 1 ? 'view' : 'views'}
                </span>
              </div>
            </div>
          </div>

          {/* Creator & Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Creator Card */}
            <div className="card-elevated p-5 md:col-span-3">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12 border-3 border-primary">
                  <AvatarImage src={project.author?.avatar} alt={project.author?.username} />
                  <AvatarFallback className="bg-primary text-black font-bold text-sm">
                    {project.author?.username?.slice(0, 2).toUpperCase() || 'NA'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Link
                    to={`/u/${project.author?.username}`}
                    className="text-lg font-bold text-primary hover:opacity-80 transition-quick"
                  >
                    {project.author?.username}
                  </Link>
                  {project.hackathonName && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {project.hackathonName} • {project.hackathonDate && new Date(project.hackathonDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Team Members / Crew */}
              {project.team_members && project.team_members.length > 0 && (
                <div className="border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Crew</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {project.team_members.map((member: any, idx: number) => {
                      const MemberCard = (
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/30 rounded-lg border border-border"
                        >
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                            <span className="text-xs font-bold text-primary">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-foreground leading-none">{member.name}</p>
                            {member.role && (
                              <p className="text-xs text-muted-foreground leading-none mt-0.5">{member.role}</p>
                            )}
                          </div>
                        </div>
                      );

                      return member.user_id && member.username ? (
                        <Link
                          key={idx}
                          to={`/u/${member.username}`}
                          className="hover:opacity-80 transition-opacity"
                        >
                          {MemberCard}
                        </Link>
                      ) : (
                        <div key={idx}>
                          {MemberCard}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Missing Fields Alert for Project Owner */}
          {user?.id === project.authorId && (
            (() => {
              const missingFields = [];
              if (!project.categories || project.categories.length === 0) missingFields.push('Categories');
              if (!project.project_story) missingFields.push('Project Journey');
              if (!project.inspiration) missingFields.push('Inspiration');
              if (!project.market_comparison) missingFields.push('Market Comparison');
              if (!project.novelty_factor) missingFields.push('Novelty Factor');
              if (!project.pitch_deck_url) missingFields.push('Pitch Deck');

              if (missingFields.length > 0) {
                return (
                  <div className="card-elevated p-4 mb-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground mb-1">Complete Your Project Profile</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Add these sections to help visitors understand your project better:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {missingFields.map(field => (
                            <span key={field} className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/30">
                              {field}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => window.location.href = `/edit-project/${project.id}`}
                          className="mt-3 px-4 py-2 bg-yellow-500 text-black rounded-md font-semibold hover:bg-yellow-600 transition-colors text-sm"
                        >
                          Edit Project to Add These Fields
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Verification Cards Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* 0xCert Verification */}
            {project.author?.has_oxcert && (
              <div className="card-elevated p-5">
                <h3 className="font-black text-sm mb-3 text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  0xCert Verification
                </h3>

                {/* NFT Image */}
                {project.author?.oxcert_metadata?.image && (
                  <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden border-2 border-primary/30">
                    <img
                      src={project.author.oxcert_metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                      alt={project.author.oxcert_metadata.name || '0xCert NFT'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center bg-secondary/50">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                )}

                {/* NFT Details */}
                <div className="space-y-2">
                  {project.author?.oxcert_metadata?.name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="text-sm font-semibold text-foreground">{project.author.oxcert_metadata.name}</p>
                    </div>
                  )}

                  {project.author?.oxcert_token_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">Token ID</p>
                      <p className="text-sm font-mono text-foreground">#{project.author.oxcert_token_id}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground">Wallet</p>
                    <p className="text-sm font-mono text-foreground break-all">{project.author?.wallet_address}</p>
                  </div>

                  {/* Verification Score */}
                  <div className="flex items-center gap-2 p-2 bg-primary rounded border border-primary hover:bg-primary/90 transition-all duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black hover:scale-110 transition-transform duration-200 stroke-black" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-black font-bold">Verified</span>
                    <span className="text-xs text-black font-bold ml-auto">+10pts</span>
                  </div>

                  {/* Attributes */}
                  {project.author?.oxcert_metadata?.attributes && project.author.oxcert_metadata.attributes.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Attributes</p>
                      <div className="space-y-1">
                        {project.author.oxcert_metadata.attributes.map((attr, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-secondary/30 rounded border border-border">
                            <p className="text-xs text-muted-foreground">{attr.trait_type}</p>
                            <p className="text-xs font-medium text-foreground">{attr.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explorer Links */}
                  <div className="flex flex-col gap-2 pt-2">
                    {project.author?.full_wallet_address && (
                      <a
                        href={`https://kairos.kaiascan.io/account/${project.author.full_wallet_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-xs inline-flex items-center justify-center gap-2 w-full"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Wallet
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Status Card */}
            <ValidationStatusCard badges={project.badges} />
          </div>

          {/* Categories Section */}
          {project.categories && project.categories.length > 0 && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Tag className="h-6 w-6 text-primary" />
                Categories
              </h2>
              <div className="flex flex-wrap gap-2">
                {project.categories.map((category: string) => (
                  <Badge key={category} variant="default" className="px-3 py-1.5 text-sm font-semibold bg-primary text-black hover:bg-primary/90">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Chains Section */}
          {project.chains && project.chains.length > 0 && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Link2 className="h-6 w-6 text-primary" />
                Published in Chains
              </h2>
              <div className="flex flex-wrap gap-3">
                {project.chains.map((chain: any) => (
                  <ChainBadge key={chain.id} chain={chain} size="md" showPin={chain.is_pinned} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                This project is featured in {project.chains.length} chain{project.chains.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* About Section */}
          <div className="card-elevated p-6 mb-8">
            <h2 className="text-2xl font-black mb-4 text-foreground">About This Project</h2>
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
              {project.description}
            </div>
          </div>

          {/* Project Story Section */}
          {project.project_story && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Project Journey
              </h2>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                {project.project_story}
              </div>
            </div>
          )}

          {/* Inspiration Section */}
          {project.inspiration && (
            <div className="card-elevated p-6 mb-8 bg-gradient-to-br from-secondary/30 to-secondary/10 border-2 border-primary/20">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                The Spark
              </h2>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm italic">
                {project.inspiration}
              </div>
            </div>
          )}

          {/* Market Comparison Section */}
          {project.market_comparison && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Market Landscape
              </h2>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm">
                {project.market_comparison}
              </div>
            </div>
          )}

          {/* Novelty Factor Section */}
          {project.novelty_factor && (
            <div className="card-elevated p-6 mb-8 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                What Makes It Unique
              </h2>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-foreground leading-relaxed text-sm font-medium">
                {project.novelty_factor}
              </div>
            </div>
          )}

          {/* Pitch Deck Section */}
          {project.pitch_deck_url && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Pitch Deck
              </h2>
              <a
                href={project.pitch_deck_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                <ExternalLink className="h-5 w-5" />
                View Pitch Deck
              </a>
            </div>
          )}

          {/* Hackathon Details */}
          {((project.hackathons && project.hackathons.length > 0) || project.hackathonName || project.hackathonDate) && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Hackathon Details
              </h2>
              <div className="space-y-4">
                {/* Display new hackathons array if available */}
                {project.hackathons && project.hackathons.length > 0 ? (
                  project.hackathons.map((hackathon: any, index: number) => (
                    <div key={index} className="p-4 bg-secondary/20 rounded-lg border-2 border-border">
                      <div className="space-y-2">
                        {hackathon.name && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Event:</span>
                            <span className="text-sm text-foreground font-medium">{hackathon.name}</span>
                          </div>
                        )}
                        {hackathon.date && (
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Date:</span>
                            <span className="text-sm text-foreground">{new Date(hackathon.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                        )}
                        {hackathon.prize && (
                          <div className="flex items-center gap-3">
                            <Trophy className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Prize:</span>
                            <span className="text-sm text-foreground font-medium">{hackathon.prize}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  /* Fallback to old single hackathon fields for backward compatibility */
                  <div className="space-y-3">
                    {project.hackathonName && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Event:</span>
                        <span className="text-sm text-foreground font-medium">{project.hackathonName}</span>
                      </div>
                    )}
                    {project.hackathonDate && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold text-muted-foreground min-w-[100px]">Date:</span>
                        <span className="text-sm text-foreground">{new Date(project.hackathonDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Screenshots Section */}
          {project.screenshots && project.screenshots.length > 0 && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground">Screenshots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.screenshots.map((screenshot: string, index: number) => (
                  <div key={index} className="relative group cursor-pointer" onClick={() => window.open(screenshot, '_blank')}>
                    <img
                      src={screenshot}
                      alt={`${project.title} - Screenshot ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg border-2 border-black transition-transform hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Screenshot {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tech Stack Section */}
          {project.techStack && project.techStack.length > 0 && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Code className="h-6 w-6 text-primary" />
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
          )}

          {/* Team/Crew Section */}
          {project.team_members && project.team_members.length > 0 && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Team & Crew
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.team_members.map((member: any, index: number) => {
                  const MemberCard = (
                    <div className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border">
                      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/20 border-2 border-primary/30">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role || 'Team Member'}</p>
                      </div>
                    </div>
                  );

                  return member.user_id && member.username ? (
                    <Link
                      key={index}
                      to={`/u/${member.username}`}
                      className="hover:opacity-80 transition-opacity"
                    >
                      {MemberCard}
                    </Link>
                  ) : (
                    <div key={index}>
                      {MemberCard}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Associated Chains Section */}
          {project.chains && project.chains.length > 0 && (
            <div className="card-elevated p-6 mb-8">
              <h2 className="text-2xl font-black mb-4 text-foreground flex items-center gap-2">
                <Layers className="h-6 w-6 text-primary" />
                Part of Chains
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.chains.map((chain: any) => (
                  <Link
                    key={chain.id}
                    to={`/chains/${chain.slug}`}
                    className="flex items-center gap-3 p-4 bg-secondary/20 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <Avatar className="h-12 w-12 border-2 border-border">
                      {chain.logo_url ? (
                        <AvatarImage src={chain.logo_url} alt={chain.name} />
                      ) : (
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                          {chain.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{chain.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(chain.added_at).toLocaleDateString()}
                      </p>
                    </div>
                    {chain.is_pinned && (
                      <Badge variant="default" className="flex-shrink-0">
                        Pinned
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div id="comments" className="card-elevated p-6 scroll-mt-20">
            <h2 className="text-2xl font-black mb-6 text-foreground">Comments & Discussion</h2>
            <CommentSection projectId={id || String(project.id)} altProjectId={String(project.id)} />
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
