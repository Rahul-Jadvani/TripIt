import { useVote } from '@/hooks/useVotes';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

interface VoteButtonsProps {
  projectId: string;
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  onVoteChange?: () => void;
}

export function VoteButtons({ projectId, voteCount, userVote = null, onVoteChange }: VoteButtonsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const voteMutation = useVote(projectId);
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(userVote);
  const [currentCount, setCurrentCount] = useState(voteCount);
  const pendingVoteRef = useRef<'up' | 'down' | null>(null);
  const voteTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentVote(userVote);
    setCurrentCount(voteCount);
  }, [userVote, voteCount]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (voteTimerRef.current) {
        clearTimeout(voteTimerRef.current);
      }
    };
  }, []);

  const handleVote = (voteType: 'up' | 'down') => {
    if (!user) {
      navigate('/login');
      return;
    }

    const wasVoted = currentVote === voteType;
    const previousVote = currentVote;
    const previousCount = currentCount;

    // Instant UI update (optimistic)
    if (wasVoted) {
      // Remove vote (toggle off)
      setCurrentVote(null);
      setCurrentCount(prev => voteType === 'up' ? prev - 1 : prev + 1);
      pendingVoteRef.current = null; // Final state: no vote
    } else if (currentVote) {
      // Change vote from opposite type
      setCurrentVote(voteType);
      setCurrentCount(prev => {
        if (currentVote === 'up' && voteType === 'down') return prev - 2;
        if (currentVote === 'down' && voteType === 'up') return prev + 2;
        return prev;
      });
      pendingVoteRef.current = voteType; // Final state: new vote type
    } else {
      // New vote
      setCurrentVote(voteType);
      setCurrentCount(prev => voteType === 'up' ? prev + 1 : prev - 1);
      pendingVoteRef.current = voteType; // Final state: new vote
    }

    // Clear existing timer
    if (voteTimerRef.current) {
      clearTimeout(voteTimerRef.current);
    }

    // Debounce: wait 500ms after last click before sending request
    // This coalesces multiple rapid clicks into ONE final request
    voteTimerRef.current = setTimeout(() => {
      const finalVote = pendingVoteRef.current;

      // Determine what request to send based on final state
      let shouldSendRequest = true;
      let requestVoteType: 'up' | 'down' | null = finalVote;

      // If final state matches original state, no need to send request
      if (finalVote === userVote) {
        shouldSendRequest = false;
      }

      if (shouldSendRequest && requestVoteType !== null) {
        // Send the final vote state
        voteMutation.mutate(requestVoteType, {
          onError: (error) => {
            // Only show error if it's not a duplicate key error
            const errorMsg = error?.response?.data?.message || error?.message || '';
            if (!errorMsg.includes('duplicate') && !errorMsg.includes('UniqueViolation')) {
              // Revert on actual errors
              setCurrentVote(previousVote);
              setCurrentCount(previousCount);
            }
            // For duplicate errors, ignore - UI is already in correct state
          },
          onSuccess: (response) => {
            // Sync with backend response
            const data = response?.data?.data;
            if (data) {
              const newCount = (data.upvotes || 0) - (data.downvotes || 0);
              setCurrentCount(newCount);
              setCurrentVote(data.user_vote || null);
            } else {
              // Vote was removed (backend returns null)
              setCurrentVote(null);
            }
            onVoteChange?.();
          },
        });
      }

      pendingVoteRef.current = null;
    }, 500); // 500ms debounce - Instagram-style coalescing
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3">
      <Button
        variant={currentVote === 'up' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleVote('up')}
        className="h-8 w-8 p-0 transition-all active:scale-95"
      >
        <ThumbsUp className="h-4 w-4" />
      </Button>

      <span className="min-w-[3rem] text-center font-semibold tabular-nums">
        {currentCount}
      </span>

      <Button
        variant={currentVote === 'down' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => handleVote('down')}
        className="h-8 w-8 p-0 transition-all active:scale-95"
      >
        <ThumbsDown className="h-4 w-4" />
      </Button>
    </div>
  );
}
