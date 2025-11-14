import { useVote } from '@/hooks/useVotes';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
  const voteMutation = useVote(projectId);
  const isOwnProject = Boolean(projectOwnerId && user?.id === projectOwnerId);

  const normalizedVoteCount = typeof voteCount === 'number' ? voteCount : 0;
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(userVote);
  const [currentCount, setCurrentCount] = useState<number>(normalizedVoteCount);

  useEffect(() => {
    setCurrentVote(userVote);
  }, [userVote]);

  useEffect(() => {
    setCurrentCount(normalizedVoteCount);
  }, [normalizedVoteCount]);

  const handleVote = (voteType: 'up' | 'down') => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isOwnProject) {
      toast.info("You can't vote on your own project");
      return;
    }

    const previousVote = currentVote;
    const previousCount = currentCount;
    const baseCount = Number.isFinite(previousCount) ? (previousCount as number) : 0;

    let nextVote: 'up' | 'down' | null = voteType;
    let nextCount = baseCount;

    if (currentVote === voteType) {
      // Toggle off the same vote
      nextVote = null;
      nextCount += voteType === 'up' ? -1 : 1;
    } else if (currentVote && currentVote !== voteType) {
      // Switching directions alters the count by 2
      nextVote = voteType;
      nextCount += voteType === 'up' ? 2 : -2;
    } else {
      // Fresh vote
      nextCount += voteType === 'up' ? 1 : -1;
    }

    setCurrentVote(nextVote);
    setCurrentCount(nextCount);

    voteMutation.mutate(voteType, {
      onError: () => {
        setCurrentVote(previousVote);
        setCurrentCount(previousCount);
      },
      onSuccess: (response) => {
        const data = response?.data?.data;
        if (data) {
          const upvotes = Number(data.upvotes) || 0;
          const downvotes = Number(data.downvotes) || 0;
          setCurrentCount(upvotes - downvotes);
          setCurrentVote(data.user_vote || null);
        }
        onVoteChange?.();
      },
    });
  };

  const disableVoting = isOwnProject || voteMutation.isPending;
  const upTitle = isOwnProject
    ? "You can't vote on your own project"
    : voteMutation.isPending
    ? 'Syncing vote...'
    : 'Like project';
  const downTitle = isOwnProject
    ? "You can't vote on your own project"
    : voteMutation.isPending
    ? 'Syncing vote...'
    : 'Dislike project';
  const displayCount = Number.isFinite(currentCount) ? currentCount : 0;

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
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all active:scale-95 border ${
          disableVoting
            ? 'bg-secondary/50 border-border text-muted-foreground cursor-not-allowed opacity-50'
            : currentVote === 'up'
            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 active:scale-95'
            : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground active:scale-95'
        }`}
        title={upTitle}
      >
        <ThumbsUp className="h-4 w-4" />
      </button>

      <span className="min-w-[3rem] text-center font-semibold tabular-nums">
        {displayCount}
      </span>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('down');
        }}
        disabled={disableVoting}
        type="button"
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all active:scale-95 border ${
          disableVoting
            ? 'bg-secondary/50 border-border text-muted-foreground cursor-not-allowed opacity-50'
            : currentVote === 'down'
            ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 active:scale-95'
            : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground active:scale-95'
        }`}
        title={downTitle}
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
