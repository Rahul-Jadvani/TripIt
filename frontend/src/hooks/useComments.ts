import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsService } from '@/services/api';
import { toast } from 'sonner';

// Transform backend comment data to frontend format
function transformComment(backendComment: any) {
  return {
    id: backendComment.id,
    content: backendComment.content,
    projectId: backendComment.project_id,
    authorId: backendComment.user_id,
    author: backendComment.author ? {
      id: backendComment.author.id,
      username: backendComment.author.username,
      email: backendComment.author.email || '',
      displayName: backendComment.author.display_name,
      avatar: backendComment.author.avatar_url,
      bio: backendComment.author.bio,
      isVerified: backendComment.author.email_verified || false,
      isAdmin: backendComment.author.is_admin || false,
      walletAddress: backendComment.author.wallet_address,
      createdAt: backendComment.author.created_at,
      updatedAt: backendComment.author.updated_at || backendComment.author.created_at,
    } : {
      id: backendComment.user_id,
      username: 'Unknown',
      email: '',
      isVerified: false,
      isAdmin: false,
      createdAt: '',
      updatedAt: '',
    },
    upvotes: backendComment.upvotes || 0,
    downvotes: backendComment.downvotes || 0,
    createdAt: backendComment.created_at,
    updatedAt: backendComment.updated_at,
  };
}

export function useComments(projectId: string) {
  return useQuery({
    queryKey: ['comments', projectId],
    queryFn: async () => {
      // Single, clean endpoint with standardized response format
      const res = await commentsService.getByProject(projectId);

      // Backend returns paginated_response: { status, message, data: [...], pagination: {...} }
      // So res.data.data contains the comments array
      const raw = res.data?.data || [];

      // Transform each comment to frontend format
      return { data: (Array.isArray(raw) ? raw : []).map(transformComment) } as any;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10, // Comments stay fresh for 10 minutes (match backend cache TTL of 600s)
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
    refetchInterval: false, // NO polling - Socket.IO handles invalidation
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: false, // Don't force refetch on mount - use staleTime instead
    placeholderData: (previousData) => previousData, // Keep old data visible during refetch
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

export function useCreateComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => commentsService.create({
      project_id: projectId,
      content: data.content,
    }),

    // OPTIMISTIC UPDATE: Show comment immediately
    onMutate: async (newComment) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });

      // Snapshot previous values for rollback
      const previousComments = queryClient.getQueryData(['comments', projectId]);
      const previousProject = queryClient.getQueryData(['project', projectId]);

      // Get current user info from cache (should be available from auth)
      const currentUser = queryClient.getQueryData(['currentUser']) as any;

      // Create optimistic comment with temporary ID
      const optimisticComment = {
        id: `temp-${Date.now()}`, // Temporary ID
        content: newComment.content,
        projectId: projectId,
        authorId: currentUser?.id || 'unknown',
        author: currentUser ? {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email || '',
          displayName: currentUser.displayName || currentUser.username,
          avatar: currentUser.avatar,
          bio: currentUser.bio,
          isVerified: currentUser.isVerified || false,
          isAdmin: currentUser.isAdmin || false,
          walletAddress: currentUser.walletAddress,
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt,
        } : {
          id: 'unknown',
          username: 'You',
          email: '',
          isVerified: false,
          isAdmin: false,
          createdAt: '',
          updatedAt: '',
        },
        upvotes: 0,
        downvotes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _isOptimistic: true, // Flag to identify optimistic comments
      };

      // Optimistically add comment to cache (create structure if missing)
      queryClient.setQueryData(['comments', projectId], (old: any) => {
        if (!old || !Array.isArray(old.data)) {
          return { data: [optimisticComment] };
        }
        return { ...old, data: [optimisticComment, ...old.data] };
      });

      // Optimistically increment comment count
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            commentCount: (old.data.commentCount || 0) + 1,
          },
        };
      });

      return { previousComments, previousProject };
    },

    // SUCCESS: Replace optimistic comment with real one
    onSuccess: (response) => {
      // Handle both nested and flat response structures
      const commentData = response?.data?.data || response?.data || null;
      const real = commentData ? transformComment(commentData) : null;

      if (real) {
        // Update cache with real comment, removing optimistic placeholder
        queryClient.setQueryData(['comments', projectId], (old: any) => {
          if (!old || !Array.isArray(old.data)) return { data: [real] };

          // Remove optimistic comment with same content (more reliable than ID matching)
          const filtered = old.data.filter((c: any) => {
            // Keep real comments (those without _isOptimistic flag)
            // Remove optimistic ones to prevent duplicates
            return !c._isOptimistic;
          });

          // Add the real comment at the beginning
          return { ...old, data: [real, ...filtered] };
        });
        toast.success('Comment posted!');
      } else {
        // Fallback: if we can't parse the response, refetch to be safe
        queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
        toast.success('Comment posted!');
      }

      // Invalidate project cache to update comment count
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, newComment, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(['project', projectId], context.previousProject);
      }
      toast.error(error.response?.data?.message || 'Failed to post comment');
    },

    // Do NOT invalidate comments cache here - we already updated it in onSuccess
    // Only project cache needs invalidation for comment count
    onSettled: () => {
      // No invalidation here - prevents unnecessary refetches
      // The real data was already merged in onSuccess
    },
  });
}

