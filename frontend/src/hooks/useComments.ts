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
    author: backendComment.commenter ? {
      id: backendComment.commenter.id,
      username: backendComment.commenter.username,
      email: backendComment.commenter.email || '',
      displayName: backendComment.commenter.display_name,
      avatar: backendComment.commenter.avatar_url,
      bio: backendComment.commenter.bio,
      isVerified: backendComment.commenter.email_verified || false,
      isAdmin: backendComment.commenter.is_admin || false,
      walletAddress: backendComment.commenter.wallet_address,
      createdAt: backendComment.commenter.created_at,
      updatedAt: backendComment.commenter.updated_at || backendComment.commenter.created_at,
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

export function useComments(projectId: string, altProjectId?: string) {
  return useQuery({
    queryKey: ['comments', projectId],
    queryFn: async () => {
      const safe = async (fn: () => Promise<any[]>): Promise<any[]> => {
        try {
          const out = await fn();
          return Array.isArray(out) ? out : [];
        } catch {
          return [];
        }
      };
      // Primary endpoint
      const tryPrimary = async () => {
        const res = await commentsService.getByProject(projectId);
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data || {}).data)
            ? (res.data as any).data
            : Array.isArray((res.data || {}).comments)
              ? (res.data as any).comments
              : [];
        return raw;
      };

      const tryFallback = async () => {
        const res = await commentsService.getByProjectPath(projectId);
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data || {}).data)
            ? (res.data as any).data
            : Array.isArray((res.data || {}).comments)
              ? (res.data as any).comments
              : [];
        return raw;
      };

      const tryNested = async () => {
        const res = await commentsService.getByProjectNested(projectId);
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data || {}).data)
            ? (res.data as any).data
            : Array.isArray((res.data || {}).comments)
              ? (res.data as any).comments
              : [];
        return raw;
      };

      const tryNestedAlt = async () => {
        const res = await commentsService.getByProjectNestedAlt(projectId);
        const raw = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data || {}).data)
            ? (res.data as any).data
            : Array.isArray((res.data || {}).comments)
              ? (res.data as any).comments
              : [];
        return raw;
      };

      let raw = await safe(tryPrimary);
      if (!Array.isArray(raw) || raw.length === 0) {
        const fb = await safe(tryFallback);
        if (Array.isArray(fb) && fb.length) raw = fb;
      }
      if (!Array.isArray(raw) || raw.length === 0) {
        const nb = await safe(tryNested);
        if (Array.isArray(nb) && nb.length) raw = nb;
      }
      if (!Array.isArray(raw) || raw.length === 0) {
        const nb2 = await safe(tryNestedAlt);
        if (Array.isArray(nb2) && nb2.length) raw = nb2;
      }

      // Try again with alternative id if provided
      if ((!Array.isArray(raw) || raw.length === 0) && altProjectId) {
        const using = altProjectId;
        const altPrimary = async () => {
          const res = await commentsService.getByProject(using);
          const arr = Array.isArray(res.data)
            ? res.data
            : Array.isArray((res.data || {}).data)
              ? (res.data as any).data
              : Array.isArray((res.data || {}).comments)
                ? (res.data as any).comments
                : [];
          return arr;
        };
        const altPath = async () => {
          const res = await commentsService.getByProjectPath(using);
          const arr = Array.isArray(res.data)
            ? res.data
            : Array.isArray((res.data || {}).data)
              ? (res.data as any).data
              : Array.isArray((res.data || {}).comments)
                ? (res.data as any).comments
                : [];
          return arr;
        };
        const altNested = async () => {
          const res = await commentsService.getByProjectNested(using);
          const arr = Array.isArray(res.data)
            ? res.data
            : Array.isArray((res.data || {}).data)
              ? (res.data as any).data
              : Array.isArray((res.data || {}).comments)
                ? (res.data as any).comments
                : [];
          return arr;
        };
        const altNested2 = async () => {
          const res = await commentsService.getByProjectNestedAlt(using);
          const arr = Array.isArray(res.data)
            ? res.data
            : Array.isArray((res.data || {}).data)
              ? (res.data as any).data
              : Array.isArray((res.data || {}).comments)
                ? (res.data as any).comments
                : [];
          return arr;
        };
        let a = await safe(altPrimary); if (a?.length) raw = a;
        if (!raw?.length) { a = await safe(altPath); if (a?.length) raw = a; }
        if (!raw?.length) { a = await safe(altNested); if (a?.length) raw = a; }
        if (!raw?.length) { a = await safe(altNested2); if (a?.length) raw = a; }
      }

      return { data: (raw || []).map(transformComment) } as any;
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // Comments stay fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchInterval: false, // NO polling - Socket.IO handles invalidation
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: 'always', // Always check for fresh data
    placeholderData: (previousData) => previousData, // Keep old data visible
  });
}

export function useCreateComment(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => commentsService.create({
      ...data,
      // Be liberal with field names for compatibility
      project_id: projectId,
      projectId: projectId,
      comment: data.content,
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
      const real = response?.data?.data ? transformComment(response.data.data) : null;
      if (real) {
        queryClient.setQueryData(['comments', projectId], (old: any) => {
          if (!old || !Array.isArray(old.data)) return { data: [real] };
          // Remove any temp optimistic entries matching content and author 'You'
          const filtered = old.data.filter((c: any) => !c._isOptimistic);
          return { ...old, data: [real, ...filtered] };
        });
      } else {
        // Fallback to refetch
        queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      }
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Comment posted!');
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

    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
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
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      toast.success('Comment updated!');
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, updatedData, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }
      toast.error(error.response?.data?.message || 'Failed to update comment');
    },

    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
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
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
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

    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
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

    // SUCCESS: Refetch to ensure consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
      // Silent success - no toast to avoid spam
    },

    // ROLLBACK: On error, restore previous state
    onError: (error: any, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', projectId], context.previousComments);
      }
      toast.error(error.response?.data?.message || 'Failed to vote on comment');
    },

    // Always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
    },
  });
}

