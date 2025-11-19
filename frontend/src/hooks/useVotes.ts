import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { votesService } from '@/services/api';
import { toast } from 'sonner';
import { useRef } from 'react';

export function useVote(projectId: string) {
  const queryClient = useQueryClient();
  const lastVoteTimeRef = useRef<number>(0);
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  return useMutation({
    mutationFn: async (voteType: 'up' | 'down') => {
      return votesService.vote(projectId, voteType);
    },

    // On success: Update cache with server response (single source of truth)
    onSuccess: (response) => {
      const voteData = response?.data?.data;
      if (!voteData) return;

      console.log('[Vote] Server response:', {
        upvotes: voteData.upvotes,
        downvotes: voteData.downvotes,
        user_vote: voteData.user_vote,
        action: voteData.action
      });

      // Update project detail cache - REPLACE with server truth
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,  // Keep existing project fields
            upvotes: voteData.upvotes,
            downvotes: voteData.downvotes,
            voteCount: voteData.voteCount,
            user_vote: voteData.user_vote,
            userVote: voteData.user_vote,
          }
        };
      });

      // Update projects list cache - REPLACE with server truth
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old?.data?.data) return old;
        const projects = old.data.data.map((p: any) => {
          if (p.id === projectId) {
            return {
              ...p,  // Keep existing project fields
              upvotes: voteData.upvotes,
              downvotes: voteData.downvotes,
              voteCount: voteData.voteCount,
              user_vote: voteData.user_vote,
              userVote: voteData.user_vote,
            };
          }
          return p;
        });
        return { ...old, data: { ...old.data, data: projects } };
      });

      // Update user votes
      queryClient.setQueryData(['userVotes'], (old: any[] = []) => {
        const filtered = old.filter((v: any) => v.project_id !== projectId);
        if (voteData.user_vote) {
          return [...filtered, { project_id: projectId, vote_type: voteData.user_vote }];
        }
        return filtered;
      });
    },

    // On error: Show toast
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to vote';
      toast.error(errorMessage);

      // Invalidate to refetch correct state
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
