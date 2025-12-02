import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityApi, CreateCommunityData } from '@/services/communityApi';
import type { CommunityFilters } from '@/types';
import { transformItinerary } from '@/hooks/useItineraries';
import { toast } from 'sonner';

// ============================================================================
// COMMUNITY CRUD HOOKS
// ============================================================================

export function useCommunities(filters?: CommunityFilters) {
  return useQuery({
    queryKey: ['communities', filters],
    queryFn: () => communityApi.getCommunities(filters),
    select: (response) => response.data,
  });
}

export function useCommunity(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['community', slug],
    queryFn: () => communityApi.getCommunity(slug),
    select: (response) => response.data,
    enabled: !!slug && enabled,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommunityData) => communityApi.createCommunity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Community created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create community');
    },
  });
}

export function useUpdateCommunity(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateCommunityData>) => communityApi.updateCommunity(slug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Community updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update community');
    },
  });
}

export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => communityApi.deleteCommunity(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Community deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete community');
    },
  });
}

// ============================================================================
// COMMUNITY-ITINERARY ASSOCIATION HOOKS
// ============================================================================

export function useCommunityItineraries(slug: string, filters?: any) {
  return useQuery({
    queryKey: ['communityItineraries', slug, filters],
    queryFn: () => communityApi.getCommunityItineraries(slug, filters),
    select: (response) => {
      const data = response.data || {};
      const itineraries = Array.isArray(data.itineraries) ? data.itineraries.map(transformItinerary) : [];
      const pagination = data.pagination || {};
      const totalPages = pagination.pages ?? data.total_pages ?? pagination.total_pages ?? 1;

      return {
        ...data,
        itineraries,
        pagination,
        total_pages: totalPages,
      };
    },
    enabled: !!slug,
  });
}

export function useAddItineraryToCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, itineraryId, message }: { slug: string; itineraryId: string; message?: string }) =>
      communityApi.addItineraryToCommunity(slug, { itinerary_id: itineraryId, message }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityItineraries', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['itinerary', variables.itineraryId] });
      toast.success('Itinerary added to community!');
    },
    onError: (error: any) => {
      // Don't show error for approval-required communities (202 status)
      if (error?.response?.status === 202) {
        toast.info('Request submitted for approval');
        return;
      }
      toast.error(error?.response?.data?.message || 'Failed to add itinerary to community');
    },
  });
}

export function useRemoveItineraryFromCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, itineraryId }: { slug: string; itineraryId: string }) =>
      communityApi.removeItineraryFromCommunity(slug, itineraryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityItineraries', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['itinerary', variables.itineraryId] });
      toast.success('Itinerary removed from community');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to remove itinerary');
    },
  });
}

export function useTogglePinItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, itineraryId }: { slug: string; itineraryId: string }) =>
      communityApi.togglePinItinerary(slug, itineraryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityItineraries', variables.slug] });
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

export function useCommunityRequests(slug: string, status: 'pending' | 'approved' | 'rejected' = 'pending') {
  return useQuery({
    queryKey: ['communityRequests', slug, status],
    queryFn: () => communityApi.getCommunityRequests(slug, status),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, requestId }: { slug: string; requestId: string }) =>
      communityApi.approveRequest(slug, requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityRequests', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['communityItineraries', variables.slug] });
      queryClient.invalidateQueries({ queryKey: ['community', variables.slug] });
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
      communityApi.rejectRequest(slug, requestId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['communityRequests', variables.slug] });
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

export function useFollowCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => communityApi.followCommunity(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Following community!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to follow community');
    },
  });
}

export function useUnfollowCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => communityApi.unfollowCommunity(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Unfollowed community');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to unfollow community');
    },
  });
}

export function useCommunityFollowers(slug: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['communityFollowers', slug, page, limit],
    queryFn: () => communityApi.getCommunityFollowers(slug, page, limit),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

// ============================================================================
// ADMIN HOOKS
// ============================================================================

export function useToggleFeatureCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => communityApi.toggleFeatureCommunity(slug),
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: ['community', slug] });
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      toast.success('Feature status updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update feature status');
    },
  });
}

// ============================================================================
// USER COMMUNITIES
// ============================================================================

export function useUserOwnedCommunities(userId: string) {
  return useQuery({
    queryKey: ['userOwnedCommunities', userId],
    queryFn: () => communityApi.getCommunities({ creator_id: userId, limit: 50 }),
    select: (response) => response.data,
    enabled: !!userId,
  });
}

export function useUserFollowingCommunities(userId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ['userFollowingCommunities', userId, page, limit],
    queryFn: () => communityApi.getUserFollowingCommunities(userId, page, limit),
    select: (response) => response.data,
    enabled: !!userId,
  });
}

/**
 * Get community analytics (owner only)
 */
export function useCommunityAnalytics(slug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['communityAnalytics', slug],
    queryFn: () => communityApi.getCommunityAnalytics(slug),
    select: (response) => response.data,
    enabled: !!slug && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get community recommendations based on categories
 */
export function useCommunityRecommendations(categories?: string[]) {
  return useQuery({
    queryKey: ['communityRecommendations', categories],
    queryFn: () => communityApi.getCommunityRecommendations(categories),
    select: (response) => response.data,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Backward compatibility aliases for old hook names
export const useChain = useCommunity;
export const useChainProjects = useCommunityItineraries;
export const useFollowChain = useFollowCommunity;
export const useUnfollowChain = useUnfollowCommunity;

// Import and re-export admin community hooks with aliases for backward compatibility
export { 
  useAdminChains as useAdminCommunities,
  useBanChain,
  useSuspendChain,
  useUnbanChain,
  useDeleteChainAdmin,
  useToggleChainFeatured
} from './useAdminCommunities';

// More backward compatibility aliases
export const useCreateChain = useCreateCommunity;
export const useUpdateChain = useUpdateCommunity;
