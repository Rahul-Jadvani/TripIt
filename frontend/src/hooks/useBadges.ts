import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { badgesService } from '@/services/api';
import { toast } from 'sonner';

export function useBadges(projectId: string) {
  return useQuery({
    queryKey: ['badges', projectId],
    queryFn: () => badgesService.getByProject(projectId),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // Badges fresh for 5 minutes (don't change often)
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
    refetchInterval: 1000 * 60 * 2, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Keep old data visible
  });
}

export function useAwardBadge(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => badgesService.award({ ...data, project_id: projectId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badges', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Badge awarded successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to award badge');
    },
  });
}
