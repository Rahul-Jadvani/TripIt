import { useVote } from '@/hooks/useVotes';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface VoteButtonsProps {
  projectId: string;
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  onVoteChange?: () => void;
  projectOwnerId?: string;
}

export function VoteButtons({
  projectId,
  voteCount,
  userVote = null,
  onVoteChange,
  projectOwnerId,
}: VoteButtonsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const voteMutation = useVote(projectId);
  const isOwnProject = Boolean(projectOwnerId && user?.id === projectOwnerId);

  // Track which button is animating
  const [animatingButton, setAnimatingButton] = useState<'up' | 'down' | null>(null);

  // Read live vote data from cache (updates when cache changes)
  const [liveVoteCount, setLiveVoteCount] = useState(voteCount);
  const [liveUserVote, setLiveUserVote] = useState<'up' | 'down' | null>(userVote);

  // Subscribe to cache changes for THIS project
  useEffect(() => {
    console.log('[VoteButtons] Setting up cache subscription for project:', projectId);

    // Initial read
    const projectData = queryClient.getQueryData(['project', projectId]) as any;
    if (projectData?.data) {
      const data = projectData.data;
      const newCount = (data.upvotes || 0) - (data.downvotes || 0);
      const newVote = data.user_vote || data.userVote || null;
      console.log('[VoteButtons] Initial cache read:', { upvotes: data.upvotes, downvotes: data.downvotes, newCount, newVote });
      setLiveVoteCount(newCount);
      setLiveUserVote(newVote);
    }

    // Subscribe to ALL cache updates (both ['project', id] and ['projects', ...])
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const queryKey = event?.query?.queryKey;
      if (!queryKey) return;

      let shouldUpdate = false;

      // Check if this is a single project update
      if (queryKey[0] === 'project' && queryKey[1] === projectId) {
        console.log('[VoteButtons] Cache updated for project detail:', projectId, event.type);
        shouldUpdate = true;
      }

      // Check if this is a projects list update (contains our project)
      if (queryKey[0] === 'projects') {
        console.log('[VoteButtons] Cache updated for projects list, checking for project:', projectId);
        const projectsData = queryClient.getQueryData(queryKey as any) as any;
        if (projectsData?.data) {
          const projects = Array.isArray(projectsData.data) ? projectsData.data : [];
          const ourProject = projects.find((p: any) => p.id === projectId);
          if (ourProject) {
            console.log('[VoteButtons] Found our project in list, updating:', ourProject);
            const newCount = (ourProject.upvotes || 0) - (ourProject.downvotes || 0);
            const newVote = ourProject.user_vote || ourProject.userVote || null;
            console.log('[VoteButtons] Updating from projects list:', { upvotes: ourProject.upvotes, downvotes: ourProject.downvotes, newCount, newVote });
            setLiveVoteCount(newCount);
            setLiveUserVote(newVote);
            return; // Early return, we found it in the list
          }
        }
      }

      // If this was a project detail update, read from that cache
      if (shouldUpdate) {
        const projectData = queryClient.getQueryData(['project', projectId]) as any;
        if (projectData?.data) {
          const data = projectData.data;
          const newCount = (data.upvotes || 0) - (data.downvotes || 0);
          const newVote = data.user_vote || data.userVote || null;
          console.log('[VoteButtons] Updating from project detail:', { upvotes: data.upvotes, downvotes: data.downvotes, newCount, newVote });
          setLiveVoteCount(newCount);
          setLiveUserVote(newVote);
        }
      }
    });

    return () => {
      console.log('[VoteButtons] Cleaning up cache subscription');
      unsubscribe();
    };
  }, [queryClient, projectId]);

  // Rate limiting (prevent spam)
  const lastVoteTimeRef = useRef<number>(0);
  const MIN_VOTE_INTERVAL = 300; // Minimum 300ms between votes

  const handleVote = useCallback((voteType: 'up' | 'down') => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isOwnProject) {
      toast.info("You can't vote on your own project");
      return;
    }

    // Check minimum interval between votes (prevent spam)
    const now = Date.now();
    const timeSinceLastVote = now - lastVoteTimeRef.current;

    if (timeSinceLastVote < MIN_VOTE_INTERVAL) {
      return;
    }

    lastVoteTimeRef.current = now;

    console.log('[VoteButtons] Triggering vote mutation:', voteType, 'for project:', projectId);

    // Start animation immediately
    setAnimatingButton(voteType);

    // Trigger vote mutation IMMEDIATELY (optimistic update happens instantly)
    voteMutation.mutate(voteType);

    // End animation after brief delay
    setTimeout(() => setAnimatingButton(null), 150);

    // Call parent callback
    onVoteChange?.();
  }, [user, navigate, isOwnProject, voteMutation, onVoteChange]);

  // Disable for own projects OR during animation
  const isVoting = voteMutation.isPending || animatingButton !== null;
  const disableVoting = isOwnProject || isVoting;
  const upTitle = isOwnProject
    ? "You can't vote on your own project"
    : 'Like project';
  const downTitle = isOwnProject
    ? "You can't vote on your own project"
    : 'Dislike project';

  // Use live data from cache (updates immediately)
  const normalizedCount = typeof liveVoteCount === 'number' ? liveVoteCount : 0;
  const finalDisplayCount = Number.isFinite(normalizedCount) ? normalizedCount : 0;
  const currentVote = liveUserVote;

  // Debug: Log when display values change
  useEffect(() => {
    console.log('[VoteButtons] Display update:', {
      projectId,
      finalDisplayCount,
      currentVote,
      liveVoteCount,
      liveUserVote
    });
  }, [projectId, finalDisplayCount, currentVote, liveVoteCount, liveUserVote]);

  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-2.5 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('up');
        }}
        disabled={disableVoting}
        type="button"
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-transform duration-150 border ${
          animatingButton === 'up'
            ? 'scale-125'
            : disableVoting
            ? 'bg-secondary/50 border-border text-muted-foreground cursor-not-allowed opacity-50'
            : currentVote === 'up'
            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 active:scale-95'
            : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground active:scale-95'
        }`}
        style={{
          backgroundColor: animatingButton === 'up'
            ? currentVote === 'up'
              ? 'var(--primary)'
              : 'var(--secondary)'
            : undefined,
          borderColor: animatingButton === 'up'
            ? currentVote === 'up'
              ? 'var(--primary)'
              : 'var(--border)'
            : undefined,
        }}
        title={upTitle}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>

      <span className="min-w-[3rem] text-center font-semibold tabular-nums">
        {finalDisplayCount}
      </span>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('down');
        }}
        disabled={disableVoting}
        type="button"
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-transform duration-150 border ${
          animatingButton === 'down'
            ? 'scale-125'
            : disableVoting
            ? 'bg-secondary/50 border-border text-muted-foreground cursor-not-allowed opacity-50'
            : currentVote === 'down'
            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 active:scale-95'
            : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground active:scale-95'
        }`}
        style={{
          backgroundColor: animatingButton === 'down'
            ? currentVote === 'down'
              ? 'var(--primary)'
              : 'var(--secondary)'
            : undefined,
          borderColor: animatingButton === 'down'
            ? currentVote === 'down'
              ? 'var(--primary)'
              : 'var(--border)'
            : undefined,
        }}
        title={downTitle}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
