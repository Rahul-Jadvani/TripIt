/**
 * Admin Chain Moderation Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';

/**
 * Get all chains for admin moderation
 */
export function useAdminChains(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  status?: 'active' | 'banned' | 'suspended' | '';
}) {
  return useQuery({
    queryKey: ['adminChains', params],
    queryFn: () => adminApi.getChains(params),
    select: (response) => response.data,
  });
}

/**
 * Ban a chain
 */
export function useBanChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason?: string }) =>
      adminApi.banChain(slug, reason),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['adminChains'] });
      queryClient.invalidateQueries({ queryKey: ['chain'] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success(response.data.message || 'Chain banned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to ban chain');
    },
  });
}

/**
 * Suspend a chain
 */
export function useSuspendChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      slug,
      reason,
      duration_days,
    }: {
      slug: string;
      reason?: string;
      duration_days?: number;
    }) => adminApi.suspendChain(slug, { reason, duration_days }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['adminChains'] });
      queryClient.invalidateQueries({ queryKey: ['chain'] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success(response.data.message || 'Chain suspended successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to suspend chain');
    },
  });
}

/**
 * Unban a chain
 */
export function useUnbanChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason?: string }) =>
      adminApi.unbanChain(slug, reason),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['adminChains'] });
      queryClient.invalidateQueries({ queryKey: ['chain'] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success(response.data.message || 'Chain unbanned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unban chain');
    },
  });
}

/**
 * Delete a chain
 */
export function useDeleteChainAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, reason }: { slug: string; reason?: string }) =>
      adminApi.deleteChain(slug, reason),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['adminChains'] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success(response.data.message || 'Chain deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete chain');
    },
  });
}

/**
 * Toggle chain featured status
 */
export function useToggleChainFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => adminApi.toggleChainFeatured(slug),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['adminChains'] });
      queryClient.invalidateQueries({ queryKey: ['chain'] });
      queryClient.invalidateQueries({ queryKey: ['chains'] });
      toast.success(response.data.message || 'Chain featured status updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update featured status');
    },
  });
}

/**
 * Get chain moderation logs
 */
export function useModerationLogs(params?: {
  page?: number;
  per_page?: number;
  chain_id?: string;
  action?: string;
  admin_id?: string;
}) {
  return useQuery({
    queryKey: ['moderationLogs', params],
    queryFn: () => adminApi.getModerationLogs(params),
    select: (response) => response.data,
  });
}

/**
 * Get logs for a specific chain
 */
export function useChainLogs(slug: string) {
  return useQuery({
    queryKey: ['chainLogs', slug],
    queryFn: () => adminApi.getChainLogs(slug),
    select: (response) => response.data,
    enabled: !!slug,
  });
}

/**
 * Get platform stats
 */
export function usePlatformStats() {
  return useQuery({
    queryKey: ['platformStats'],
    queryFn: () => adminApi.getStats(),
    select: (response) => response.data,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
