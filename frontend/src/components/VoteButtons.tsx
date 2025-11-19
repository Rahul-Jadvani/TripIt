import { useVote } from '@/hooks/useVotes';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';

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

  // Track which button is animating
  const [animatingButton, setAnimatingButton] = useState<'up' | 'down' | null>(null);

  const handleVote = (voteType: 'up' | 'down') => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (isOwnProject) {
      toast.info("You can't vote on your own project");
      return;
    }

    // Start animation
    setAnimatingButton(voteType);

    // Trigger vote mutation after animation
    setTimeout(() => {
      voteMutation.mutate(voteType, {
        onSuccess: () => {
          onVoteChange?.();
        },
        onSettled: () => {
          // End animation after vote completes
          setAnimatingButton(null);
        },
      });
    }, 150); // Slight delay for scale-up animation
  };

  // Disable for own projects OR during animation
  const isVoting = voteMutation.isPending || animatingButton !== null;
  const disableVoting = isOwnProject || isVoting;
  const upTitle = isOwnProject
    ? "You can't vote on your own project"
    : 'Like project';
  const downTitle = isOwnProject
    ? "You can't vote on your own project"
    : 'Dislike project';

  // Use props directly - parent will re-render when cache updates
  const normalizedCount = typeof voteCount === 'number' ? voteCount : 0;
  const finalDisplayCount = Number.isFinite(normalizedCount) ? normalizedCount : 0;
  const currentVote = userVote;

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
