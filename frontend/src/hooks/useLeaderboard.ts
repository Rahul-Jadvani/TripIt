import { useQuery } from '@tanstack/react-query';
import { leaderboardService } from '@/services/api';

// Transform backend project data
function transformProject(backendProject: any) {
  return {
    id: backendProject.id,
    rank: backendProject.rank,
    title: backendProject.title,
    tagline: backendProject.tagline || '',
    score: backendProject.upvotes || 0,
    author: backendProject.creator ? {
      id: backendProject.creator.id,
      username: backendProject.creator.username,
      avatar: backendProject.creator.avatar_url,
    } : {
      id: backendProject.user_id,
      username: 'Unknown',
      avatar: '',
    },
  };
}

// Transform backend user data
function transformBuilder(backendUser: any) {
  return {
    rank: backendUser.rank,
    id: backendUser.id,
    username: backendUser.username,
    avatar: backendUser.avatar_url,
    score: backendUser.karma || 0,
    projects: backendUser.project_count || 0,
  };
}

export function useProjectsLeaderboard(limit: number = 50) {
  return useQuery({
    queryKey: ['leaderboard', 'projects', limit],
    queryFn: async () => {
      const response = await leaderboardService.getProjects(limit);
      const transformed = response.data.data?.map(transformProject) || [];
      return transformed;
    },
    staleTime: 1000 * 60 * 5, // 5 min - invalidated on badge awards via Socket.IO
    gcTime: 1000 * 60 * 30,   // 30 min in cache for fast tab switching

    // Real-time refetch strategy
    refetchInterval: false, // NO polling - Socket.IO handles invalidation
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true,
    // Don't force refetch if data is fresh (allows prefetch to work)
    refetchOnMount: true, // Only refetch if stale

    // Keep old data during refetch
    placeholderData: (previousData) => previousData,
  });
}

export function useBuildersLeaderboard(limit: number = 50) {
  return useQuery({
    queryKey: ['leaderboard', 'builders', limit],
    queryFn: async () => {
      const response = await leaderboardService.getBuilders(limit);
      const transformed = response.data.data?.map(transformBuilder) || [];
      return transformed;
    },
    staleTime: 1000 * 60 * 5, // 5 min - invalidated on project creation via Socket.IO
    gcTime: 1000 * 60 * 30,   // 30 min in cache

    // Real-time refetch strategy
    refetchInterval: false, // NO polling - Socket.IO handles invalidation
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnReconnect: true,
    // Don't force refetch if data is fresh (allows prefetch to work)
    refetchOnMount: true, // Only refetch if stale

    // Keep old data during refetch
    placeholderData: (previousData) => previousData,
  });
}
