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

      // Get user's projects to calculate total votes
      const projectsResponse = await api.get(`/users/${userStats.data.user_id}/projects?per_page=100`);
      const projects = projectsResponse.data.data || [];

      // Calculate total votes across all projects
      const totalVotes = projects.reduce((sum: number, project: any) => {
        return sum + (project.upvotes || 0);
      }, 0);

      // Calculate total comments across all projects
      const totalComments = projects.reduce((sum: number, project: any) => {
        return sum + (project.comment_count || 0);
      }, 0);

      // Get intro requests
      const receivedIntrosResponse = await api.get('/intros/received');
      const receivedIntros = receivedIntrosResponse.data.data || [];
      const pendingIntros = receivedIntros.filter((intro: any) => intro.status === 'pending');

      return {
        totalProjects: userStats.data.project_count || 0,
        totalVotes: totalVotes,
        totalComments: totalComments,
        introRequests: receivedIntros.length,
        pendingIntros: pendingIntros.length,
        projects: projects,
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
