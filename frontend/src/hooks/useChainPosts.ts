import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chainPostApi, CreateChainPostData } from '@/services/chainPostApi';
import type { ChainPostFilters } from '@/types';
import { toast } from 'sonner';
import { useRef } from 'react';

// ============================================================================
// CHAIN POST HOOKS
// ============================================================================

export function useChainPosts(slug: string, filters?: ChainPostFilters) {
  return useQuery({
    queryKey: ['chainPosts', slug, filters],
    queryFn: () => chainPostApi.getPosts(slug, filters),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

export function useChainPost(slug: string, postId: string, enabled = true) {
  return useQuery({
    queryKey: ['chainPost', slug, postId],
    queryFn: () => chainPostApi.getPost(slug, postId),
    select: (response) => response.data,
    enabled: !!slug && !!postId && enabled,
  });
}

export function useChainPostReplies(
  slug: string,
  postId: string,
  filters?: { page?: number; per_page?: number; sort?: 'top' | 'new' }
) {
  return useQuery({
    queryKey: ['chainPostReplies', slug, postId, filters],
    queryFn: () => chainPostApi.getPostReplies(slug, postId, filters),
    select: (response) => response.data,
    enabled: !!slug && !!postId,
  });
}

export function useCreateChainPost(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChainPostData) => chainPostApi.createPost(slug, data),
    onSuccess: (response, variables) => {
      // If it's a top-level post, invalidate posts list
      if (!variables.parent_id) {
        queryClient.invalidateQueries({ queryKey: ['chainPosts', slug] });
      } else {
        // If it's a reply, invalidate the parent post and its replies
        queryClient.invalidateQueries({ queryKey: ['chainPost', slug, variables.parent_id] });
        queryClient.invalidateQueries({ queryKey: ['chainPostReplies', slug, variables.parent_id] });
      }
      toast.success(variables.parent_id ? 'Reply posted!' : 'Post created!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create post');
    },
  });
}

export function useUpdateChainPost(slug: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateChainPostData>) => chainPostApi.updatePost(slug, postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chainPost', slug, postId] });
      queryClient.invalidateQueries({ queryKey: ['chainPosts', slug] });
      toast.success('Post updated!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update post');
    },
  });
}

export function useDeleteChainPost(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => chainPostApi.deletePost(slug, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chainPosts', slug] });
      toast.success('Post deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete post');
    },
  });
}

export function useReactToPost(slug: string) {
  const queryClient = useQueryClient();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingVoteRef = useRef<{ postId: string; reactionType: 'upvote' | 'downvote' | null } | null>(null);

  return useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: 'upvote' | 'downvote' }) => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Store the pending vote
      pendingVoteRef.current = { postId, reactionType };

      // Return a promise that resolves after debounce period
      return new Promise((resolve, reject) => {
        debounceTimerRef.current = setTimeout(async () => {
          try {
            if (pendingVoteRef.current) {
              const result = await chainPostApi.reactToPost(slug, postId, reactionType);
              pendingVoteRef.current = null;
              resolve(result);
            }
          } catch (error) {
            reject(error);
          }
        }, 300); // 300ms debounce
      });
    },
    onMutate: async ({ postId, reactionType }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['chainPost', slug, postId] });
      await queryClient.cancelQueries({ queryKey: ['chainPosts', slug] });

      // Snapshot the previous values
      const previousPost = queryClient.getQueryData(['chainPost', slug, postId]);
      const previousPostsQueries = queryClient.getQueriesData({ queryKey: ['chainPosts', slug] });

      // Helper function to calculate new vote counts
      const calculateNewCounts = (post: any) => {
        const currentReaction = post.user_reaction;
        let newUpvoteCount = post.upvote_count;
        let newDownvoteCount = post.downvote_count;
        let newUserReaction = reactionType;

        if (currentReaction === reactionType) {
          // Removing reaction
          if (reactionType === 'upvote') {
            newUpvoteCount = Math.max(0, newUpvoteCount - 1);
          } else {
            newDownvoteCount = Math.max(0, newDownvoteCount - 1);
          }
          newUserReaction = null;
        } else if (currentReaction && currentReaction !== reactionType) {
          // Changing reaction
          if (currentReaction === 'upvote') {
            newUpvoteCount = Math.max(0, newUpvoteCount - 1);
            newDownvoteCount += 1;
          } else {
            newDownvoteCount = Math.max(0, newDownvoteCount - 1);
            newUpvoteCount += 1;
          }
        } else {
          // Adding new reaction
          if (reactionType === 'upvote') {
            newUpvoteCount += 1;
          } else {
            newDownvoteCount += 1;
          }
        }

        return { newUpvoteCount, newDownvoteCount, newUserReaction };
      };

      // Optimistically update the single post
      queryClient.setQueryData(['chainPost', slug, postId], (old: any) => {
        if (!old?.data) return old;

        const post = old.data;
        const { newUpvoteCount, newDownvoteCount, newUserReaction } = calculateNewCounts(post);

        return {
          ...old,
          data: {
            ...post,
            upvote_count: newUpvoteCount,
            downvote_count: newDownvoteCount,
            user_reaction: newUserReaction,
          },
        };
      });

      // Helper function to update a post and its nested replies
      const updatePostRecursively = (post: any): any => {
        // Update this post if it matches
        if (post.id === postId) {
          const { newUpvoteCount, newDownvoteCount, newUserReaction } = calculateNewCounts(post);
          return {
            ...post,
            upvote_count: newUpvoteCount,
            downvote_count: newDownvoteCount,
            user_reaction: newUserReaction,
            replies: post.replies?.map(updatePostRecursively),
          };
        }

        // Update nested replies
        if (post.replies && post.replies.length > 0) {
          return {
            ...post,
            replies: post.replies.map(updatePostRecursively),
          };
        }

        return post;
      };

      // Optimistically update ALL posts list queries (with different filters)
      queryClient.setQueriesData(
        { queryKey: ['chainPosts', slug] },
        (old: any) => {
          if (!old?.data?.posts) return old;

          return {
            ...old,
            data: {
              ...old.data,
              posts: old.data.posts.map(updatePostRecursively),
            },
          };
        }
      );

      return { previousPost, previousPostsQueries };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(['chainPost', slug, _variables.postId], context.previousPost);
      }
      if (context?.previousPostsQueries) {
        // Restore all posts list queries
        context.previousPostsQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('Failed to update vote');
    },
    onSettled: (_data, _error, variables) => {
      // Refetch in background to sync with server
      queryClient.invalidateQueries({ queryKey: ['chainPost', slug, variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['chainPosts', slug] });
    },
  });
}

export function useTogglePinPost(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => chainPostApi.togglePinPost(slug, postId),
    onSuccess: (response, postId) => {
      queryClient.invalidateQueries({ queryKey: ['chainPost', slug, postId] });
      queryClient.invalidateQueries({ queryKey: ['chainPosts', slug] });
      toast.success(response.data.is_pinned ? 'Post pinned' : 'Post unpinned');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to pin post');
    },
  });
}

export function useToggleLockPost(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => chainPostApi.toggleLockPost(slug, postId),
    onSuccess: (response, postId) => {
      queryClient.invalidateQueries({ queryKey: ['chainPost', slug, postId] });
      queryClient.invalidateQueries({ queryKey: ['chainPosts', slug] });
      toast.success(response.data.is_locked ? 'Post locked' : 'Post unlocked');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to lock post');
    },
  });
}
