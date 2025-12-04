import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { votesService } from '@/services/api';
import { toast } from 'sonner';

const VOTE_KEY_PREFIX = 'userVote:';

function getCachedUserVote(projectId: string): 'up' | 'down' | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`${VOTE_KEY_PREFIX}${projectId}`);
  if (raw === 'up' || raw === 'down') return raw;
  return null;
}

function setCachedUserVote(projectId: string, vote: 'up' | 'down' | null) {
  if (typeof window === 'undefined') return;
  if (!vote) {
    localStorage.removeItem(`${VOTE_KEY_PREFIX}${projectId}`);
  } else {
    localStorage.setItem(`${VOTE_KEY_PREFIX}${projectId}`, vote);
  }
}

export function useVote(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (voteType: 'up' | 'down') => {
      return votesService.vote(projectId, voteType);
    },

    // INSTANT optimistic update
    onMutate: async (voteType: 'up' | 'down') => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });

      // Snapshot the previous value
      const previousProject = queryClient.getQueryData(['project', projectId]);

      // Optimistically update project detail
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old?.data) return old;

        const currentVote = old.data.user_vote || old.data.userVote;
        const currentUpvotes = old.data.upvotes || 0;
        const currentDownvotes = old.data.downvotes || 0;

        let newUpvotes = currentUpvotes;
        let newDownvotes = currentDownvotes;
        let newUserVote: string | null = voteType;

        // Same vote = remove
        if (currentVote === voteType) {
          if (voteType === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
          else newDownvotes = Math.max(0, newDownvotes - 1);
          newUserVote = null;
        }
        // Different vote = change
        else if (currentVote) {
          if (currentVote === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
          else newDownvotes = Math.max(0, newDownvotes - 1);
          if (voteType === 'up') newUpvotes++;
          else newDownvotes++;
        }
        // No vote = new
        else {
          if (voteType === 'up') newUpvotes++;
          else newDownvotes++;
        }

        setCachedUserVote(projectId, newUserVote as any);

        return {
          ...old,
          data: {
            ...old.data,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            voteCount: newUpvotes - newDownvotes,
            user_vote: newUserVote,
            userVote: newUserVote,
          }
        };
      });

      // ALSO update projects list cache
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old?.data) return old;

        const projects = old.data.map((project: any) => {
          if (project.id !== projectId) return project;

          const currentVote = project.user_vote || project.userVote;
          const currentUpvotes = project.upvotes || 0;
          const currentDownvotes = project.downvotes || 0;

        let newUpvotes = currentUpvotes;
        let newDownvotes = currentDownvotes;
        let newUserVote: string | null = voteType;

        if (currentVote === voteType) {
            if (voteType === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
            else newDownvotes = Math.max(0, newDownvotes - 1);
            newUserVote = null;
          } else if (currentVote) {
            if (currentVote === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
            else newDownvotes = Math.max(0, newDownvotes - 1);
            if (voteType === 'up') newUpvotes++;
            else newDownvotes++;
          } else {
            if (voteType === 'up') newUpvotes++;
            else newDownvotes++;
          }

          setCachedUserVote(projectId, newUserVote as any);

          return {
            ...project,
            upvotes: newUpvotes,
            downvotes: newDownvotes,
            voteCount: newUpvotes - newDownvotes,
            user_vote: newUserVote,
            userVote: newUserVote,
          };
        });

        return { ...old, data: projects };
      });

      return { previousProject, previousUserVote: getCachedUserVote(projectId) };
    },

    // On success: Reconcile with server response (only if backend returns vote counts)
    onSuccess: (response, voteType) => {
      const voteData = response?.data?.data;
      const hasCounts = voteData && (voteData.upvotes !== undefined || voteData.downvotes !== undefined || voteData.voteCount !== undefined);
      if (!voteData || !hasCounts) {
        // Safety ratings path returns no vote counts; keep optimistic state
        // Persist last action in cache for refresh scenarios
        setCachedUserVote(projectId, voteType);
        return;
      }

      // Update project detail cache with server truth
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            upvotes: voteData.upvotes || 0,
            downvotes: voteData.downvotes || 0,
            voteCount: voteData.voteCount || ((voteData.upvotes || 0) - (voteData.downvotes || 0)),
            user_vote: voteData.user_vote,
            userVote: voteData.user_vote,
          }
        };
      });

      // Update projects list cache with server truth
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old?.data) return old;

        const projects = old.data.map((project: any) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            upvotes: voteData.upvotes || 0,
            downvotes: voteData.downvotes || 0,
            voteCount: voteData.voteCount || ((voteData.upvotes || 0) - (voteData.downvotes || 0)),
            user_vote: voteData.user_vote,
            userVote: voteData.user_vote,
          };
        });

        return { ...old, data: projects };
      });

      setCachedUserVote(projectId, voteData.user_vote || null);
    },

    // On error: Rollback
    onError: (error: any, voteType, context) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to vote';
      toast.error(errorMessage);

      // Rollback
      if (context?.previousProject) {
        queryClient.setQueryData(['project', projectId], context.previousProject);
      }
      setCachedUserVote(projectId, context?.previousUserVote || null);
    },
  });
}

export function useUserVotes() {
  return useQuery({
    queryKey: ['userVotes'],
    queryFn: async () => {
      const response = await votesService.getUserVotes();
      return response.data?.data || [];
    },
    staleTime: 1000 * 60 * 2, // User votes fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchInterval: 1000 * 60, // Auto-refresh every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Keep old data visible
  });
}

// Legacy exports for backward compatibility
export function useUpvote(projectId: string) {
  const voteMutation = useVote(projectId);
  return {
    ...voteMutation,
    mutate: () => voteMutation.mutate('up'),
  };
}

export function useDownvote(projectId: string) {
  const voteMutation = useVote(projectId);
  return {
    ...voteMutation,
    mutate: () => voteMutation.mutate('down'),
  };
}

export function useRemoveVote(projectId: string) {
  const voteMutation = useVote(projectId);
  // Remove vote is same as clicking the same vote type again (handled by backend)
  return voteMutation;
}
