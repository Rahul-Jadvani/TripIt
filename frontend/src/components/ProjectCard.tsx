import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Project } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowUp, MessageSquare, Award, Star, TrendingUp, Github, ExternalLink, Shield, Share2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { useCheckIfSaved, useSaveProject, useUnsaveProject } from '@/hooks/useSavedProjects';
import { useAuth } from '@/context/AuthContext';
import { VoteButtons } from '@/components/VoteButtons';
import { IntroRequest } from '@/components/IntroRequest';
import { InteractiveScrollBackground } from '@/components/InteractiveScrollBackground';
import { ShareDialog } from '@/components/ShareDialog';
import { ChainBadge } from '@/components/ChainBadge';

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { user } = useAuth();
  const { data: isSaved, isLoading: checkingIfSaved } = useCheckIfSaved(project.id);
  const saveMutation = useSaveProject();
  const unsaveMutation = useUnsaveProject();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [savedLocal, setSavedLocal] = useState<boolean | null>(null);

  const upvoteRatio = project.voteCount > 0
    ? Math.round((project.voteCount / (project.voteCount + Math.abs(project.commentCount - project.voteCount))) * 100)
    : 0;

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareDialogOpen(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to save projects');
      return;
    }

    const current = savedLocal ?? !!isSaved;
    // Optimistic toggle
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


  // Truncate text to max words with ellipsis
  const truncateText = (text: string, maxWords: number) => {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  return (
    <div className="group relative w-full h-full z-0">
      <Card className="card-interactive overflow-hidden relative w-full h-full box-border flex flex-col transition-all duration-300 group-hover:z-10">
        <InteractiveScrollBackground className="text-primary/20" />
        <Link to={`/project/${project.id}`} className="flex flex-col h-full relative z-10">
          {/* Main content container - scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Header with title and proof score badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-2">
                  {project.isFeatured && (
                    <Star className="h-4 w-4 fill-primary text-primary flex-shrink-0 mt-0.5" />
                  )}
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-smooth line-clamp-2">
                    {truncateText(project.title, 8)}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                  {truncateText(project.tagline, 12)}
                </p>
              </div>

              {/* Proof score badge - top right */}
              <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                {/* Share and Save buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={handleShare}
                    className="p-1.5 rounded-lg bg-secondary/50 hover:bg-primary hover:text-black text-muted-foreground transition-smooth border border-border/40"
                    title="Share project"
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
                    title={(savedLocal ?? isSaved) ? 'Unsave project' : 'Save project'}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${(savedLocal ?? isSaved) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 px-3 py-2 min-w-[70px]">
                  <span className="text-xl font-bold text-primary">
                    {project.proofScore?.total && project.proofScore.total > 0
                      ? project.proofScore.total
                      : Math.max(project.voteCount || 0, 0)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {project.proofScore?.total && project.proofScore.total > 0 ? 'Score' : 'Votes'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description - compact */}
            {project.description && (
              <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/40 w-full">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {truncateText(project.description, 35)}
                </p>
              </div>
            )}

            {/* Tech stack - horizontal scroll */}
            {project.techStack && project.techStack.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {project.techStack.slice(0, 4).map((tech) => (
                  <span key={tech} className="badge bg-secondary/30 text-foreground text-[10px] py-0.5 px-2 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary border border-black" />
                    {tech}
                  </span>
                ))}
                {project.techStack.length > 4 && (
                  <span className="badge bg-secondary/30 text-foreground text-[10px] py-0.5 px-2">+{project.techStack.length - 4}</span>
                )}
              </div>
            )}

            {/* Chains */}
            {project.chains && project.chains.length > 0 && (
              <div className="flex gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {project.chains.slice(0, 3).map((chain) => (
                  <ChainBadge key={chain.id} chain={chain} size="sm" showPin={chain.is_pinned} />
                ))}
                {project.chains.length > 3 && (
                  <Badge variant="secondary" className="text-[10px] bg-secondary/50 py-0.5 px-2">
                    +{project.chains.length - 3} more
                  </Badge>
                )}
              </div>
            )}

            {/* Creator info */}
            {project.author && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={project.author.avatar || project.author.avatar_url} alt={project.author.username} />
                    <AvatarFallback className="bg-card text-[10px] font-semibold">
                      {project.author.username?.slice(0, 2).toUpperCase() || 'NA'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {project.author.username}
                    </p>
                    {project.hackathonName && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {project.hackathonName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Crew/Team members */}
                {(project.teamMembers || project.team_members) && (project.teamMembers || project.team_members)!.length > 0 && (
                  <div className="flex-shrink-0">
                    <div className="flex -space-x-1.5">
                      {(project.teamMembers || project.team_members)!.slice(0, 3).map((member, idx) => {
                        const avatarUrl = (member as any).avatar || (member as any).avatar_url || (member as any).image;
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 border border-accent/30 text-[9px] font-semibold text-accent overflow-hidden"
                            title={member.name}
                          >
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              member.name?.slice(0, 1).toUpperCase() || '?'
                            )}
                          </div>
                        );
                      })}
                      {(project.teamMembers || project.team_members)!.length > 3 && (
                        <div
                          className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary/50 border border-border/50 text-[9px] font-semibold text-muted-foreground"
                          title={`+${(project.teamMembers || project.team_members)!.length - 3} more`}
                        >
                          +{(project.teamMembers || project.team_members)!.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Interactive action buttons - sticky at bottom */}
        <div className="px-4 py-3 space-y-1.5 border-t border-border/40 bg-card/60 backdrop-blur-sm flex-shrink-0 relative z-10">
          {/* CTA Links */}
          <div className="flex items-center gap-2 justify-center">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 p-2 rounded-lg bg-secondary/70 hover:bg-primary hover:text-black text-muted-foreground hover:text-foreground transition-smooth border border-border text-center text-xs font-medium flex items-center justify-center gap-1"
                title="View Live Demo"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Demo</span>
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-1 p-2 rounded-lg bg-secondary/70 hover:bg-primary hover:text-black text-muted-foreground hover:text-foreground transition-smooth border border-border text-center text-xs font-medium flex items-center justify-center gap-1"
                title="View on GitHub"
              >
                <Github className="h-3 w-3" />
                <span>Code</span>
              </a>
            )}
          </div>

          {/* Vote buttons and Comments */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1">
              <VoteButtons
                projectId={project.id}
                voteCount={project.voteCount}
                userVote={project.userVote as 'up' | 'down' | null}
              />
            </div>
            {/* Comment count button */}
            <Link
              to={`/project/${project.id}#comments`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground transition-smooth border border-border text-xs font-medium"
              title="View comments"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{project.commentCount || 0}</span>
            </Link>
          </div>

          {/* Intro Request button */}
          <div onClick={(e) => e.stopPropagation()}>
            <IntroRequest projectId={project.id} builderId={project.authorId} />
          </div>
        </div>
      </Card>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={`${window.location.origin}/project/${project.id}`}
        title={project.title}
        description={project.tagline}
      />
    </div>
  );
}
