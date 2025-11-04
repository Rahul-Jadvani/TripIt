import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chainApi, CreateChainData } from '@/services/chainApi';
import type { ChainFilters } from '@/types';
import { toast } from 'sonner';

// ============================================================================
// CHAIN CRUD HOOKS
// ============================================================================

export function useChains(filters?: ChainFilters) {
  return useQuery({
    queryKey: ['chains', filters],
    queryFn: () => chainApi.getChains(filters),
    select: (response) => response.data,
  });
}

export function useChain(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['chain', slug],
    queryFn: () => chainApi.getChain(slug),
    select: (response) => response.data,
    enabled: !!slug && enabled,
  });
}

export function useCreateChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChainData) => chainApi.createChain(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('Chain created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create chain');
    },
  });
}

export function useUpdateChain(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateChainData>) => chainApi.updateChain(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chain', slug] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('Chain updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update chain');
    },
  });
}

export function useDeleteChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => chainApi.deleteChain(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('Chain deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete chain');
    },
  });
}

// ============================================================================
// CHAIN-PROJECT ASSOCIATION HOOKS
// ============================================================================

export function useChainProjects(slug: string, filters?: any) {
  return useQuery({
    queryKey: ['chainProjects', slug, filters],
    queryFn: () => chainApi.getChainProjects(slug, filters),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

export function useAddProjectToChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, projectId, message }: { slug: string; projectId: string; message?: string }) =>
      chainApi.addProjectToChain(slug, { project_id: projectId, message }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chainProjects', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['chain', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast.success('Project added to chain!');
    },
    onError: (error: any) => {
      // Don't show error for approval-required chains (202 status)
      if (error?.response?.status === 202) {
        toast.info('Request submitted for approval');
        return;
      }
      toast.error(error?.response?.data?.message || 'Failed to add project to chain');
    },
  });
}

export function useRemoveProjectFromChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, projectId }: { slug: string; projectId: string }) =>
      chainApi.removeProjectFromChain(slug, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chainProjects', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['chain', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast.success('Project removed from chain');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to remove project');
    },
  });
}

export function useTogglePinProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, projectId }: { slug: string; projectId: string }) =>
      chainApi.togglePinProject(slug, projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chainProjects', variables.slug] });
      toast.success('Pin status updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update pin status');
    },
  });
}

// ============================================================================
// APPROVAL WORKFLOW HOOKS
// ============================================================================

export function useChainRequests(slug: string, status: 'pending' | 'approved' | 'rejected' = 'pending') {
  return useQuery({
    queryKey: ['chainRequests', slug, status],
    queryFn: () => chainApi.getChainRequests(slug, status),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, requestId }: { slug: string; requestId: string }) =>
      chainApi.approveRequest(slug, requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chainRequests', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['chainProjects', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['chain', variables.slug] });
      toast.success('Request approved!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve request');
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, requestId, reason }: { slug: string; requestId: string; reason?: string }) =>
      chainApi.rejectRequest(slug, requestId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chainRequests', variables.slug] });
      toast.success('Request rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject request');
    },
  });
}

// ============================================================================
// FOLLOWING HOOKS
// ============================================================================

export function useFollowChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => chainApi.followChain(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['chain', slug] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('Following chain!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to follow chain');
    },
  });
}

export function useUnfollowChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => chainApi.unfollowChain(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['chain', slug] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('Unfollowed chain');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to unfollow chain');
    },
  });
}

export function useChainFollowers(slug: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['chainFollowers', slug, page, limit],
    queryFn: () => chainApi.getChainFollowers(slug, page, limit),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

export function useToggleFeatureChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => chainApi.toggleFeatureChain(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['chain', slug] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success('Feature status updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update feature status');
    },
  });
}

// ============================================================================
// USER CHAINS
// ============================================================================

export function useUserOwnedChains(userId: string) {
  return useQuery({
    queryKey: ['userOwnedChains', userId],
    queryFn: () => chainApi.getChains({ creator_id: userId, limit: 50 }),
    select: (response) => response.data,
    enabled: !!userId,
  });
}

export function useUserFollowingChains(userId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['userFollowingChains', userId, page, limit],
    queryFn: () => chainApi.getUserFollowingChains(userId, page, limit),
    select: (response) => response.data,
    enabled: !!userId,
  });
}

/**
 * Get chain analytics (owner only)
 */
export function useChainAnalytics(slug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['chainAnalytics', slug],
    queryFn: () => chainApi.getChainAnalytics(slug),
    select: (response) => response.data,
    enabled: !!slug && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get chain recommendations based on categories
 */
export function useChainRecommendations(categories?: string[]) {
  return useQuery({
    queryKey: ['chainRecommendations', categories],
    queryFn: () => chainApi.getChainRecommendations(categories),
    select: (response) => response.data,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
