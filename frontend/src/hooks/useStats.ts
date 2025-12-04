import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';

export function useUserStats(enabled: boolean = true) {
  return useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await api.get('/users/stats');
      return response.data;
    },
    enabled: enabled, // Gate requests for unauthenticated users
    staleTime: 1000 * 60 * 2, // Stats fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchInterval: 1000 * 60, // Auto-refresh every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Keep old data visible
  });
}

export function useDashboardStats(enabled: boolean = true) {
  const { data: userStats, isLoading: statsLoading } = useUserStats(enabled);

  return useQuery({
    queryKey: ['dashboardStats', userStats?.data?.user_id],
    queryFn: async () => {
      if (!userStats?.data?.user_id) {
        throw new Error('User ID not found');
      }

      // OPTIMIZED: Use stats from /users/stats endpoint (includes total_upvotes now!)
      const stats = userStats.data;

      console.log('[Dashboard Stats] Raw stats from API:', stats);
      console.log('[Dashboard Stats] project_count:', stats.project_count);
      console.log('[Dashboard Stats] total_upvotes:', stats.total_upvotes);
      console.log('[Dashboard Stats] comment_count:', stats.comment_count);

      // Get intro requests
      const receivedIntrosResponse = await api.get('/intros/received');
      const receivedIntros = receivedIntrosResponse.data.data || [];
      const pendingIntros = receivedIntros.filter((intro: any) => intro.status === 'pending');

      const dashboardData = {
        totalItineraries: stats.project_count || 0,  // Use denormalized count
        totalVotes: stats.total_upvotes || 0,  // Now available from backend!
        totalComments: stats.comment_count || 0,  // Use denormalized count
        introRequests: receivedIntros.length,
        pendingIntros: pendingIntros.length,
        recentIntros: receivedIntros.slice(0, 5),
      };

      console.log('[Dashboard Stats] Final dashboard data:', dashboardData);

      return dashboardData;
    },
    enabled: !!userStats?.data?.user_id && !statsLoading,
    staleTime: 0, // Don't cache - always fresh
    gcTime: 0, // Don't keep in memory
    refetchInterval: false, // Don't auto-refresh
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: undefined, // Don't keep old data
  });
}
