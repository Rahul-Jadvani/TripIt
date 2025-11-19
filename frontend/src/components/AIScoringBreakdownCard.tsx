import { Brain, Github, Users, Trophy, Heart, Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw, Info, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { Project } from '@/types';
import { useRescoreProject } from '@/hooks/useProjects';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

interface AIScoringBreakdownCardProps {
  project: Project;
  className?: string;
}

export function AIScoringBreakdownCard({ project, className = '' }: AIScoringBreakdownCardProps) {
  const { user } = useAuth();
  const rescoreMutation = useRescoreProject();
  const scoringStatus = project.scoring_status || project.scoringStatus;
  const scoreBreakdown = project.score_breakdown || project.scoreBreakdown;
  const retryCount = project.scoring_retry_count || project.scoringRetryCount || 0;
  const scoringError = project.scoring_error || project.scoringError;
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const [qualityExpanded, setQualityExpanded] = useState(false);
  const [verificationExpanded, setVerificationExpanded] = useState(false);
  const [communityExpanded, setCommunityExpanded] = useState(false);

  // Legacy projects (created before AI system) - don't have scoring_status
  // Show simple score breakdown without AI analysis indicators
  const isLegacyProject = !scoringStatus;

  const statusConfig = {
    pending: {
      icon: Clock,
      iconClass: 'text-yellow-500 animate-pulse',
      bgClass: 'bg-yellow-500/10 border-yellow-500/30',
      title: 'AI Analysis Pending',
      message: 'Your project is queued for AI analysis (~30-60 seconds)',
    },
    processing: {
      icon: Loader2,
      iconClass: 'text-blue-500 animate-spin',
      bgClass: 'bg-blue-500/10 border-blue-500/30',
      title: 'AI Analyzing',
      message: 'GitHub API and GPT-4 are analyzing your project...',
    },
    retrying: {
      icon: Loader2,
      iconClass: 'text-orange-500 animate-spin',
      bgClass: 'bg-orange-500/10 border-orange-500/30',
      title: `Retrying Analysis (${retryCount}/10)`,
      message: 'Temporary issue detected. Retrying automatically...',
    },
    failed: {
      icon: AlertCircle,
      iconClass: 'text-red-500',
      bgClass: 'bg-red-500/10 border-red-500/30',
      title: 'Analysis Failed',
      message: scoringError || 'Unable to complete AI analysis. Click retry to try again.',
    },
    completed: {
      icon: CheckCircle2,
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10 border-primary/30',
      title: 'AI Analysis Complete',
      message: 'Your project has been analyzed by our AI system',
    },
  };

  const status = statusConfig[scoringStatus as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className={`card-elevated p-5 ${className}`}>
      <h3 className="font-black text-sm mb-3 text-foreground flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" />
        {isLegacyProject ? 'Score Breakdown' : 'AI Scoring Breakdown'}
      </h3>

      {/* Status Banner - Only for new projects with AI scoring */}
      {!isLegacyProject && (
        <div className={`rounded-lg p-4 border-2 ${status.bgClass} mb-4`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-6 w-6 ${status.iconClass}`} />
            <div className="flex-1">
              <div className="text-sm font-black text-foreground">{status.title}</div>
              <p className="text-xs text-muted-foreground mt-1">{status.message}</p>
            </div>
            {/* Retry button for failed scoring - only show to project owner or admin */}
            {scoringStatus === 'failed' && (user?.id === project.authorId || user?.isAdmin) && (
              <button
                onClick={() => rescoreMutation.mutate(project.id)}
                disabled={rescoreMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-black rounded-lg hover:bg-primary/90 transition-smooth text-xs font-bold disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${rescoreMutation.isPending ? 'animate-spin' : ''}`} />
                {rescoreMutation.isPending ? 'Retrying...' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Score Breakdown - Show for completed AI scoring OR legacy projects */}
      {(scoringStatus === 'completed' || isLegacyProject) && (
        <div className="space-y-3">
          {/* Code Quality */}
          <div className="p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Code Quality</span>
              </div>
              <span className="text-sm font-black text-primary">
                {(project.proofScore?.quality || 0).toFixed(1)}/20
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isLegacyProject
                ? 'Demo URL, GitHub URL, screenshots, description quality'
                : 'Repository structure, README, file organization, code patterns'}
            </p>

            {/* Collapsible GitHub Analysis Details */}
            {!isLegacyProject && scoreBreakdown?.quality && (
              <div className="mt-2">
                <button
                  onClick={() => setQualityExpanded(!qualityExpanded)}
                  className="w-full flex items-center justify-between p-2 bg-primary/10 hover:bg-primary/20 rounded text-[10px] font-bold text-primary transition-smooth"
                >
                  <span className="flex items-center gap-1.5">
                    <Github className="h-3 w-3" />
                    GitHub Analysis Details
                  </span>
                  {qualityExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {qualityExpanded && (
                  <div className="mt-2 p-3 bg-secondary/50 rounded border border-border space-y-2">
                    {/* Quality metrics breakdown */}
                    {scoreBreakdown.quality.repo_structure !== undefined && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Repository Structure</span>
                        <span className="font-bold text-foreground">{scoreBreakdown.quality.repo_structure}/100</span>
                      </div>
                    )}
                    {scoreBreakdown.quality.readme_quality !== undefined && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">README Quality</span>
                        <span className="font-bold text-foreground">{scoreBreakdown.quality.readme_quality}/100</span>
                      </div>
                    )}
                    {scoreBreakdown.quality.file_organization !== undefined && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">File Organization</span>
                        <span className="font-bold text-foreground">{scoreBreakdown.quality.file_organization}/100</span>
                      </div>
                    )}
                    {scoreBreakdown.quality.code_patterns !== undefined && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Code Patterns</span>
                        <span className="font-bold text-foreground">{scoreBreakdown.quality.code_patterns}/100</span>
                      </div>
                    )}
                    {/* Repository stats */}
                    {(scoreBreakdown.quality.stars !== undefined || scoreBreakdown.quality.forks !== undefined) && (
                      <div className="mt-2 pt-2 border-t border-border space-y-1">
                        {scoreBreakdown.quality.stars !== undefined && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">GitHub Stars</span>
                            <span className="font-bold text-yellow-500">{scoreBreakdown.quality.stars}</span>
                          </div>
                        )}
                        {scoreBreakdown.quality.forks !== undefined && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">Forks</span>
                            <span className="font-bold text-blue-500">{scoreBreakdown.quality.forks}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Team Verification */}
          <div className="p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {isLegacyProject ? 'Verification' : 'Team Verification'}
                </span>
              </div>
              <span className="text-sm font-black text-primary">
                {(project.proofScore?.verification || 0).toFixed(1)}/20
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isLegacyProject
                ? 'Email verified, 0xCert connected, GitHub connected'
                : 'GitHub contributions, repo history, and reputation signals'}
            </p>

            {/* Collapsible Author Analysis Details */}
            {!isLegacyProject && scoreBreakdown?.verification && (
              <div className="mt-2">
                <button
                  onClick={() => setVerificationExpanded(!verificationExpanded)}
                  className="w-full flex items-center justify-between p-2 bg-primary/10 hover:bg-primary/20 rounded text-[10px] font-bold text-primary transition-smooth"
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Author Analysis Details
                  </span>
                  {verificationExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {verificationExpanded && (
                  <div className="mt-2 p-3 bg-secondary/50 rounded border border-border text-[10px] text-foreground leading-relaxed space-y-2">
                    {scoreBreakdown.verification.author_username && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">GitHub Username</span>
                        <a
                          href={`https://github.com/${scoreBreakdown.verification.author_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-primary hover:underline"
                        >
                          @{scoreBreakdown.verification.author_username}
                        </a>
                      </div>
                    )}
                    {scoreBreakdown.verification.public_repos !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Public Repositories</span>
                        <span className="font-bold text-foreground">{scoreBreakdown.verification.public_repos}</span>
                      </div>
                    )}
                    {scoreBreakdown.verification.followers !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Followers</span>
                        <span className="font-bold text-foreground">{scoreBreakdown.verification.followers}</span>
                      </div>
                    )}
                    {scoreBreakdown.verification.contributions_last_year !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contributions (last 12 months)</span>
                        <span className="font-bold text-foreground">
                          {scoreBreakdown.verification.contributions_last_year}
                        </span>
                      </div>
                    )}
                    {scoreBreakdown.verification.contributions_lifetime !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Lifetime Contributions</span>
                        <span className="font-bold text-foreground">
                          {scoreBreakdown.verification.contributions_lifetime}
                        </span>
                      </div>
                    )}
                    {scoreBreakdown.verification.contributions_error && (
                      <div className="pt-2 border-t border-border text-[9px] text-destructive">
                        Contribution data unavailable: {scoreBreakdown.verification.contributions_error}
                      </div>
                    )}
                    {scoreBreakdown.verification.account_age_days !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Account Age</span>
                        <span className="font-bold text-foreground">
                          {Math.floor(scoreBreakdown.verification.account_age_days / 365)} years {Math.floor((scoreBreakdown.verification.account_age_days % 365) / 30)} months
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-border">
                      <p className="text-muted-foreground">
                        <strong className="text-foreground">Analysis Method:</strong> Repository owner's GitHub profile reputation, public repositories, followers, account maturity, and profile completeness.
                      </p>
                    </div>
                    {scoreBreakdown.verification.error && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-red-500 text-[9px]">{scoreBreakdown.verification.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Validation / Validator Badges */}
          <div className="p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {scoreBreakdown?.validation?.mode === 'hybrid' ? (
                  <Award className="h-4 w-4 text-yellow-500" />
                ) : (
                  <Brain className="h-4 w-4 text-primary" />
                )}
                <span className="text-xs font-bold text-foreground">
                  {isLegacyProject
                    ? 'Validation'
                    : scoreBreakdown?.validation?.mode === 'hybrid'
                      ? 'Expert + AI Validation'
                      : 'AI Validation'}
                </span>
                {/* Info tooltip for hybrid mode */}
                {!isLegacyProject && scoreBreakdown?.validation?.mode === 'hybrid' && (
                  <div className="group relative">
                    <Info className="h-3 w-3 text-muted-foreground hover:text-primary cursor-help transition-smooth" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-72 p-3 bg-popover border border-border rounded-lg shadow-xl text-[10px] text-foreground">
                      <strong className="text-primary">Hybrid Validation Scoring</strong>
                      <p className="mt-1 text-muted-foreground leading-relaxed">
                        This project has expert validation! The score combines:
                      </p>
                      <div className="mt-2 space-y-1.5 text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Award className="h-3 w-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span><strong className="text-yellow-500">Expert Badge:</strong> {scoreBreakdown.validation.human_validator_score || 0}/20 pts from validator</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Brain className="h-3 w-3 text-blue-500 flex-shrink-0 mt-0.5" />
                          <span><strong className="text-blue-500">AI Analysis:</strong> {scoreBreakdown.validation.ai_score_normalized?.toFixed(1) || 0}/10 pts from market analysis</span>
                        </div>
                      </div>
                      <p className="mt-2 text-[9px] text-muted-foreground italic">
                        Without badges, AI provides full validation (0-30 pts).
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-sm font-black text-primary">
                {(project.proofScore?.validation || 0).toFixed(1)}/30
              </span>
            </div>

            {/* Hybrid mode breakdown - Show badge info */}
            {!isLegacyProject && scoreBreakdown?.validation?.mode === 'hybrid' && scoreBreakdown?.validation?.badges && (
              <div className="mb-2 space-y-1.5">
                {/* Badge info */}
                {scoreBreakdown.validation.badges.map((badge: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                    <Award className="h-3.5 w-3.5 text-yellow-500" />
                    <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase">
                      {badge.type} Badge
                    </span>
                    <span className="text-[10px] text-yellow-700 dark:text-yellow-300 ml-auto">
                      +{badge.points} pts
                    </span>
                  </div>
                ))}
                {/* Score split */}
                <div className="flex items-center gap-2 text-[10px] text-foreground mt-2">
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                    Expert: {scoreBreakdown.validation.human_validator_score || 0}/20
                  </span>
                  <span className="text-muted-foreground">+</span>
                  <span className="font-semibold text-blue-500">
                    AI: {scoreBreakdown.validation.ai_score_normalized?.toFixed(1) || 0}/10
                  </span>
                  <span className="text-muted-foreground">=</span>
                  <span className="font-black text-primary">
                    {(project.proofScore?.validation || 0).toFixed(1)}/30
                  </span>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">
              {isLegacyProject
                ? 'Badges from expert validators (Silver, Gold, Platinum)'
                : scoreBreakdown?.validation?.mode === 'hybrid'
                  ? 'Expert validator badge combined with AI market analysis'
                  : 'Market fit, competitive analysis, innovation, success criteria'}
            </p>

            {/* Collapsible AI Reasoning */}
            {!isLegacyProject && scoreBreakdown?.validation?.reasoning && (
              <div className="mt-2">
                <button
                  onClick={() => setReasoningExpanded(!reasoningExpanded)}
                  className="w-full flex items-center justify-between p-2 bg-primary/10 hover:bg-primary/20 rounded text-[10px] font-bold text-primary transition-smooth"
                >
                  <span className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3" />
                    AI Analysis Details
                  </span>
                  {reasoningExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {reasoningExpanded && (
                  <div className="mt-2 p-3 bg-secondary/50 rounded border border-border text-[10px] text-foreground leading-relaxed">
                    {scoreBreakdown.validation.reasoning}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Community Score */}
          <div className="p-3 bg-secondary/30 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Community Score</span>
              </div>
              <span className="text-sm font-black text-primary">
                {(project.proofScore?.community || 0).toFixed(1)}/30
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {isLegacyProject
                ? 'Upvote ratio and comment engagement'
                : `Upvotes: ${project.upvotes || 0} · Comments: ${project.commentCount || project.comment_count || 0}`}
            </p>

            {/* Collapsible Community Score Details */}
            {!isLegacyProject && (
              <div className="mt-2">
                <button
                  onClick={() => setCommunityExpanded(!communityExpanded)}
                  className="w-full flex items-center justify-between p-2 bg-primary/10 hover:bg-primary/20 rounded text-[10px] font-bold text-primary transition-smooth"
                >
                  <span className="flex items-center gap-1.5">
                    <Heart className="h-3 w-3" />
                    Score Calculation
                  </span>
                  {communityExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {communityExpanded && (
                  <div className="mt-2 p-3 bg-secondary/50 rounded border border-border space-y-2">
                    {/* Voting stats - USE LIVE PROJECT DATA */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Upvotes</span>
                        <span className="font-bold text-green-500">+{project.upvotes || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Downvotes</span>
                        <span className="font-bold text-red-500">-{project.downvotes || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Comments</span>
                        <span className="font-bold text-blue-500">{project.commentCount || project.comment_count || 0}</span>
                      </div>
                    </div>

                    {/* Calculation breakdown - USE LIVE PROJECT DATA */}
                    <div className="pt-2 border-t border-border space-y-1.5 text-[10px]">
                      <div className="font-bold text-foreground mb-1">Calculation:</div>
                      {(() => {
                        const upvotes = project.upvotes || 0;
                        const downvotes = project.downvotes || 0;
                        const comments = project.commentCount || project.comment_count || 0;
                        const totalVotes = upvotes + downvotes;
                        const upvoteRatio = totalVotes > 0 ? (upvotes / totalVotes) : 0;
                        const upvoteScore = upvoteRatio * 20;
                        const commentScore = Math.min(comments * 0.5, 10);

                        return (
                          <>
                            <div className="text-muted-foreground">
                              <strong className="text-foreground">Upvote Score:</strong> ({upvotes} / {totalVotes}) × 20 = <span className="text-primary font-bold">{upvoteScore.toFixed(1)}/20</span>
                            </div>
                            <div className="text-muted-foreground">
                              <strong className="text-foreground">Comment Score:</strong> {comments} × 0.5 (max 10) = <span className="text-primary font-bold">{commentScore.toFixed(1)}/10</span>
                            </div>
                            <div className="pt-1.5 mt-1.5 border-t border-border text-foreground font-bold">
                              Total: {upvoteScore.toFixed(1)} + {commentScore.toFixed(1)} = <span className="text-primary">{(upvoteScore + commentScore).toFixed(1)}/30</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="pt-2 border-t border-border text-[9px] text-muted-foreground italic">
                      Community engagement is calculated from upvote ratio (max 20 pts) + comment activity (max 10 pts)
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total Score Summary */}
          <div className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg border-2 border-primary/50 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="text-sm font-black text-foreground">
                  {isLegacyProject ? 'Total Score' : 'Total AI Score'}
                </span>
              </div>
              <span className="text-2xl font-black text-primary">
                {(project.proofScore?.total || 0).toFixed(1)}<span className="text-sm text-muted-foreground">/100</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Info for non-completed status (only for new projects) */}
      {!isLegacyProject && scoringStatus !== 'completed' && (
        <div className="p-3 bg-secondary/30 rounded border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Our AI system analyzes your GitHub repository, team credentials, market positioning, and innovation potential.
            The analysis typically completes in 30-60 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
