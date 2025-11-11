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

  // Ensure voteCount is always a valid number
  const normalizedVoteCount = typeof voteCount === 'number' ? voteCount : 0;

  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(userVote);
  const [currentCount, setCurrentCount] = useState(normalizedVoteCount);
  const pendingVoteRef = useRef<'up' | 'down' | null>(null);
  const voteTimerRef = useRef<NodeJS.Timeout | null>(null);

  // DEBUG: Log initial state
  console.log(`[INIT] VoteButtons for project ${projectId}: userVote=${userVote}, voteCount=${voteCount}, currentVote=${currentVote}, currentCount=${currentCount}`);

  useEffect(() => {
    setCurrentVote(userVote);
    setCurrentCount(typeof voteCount === 'number' ? voteCount : 0);
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

    // Debug logging
    console.log('🗳️ VOTE CLICK:', {
      voteType,
      wasVoted,
      currentVote,
      projectId
    });

    // Instant UI update (optimistic)
    if (wasVoted) {
      // Remove vote (toggle off) - still need to send the request!
      setCurrentVote(null);
      setCurrentCount(prev => {
        const result = voteType === 'up' ? prev - 1 : prev + 1;
        return isNaN(result) ? normalizedVoteCount : result;
      });
      // Still set the voteType so the API call is made to remove it from backend
      pendingVoteRef.current = voteType;
    } else if (currentVote) {
      // Change vote from opposite type
      setCurrentVote(voteType);
      setCurrentCount(prev => {
        let result = prev;
        if (currentVote === 'up' && voteType === 'down') result = prev - 2;
        else if (currentVote === 'down' && voteType === 'up') result = prev + 2;
        return isNaN(result) ? normalizedVoteCount : result;
      });
      pendingVoteRef.current = voteType; // Final state: new vote type
    } else {
      // New vote
      setCurrentVote(voteType);
      setCurrentCount(prev => {
        const result = voteType === 'up' ? prev + 1 : prev - 1;
        return isNaN(result) ? normalizedVoteCount : result;
      });
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

      // If final state matches current UI state, no need to send request
      // Use currentVote STATE (not userVote PROP) because prop updates are delayed
      if (finalVote === currentVote) {
        shouldSendRequest = false;
        console.log('📤 SKIP REQUEST (finalVote === currentVote):', {
          finalVote,
          currentVote,
          projectId
        });
      } else {
        console.log('📤 SENDING VOTE REQUEST:', {
          finalVote,
          currentVote,
          requestVoteType,
          shouldSendRequest,
          projectId
        });
      }

      if (shouldSendRequest && requestVoteType !== null) {
        // Send the final vote state
        console.log('✅ EXECUTING VOTE MUTATION:', requestVoteType);
        voteMutation.mutate(requestVoteType, {
          onError: (error) => {
            console.error('❌ VOTE ERROR:', {
              message: error?.message,
              status: error?.response?.status,
              data: error?.response?.data
            });
            // Only show error if it's not a duplicate key error
            const errorMsg = error?.response?.data?.message || error?.message || '';
            if (!errorMsg.includes('duplicate') && !errorMsg.includes('UniqueViolation')) {
              // Revert on actual errors
              console.log('⚠️ REVERTING VOTE:', previousVote, previousCount);
              setCurrentVote(previousVote);
              setCurrentCount(previousCount);
            }
            // For duplicate errors, ignore - UI is already in correct state
          },
          onSuccess: (response) => {
            console.log('✅ VOTE SUCCESS RESPONSE:', response?.data);
            // Sync with backend response - backend now always returns updated project data
            const data = response?.data?.data;
            if (data && typeof data === 'object') {
              const upvotes = typeof data.upvotes === 'number' ? data.upvotes : 0;
              const downvotes = typeof data.downvotes === 'number' ? data.downvotes : 0;
              const newCount = upvotes - downvotes;
              console.log('📊 UPDATED COUNTS:', { upvotes, downvotes, newCount });
              // Only update if we got valid numbers from backend
              if (!isNaN(newCount)) {
                setCurrentCount(newCount);
              }
              // Update user vote state from backend
              setCurrentVote(data.user_vote || null);
            } else {
              console.warn('⚠️ No valid data in response:', data);
            }
            onVoteChange?.();
          },
        });
      }

      pendingVoteRef.current = null;
    }, 500); // 500ms debounce - Instagram-style coalescing
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('up');
        }}
        type="button"
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all active:scale-95 border ${
          currentVote === 'up'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground'
        }`}
        title="Like project"
      >
        <ThumbsUp className="h-4 w-4" />
      </button>

      <span className="min-w-[3rem] text-center font-semibold tabular-nums">
        {isNaN(currentCount) || currentCount === undefined ? 0 : currentCount}
      </span>

      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleVote('down');
        }}
        type="button"
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-all active:scale-95 border ${
          currentVote === 'down'
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-secondary hover:bg-secondary/80 border-border text-muted-foreground hover:text-foreground'
        }`}
        title="Dislike project"
      >
        <ThumbsDown className="h-4 w-4" />
      </button>
    </div>
  );
}
