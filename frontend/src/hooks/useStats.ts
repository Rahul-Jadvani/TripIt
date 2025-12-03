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

      // Get user's itineraries to calculate total votes and comments
      const itinerariesResponse = await api.get(`/users/${userStats.data.user_id}/itineraries?per_page=100`);
      const itineraries = itinerariesResponse.data.data || [];

      console.log('[Dashboard Stats] Fetched itineraries:', itineraries.length);
      console.log('[Dashboard Stats] Sample itinerary:', itineraries[0]);

      // Calculate total votes across all itineraries (using helpful_votes)
      const totalVotes = itineraries.reduce((sum: number, itinerary: any) => {
        const votes = itinerary.helpful_votes || 0;
        console.log(`[Dashboard Stats] Itinerary "${itinerary.title}": ${votes} votes`);
        return sum + votes;
      }, 0);

      // Calculate total comments across all itineraries
      const totalComments = itineraries.reduce((sum: number, itinerary: any) => {
        const comments = itinerary.comment_count || 0;
        console.log(`[Dashboard Stats] Itinerary "${itinerary.title}": ${comments} comments`);
        return sum + comments;
      }, 0);

      console.log('[Dashboard Stats] Total votes:', totalVotes);
      console.log('[Dashboard Stats] Total comments:', totalComments);

      // Get intro requests
      const receivedIntrosResponse = await api.get('/intros/received');
      const receivedIntros = receivedIntrosResponse.data.data || [];
      const pendingIntros = receivedIntros.filter((intro: any) => intro.status === 'pending');

      return {
        totalItineraries: itineraries.length,  // Use actual count from API
        totalVotes: totalVotes,
        totalComments: totalComments,
        introRequests: receivedIntros.length,
        pendingIntros: pendingIntros.length,
        itineraries: itineraries,
        recentIntros: receivedIntros.slice(0, 5),
      };
    },
    enabled: !!userStats?.data?.user_id && !statsLoading,
    staleTime: 1000 * 60 * 2, // Dashboard stats fresh for 2 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchInterval: 1000 * 60, // Auto-refresh every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData, // Keep old data visible
  });
}
