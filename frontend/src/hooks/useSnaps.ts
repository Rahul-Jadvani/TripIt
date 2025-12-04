import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { snapsService } from '@/services/api';
import { toast } from 'sonner';

export interface Snap {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  latitude: number;
  longitude: number;
  location_name: string;
  city: string;
  country: string;
  view_count: number;
  like_count: number;
  created_at: string;
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

// Fetch all snaps (feed)
export function useSnaps(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['snaps', page, limit],
    queryFn: async () => {
      const response = await snapsService.getFeed(page, limit);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Fresh for 5 minutes
  });
}

// Fetch snaps by user
export function useUserSnaps(userId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['snaps', 'user', userId, page, limit],
    queryFn: async () => {
      const response = await snapsService.getByUser(userId, page, limit);
      return response.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// Like a snap
export function useLikeSnap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapId: string) => snapsService.like(snapId),
    onSuccess: () => {
      // Invalidate all snap queries to refetch with updated like counts
      queryClient.invalidateQueries({ queryKey: ['snaps'] });
      toast.success('Snap liked!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like snap');
    },
  });
}

// Delete a snap
export function useDeleteSnap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapId: string) => snapsService.delete(snapId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snaps'] });
      toast.success('Snap deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete snap');
    },
  });
}
