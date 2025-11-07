import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { votesService } from '@/services/api';
import { toast } from 'sonner';
import { useRef } from 'react';

export function useVote(projectId: string) {
  const queryClient = useQueryClient();
  const lastVoteTimeRef = useRef<number>(0);

  return useMutation({
    mutationFn: async (voteType: 'up' | 'down') => {
      // Debounce: Prevent spam clicks (minimum 300ms between votes)
      const now = Date.now();
      if (now - lastVoteTimeRef.current < 300) {
        throw new Error('Please wait before voting again');
      }
      lastVoteTimeRef.current = now;

      return votesService.vote(projectId, voteType);
    },

    // OPTIMISTIC UPDATE: Update UI immediately before server responds
    onMutate: async (voteType: 'up' | 'down') => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      await queryClient.cancelQueries({ queryKey: ['userVotes'] });

      // Snapshot the previous values for rollback
      const previousProject = queryClient.getQueryData(['project', projectId]);
      // Get all projects queries (different sort/page combinations)
      const previousProjectsQueries = queryClient.getQueriesData({ queryKey: ['projects'] });
      const previousUserVotes = queryClient.getQueryData(['userVotes']);

      // Get current user vote state
      const userVotes = queryClient.getQueryData(['userVotes']) as any[] || [];
      const existingVote = userVotes.find((v: any) => v.project_id === projectId);

      // Optimistically update project vote counts
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old?.data) return old;

        const project = { ...old.data };
        let upvotesDelta = 0;
        let downvotesDelta = 0;

        if (existingVote) {
          // User already voted - check if same type (remove) or different (change)
          if (existingVote.vote_type === voteType) {
            // Same type - remove vote
            if (voteType === 'up') {
              upvotesDelta = -1;
            } else {
              downvotesDelta = -1;
            }
          } else {
            // Different type - change vote
            if (existingVote.vote_type === 'up') {
              upvotesDelta = -1;
              downvotesDelta = 1;
            } else {
              upvotesDelta = 1;
              downvotesDelta = -1;
            }
          }
        } else {
          // No existing vote - add new vote
          if (voteType === 'up') {
            upvotesDelta = 1;
          } else {
            downvotesDelta = 1;
          }
        }

        project.upvotes = Math.max(0, (project.upvotes || 0) + upvotesDelta);
        project.downvotes = Math.max(0, (project.downvotes || 0) + downvotesDelta);
        project.user_vote = existingVote && existingVote.vote_type === voteType ? null : voteType;

        return { ...old, data: project };
      });

      // Also update projects list cache (for feed)
      queryClient.setQueriesData({ queryKey: ['projects'] }, (old: any) => {
        if (!old?.data?.data) return old;

        const projects = [...old.data.data];
        const projectIndex = projects.findIndex((p: any) => p.id === projectId);
        
        if (projectIndex !== -1) {
          const project = { ...projects[projectIndex] };
          let upvotesDelta = 0;
          let downvotesDelta = 0;

          if (existingVote) {
            if (existingVote.vote_type === voteType) {
              if (voteType === 'up') {
                upvotesDelta = -1;
              } else {
                downvotesDelta = -1;
              }
            } else {
              if (existingVote.vote_type === 'up') {
                upvotesDelta = -1;
                downvotesDelta = 1;
              } else {
                upvotesDelta = 1;
                downvotesDelta = -1;
              }
            }
          } else {
            if (voteType === 'up') {
              upvotesDelta = 1;
            } else {
              downvotesDelta = 1;
            }
          }

          project.upvotes = Math.max(0, (project.upvotes || 0) + upvotesDelta);
          project.downvotes = Math.max(0, (project.downvotes || 0) + downvotesDelta);
          project.voteCount = (project.upvotes || 0) - (project.downvotes || 0);
          project.user_vote = existingVote && existingVote.vote_type === voteType ? null : voteType;
          project.userVote = project.user_vote;

          projects[projectIndex] = project;
          return { ...old, data: { ...old.data, data: projects } };
        }

        return old;
      });

      // Optimistically update user votes
      queryClient.setQueryData(['userVotes'], (old: any[] = []) => {
        const filtered = old.filter((v: any) => v.project_id !== projectId);

        if (existingVote && existingVote.vote_type === voteType) {
          // Remove vote (same type clicked)
          return filtered;
        } else {
          // Add or update vote
          return [...filtered, { project_id: projectId, vote_type: voteType }];
        }
      });

      // Return context for rollback
      return { previousProject, previousProjectsQueries, previousUserVotes };
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, voteType, context) => {
      // Restore all cached data
      if (context?.previousProject) {
        queryClient.setQueryData(['project', projectId], context.previousProject);
      }
      if (context?.previousProjectsQueries) {
        // Restore all projects queries
        context.previousProjectsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousUserVotes) {
        queryClient.setQueryData(['userVotes'], context.previousUserVotes);
      }

      // Show error toast
      const errorMessage = error.response?.data?.message || error.message || 'Failed to vote';
      toast.error(errorMessage);
    },

    // SETTLED: Always refetch to ensure data consistency (but don't force refetch)
    onSettled: () => {
      // Mark queries as stale but don't force immediate refetch
      // This allows background refetch without blocking UI
      queryClient.invalidateQueries({ 
        queryKey: ['project', projectId],
        refetchType: 'none' // Don't refetch immediately
      });
      queryClient.invalidateQueries({ 
        queryKey: ['projects'],
        refetchType: 'none' // Don't refetch immediately
      });
      queryClient.invalidateQueries({ 
        queryKey: ['userVotes'],
        refetchType: 'none' // Don't refetch immediately
      });
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