export function useUpdateComment(commentId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => commentsService.update(commentId, data),

    // OPTIMISTIC UPDATE: Show edited comment immediately
    onMutate: async (updatedData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });

      // Snapshot previous value for rollback
      const previousComments = queryClient.getQueryData(['comments', projectId]);

      // Optimistically update the comment
      queryClient.setQueryData(['comments', projectId], (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((comment: any) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                content: updatedData.content,
                updatedAt: new Date().toISOString(),
              };
            }
            return comment;
          }),
        };
      });

      return { previousComments };
    },

    // SUCCESS
    onSuccess: () => {
      // Cache already updated in onMutate, no need to refetch
      toast.success('Comment updated!');
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, updatedData, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }
      toast.error(error.response?.data?.message || 'Failed to update comment');
    },

    // Don't invalidate - we already updated the cache in onMutate
    onSettled: () => {
      // No action needed - optimistic update already applied
    },
  });
}

export function useDeleteComment(commentId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id?: string) => commentsService.delete(id || commentId),

    // OPTIMISTIC UPDATE: Remove comment immediately
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });
      await queryClient.cancelQueries({ queryKey: ['project', projectId] });

      // Snapshot previous values for rollback
      const previousComments = queryClient.getQueryData(['comments', projectId]);
      const previousProject = queryClient.getQueryData(['project', projectId]);

      // Optimistically remove the comment
      queryClient.setQueryData(['comments', projectId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((comment: any) => comment.id !== commentId),
        };
      });

      // Optimistically decrement comment count
      queryClient.setQueryData(['project', projectId], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: {
            ...old.data,
            commentCount: Math.max(0, (old.data.commentCount || 0) - 1),
          },
        };
      });

      return { previousComments, previousProject };
    },

    // SUCCESS
    onSuccess: () => {
      // Cache already updated in onMutate, no need to refetch
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Comment deleted!');
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(['project', projectId], context.previousProject);
      }
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    },

    // Don't invalidate - we already updated the cache in onMutate
    onSettled: () => {
      // No action needed - optimistic update already applied
    },
  });
}

export function useVoteComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, voteType }: { commentId: string; voteType: 'up' | 'down' }) =>
      commentsService.vote(commentId, voteType),

    // OPTIMISTIC UPDATE: Update vote counts immediately
    onMutate: async ({ commentId, voteType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', projectId] });

      // Snapshot previous value for rollback
      const previousComments = queryClient.getQueryData(['comments', projectId]);

      // Optimistically update the comment's vote count
      queryClient.setQueryData(['comments', projectId], (old: any) => {
        if (!old?.data) return old;

        return {
          ...old,
          data: old.data.map((comment: any) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                upvotes: voteType === 'up' ? (comment.upvotes || 0) + 1 : comment.upvotes,
                downvotes: voteType === 'down' ? (comment.downvotes || 0) + 1 : comment.downvotes,
              };
            }
            return comment;
          }),
        };
      });

      return { previousComments };
    },

    // SUCCESS: Cache already updated in onMutate
    onSuccess: () => {
      // Silent success - no toast to avoid spam
      // Cache already updated optimistically
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }
      toast.error(error.response?.data?.message || 'Failed to vote on comment');
    },

    // Don't invalidate - we already updated the cache in onMutate
    onSettled: () => {
      // No action needed - optimistic update already applied
    },
  });
}

