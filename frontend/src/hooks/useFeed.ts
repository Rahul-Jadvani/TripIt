import { useQuery } from '@tanstack/react-query';
import { projectsService, introsService } from '@/services/api';
import { transformProject } from './useProjects';

// Hook for fetching most requested projects
export function useMostRequestedProjects(limit: number = 20) {
  return useQuery({
    queryKey: ['most-requested-projects', limit],
    queryFn: async () => {
      const response = await projectsService.getMostRequested(limit);
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour - cached on backend
    gcTime: 1000 * 60 * 120,   // 2 hours in memory

    // No polling - backend cache refreshes every hour via Celery
    refetchInterval: false,
    refetchOnWindowFocus: false, // Don't refetch on tab switches - rely on backend cache + WebSocket invalidation
    refetchOnReconnect: false,   // Don't refetch on reconnect - data is cached for 1 hour
    refetchOnMount: false,       // Don't refetch on mount - use cached data

    // Keep old data visible during background refetch
    placeholderData: (previousData) => previousData,
  });
}

// Hook for fetching recent connections
export function useRecentConnections(limit: number = 20) {
  return useQuery({
    queryKey: ['recent-connections', limit],
    queryFn: async () => {
      const response = await introsService.getRecentConnections(limit);
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour - cached on backend
    gcTime: 1000 * 60 * 120,   // 2 hours in memory

    // No polling - backend cache refreshes every hour via Celery
    refetchInterval: false,
    refetchOnWindowFocus: false, // Don't refetch on tab switches - rely on backend cache + WebSocket invalidation
    refetchOnReconnect: false,   // Don't refetch on reconnect - data is cached for 1 hour
    refetchOnMount: false,       // Don't refetch on mount - use cached data

    // Keep old data visible during background refetch
    placeholderData: (previousData) => previousData,
  });
}

// Hook for fetching featured projects
export function useFeaturedProjects(limit: number = 20) {
  return useQuery({
    queryKey: ['featured-projects', limit],
    queryFn: async () => {
      const response = await projectsService.getFeatured(limit);
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour - cached on backend
    gcTime: 1000 * 60 * 120,   // 2 hours in memory

    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    placeholderData: (previousData) => previousData,
  });
}

// Hook for fetching projects by category
export function useCategoryProjects(category: string, limit: number = 20) {
  return useQuery({
    queryKey: ['category-projects', category, limit],
    queryFn: async () => {
      const response = await projectsService.getByCategory(category, limit);
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    enabled: !!category,
    staleTime: 1000 * 60 * 60, // 1 hour - cached on backend
    gcTime: 1000 * 60 * 120,   // 2 hours in memory

    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    placeholderData: (previousData) => previousData,
  });
}

// Hook for fetching rising star projects
export function useRisingStars(limit: number = 20) {
  return useQuery({
    queryKey: ['rising-stars', limit],
    queryFn: async () => {
      const response = await projectsService.getRisingStars(limit);
      return {
        ...response.data,
        data: response.data.data?.map(transformProject) || [],
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour - cached on backend
    gcTime: 1000 * 60 * 120,   // 2 hours in memory

    refetchInterval: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    placeholderData: (previousData) => previousData,
  });
}
