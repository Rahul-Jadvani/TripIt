/**
 * Prefetch Hook - Loads all critical data in background on app mount
 * Makes navigation feel instant by preloading feed, leaderboards, etc.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { projectsService, leaderboardService, introsService } from '@/services/api';

// Get backend URL
const getBackendUrl = (): string => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  return isDev ? 'http://localhost:5000' : 'https://discovery-platform.onrender.com';
};

export function usePrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const startTime = performance.now();

    // Prefetch all critical data in parallel
    const prefetchData = async () => {
      try {
        // Prefetch feed pages (trending, newest, top-rated)
        // CRITICAL: Query keys MUST match Feed.tsx exactly for cache hits
        const feedPromises = [
          // Trending - pages 1-2
          queryClient.prefetchQuery({
            queryKey: ['projects', 'trending', 1],
            queryFn: async () => {
              const response = await projectsService.getAll('trending', 1);
              return response.data;
            },
            staleTime: 1000 * 60 * 5, // 5 min for real-time feel
          }),
          queryClient.prefetchQuery({
            queryKey: ['projects', 'trending', 2],
            queryFn: async () => {
              const response = await projectsService.getAll('trending', 2);
              return response.data;
            },
            staleTime: 1000 * 60 * 5,
          }),

          // Top Rated - pages 1-2
          queryClient.prefetchQuery({
            queryKey: ['projects', 'top-rated', 1],
            queryFn: async () => {
              const response = await projectsService.getAll('top-rated', 1);
              return response.data;
            },
            staleTime: 1000 * 60 * 5,
          }),
          queryClient.prefetchQuery({
            queryKey: ['projects', 'top-rated', 2],
            queryFn: async () => {
              const response = await projectsService.getAll('top-rated', 2);
              return response.data;
            },
            staleTime: 1000 * 60 * 5,
          }),

          // Newest - page 1
          queryClient.prefetchQuery({
            queryKey: ['projects', 'newest', 1],
            queryFn: async () => {
              const response = await projectsService.getAll('newest', 1);
              return response.data;
            },
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch leaderboards
        const leaderboardPromises = [
          queryClient.prefetchQuery({
            queryKey: ['leaderboard', 'projects', 50],
            queryFn: async () => {
              const response = await leaderboardService.getProjects(50);
              return response.data.data || [];
            },
            staleTime: 1000 * 60 * 5, // 5 min, invalidated on badge awards
          }),
          queryClient.prefetchQuery({
            queryKey: ['leaderboard', 'builders', 50],
            queryFn: async () => {
              const response = await leaderboardService.getBuilders(50);
              return response.data.data || [];
            },
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch chains (public data) - MUST match useChains query key format
        const chainsPromises = [
          queryClient.prefetchQuery({
            queryKey: ['chains', {
              search: '',
              sort: 'trending',
              category: undefined,
              featured: false,
              page: 1,
              limit: 12
            }],
            queryFn: async () => {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/chains?page=1&limit=12&sort=trending`);
              const data = await response.json();
              return data.status === 'success' ? data.data : { chains: [], total: 0 };
            },
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch investors directory (public data)
        const investorsPromises = [
          queryClient.prefetchQuery({
            queryKey: ['investors', 'public'],
            queryFn: async () => {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/investor-requests/public`);
              const data = await response.json();
              return data.status === 'success' ? data.data : [];
            },
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch intros and messages (for logged-in users)
        const token = localStorage.getItem('token');
        const userDataPromises = token ? [
          // Prefetch received intros
          queryClient.prefetchQuery({
            queryKey: ['intros', 'received'],
            queryFn: async () => {
              const response = await introsService.getReceived();
              return response.data;
            },
            staleTime: 1000 * 60 * 5,
          }),
          // Prefetch sent intros
          queryClient.prefetchQuery({
            queryKey: ['intros', 'sent'],
            queryFn: async () => {
              const response = await introsService.getSent();
              return response.data;
            },
            staleTime: 1000 * 60 * 5,
          }),
          // Prefetch intro requests (received)
          queryClient.prefetchQuery({
            queryKey: ['intro-requests', 'received'],
            queryFn: async () => {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/intro-requests/received`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await response.json();
              return data.status === 'success' ? data.data : [];
            },
            staleTime: 1000 * 60 * 5,
          }),
          // Prefetch intro requests (sent)
          queryClient.prefetchQuery({
            queryKey: ['intro-requests', 'sent'],
            queryFn: async () => {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/intro-requests/sent`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await response.json();
              return data.status === 'success' ? data.data : [];
            },
            staleTime: 1000 * 60 * 5,
          }),
          // Prefetch message conversations
          queryClient.prefetchQuery({
            queryKey: ['messages', 'conversations'],
            queryFn: async () => {
              const backendUrl = getBackendUrl();
              const response = await fetch(`${backendUrl}/api/messages/conversations`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await response.json();
              return data.status === 'success' ? data.data : [];
            },
            staleTime: 1000 * 60 * 5,
          }),
        ] : [];

        // Execute all prefetches in parallel (non-blocking)
        // Use Promise.allSettled to prevent one failure from blocking others
        const results = await Promise.allSettled([
          ...feedPromises,
          ...leaderboardPromises,
          ...chainsPromises,
          ...investorsPromises,
          ...userDataPromises,
        ]);

        // Log results for diagnostics
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`%c[Prefetch] Completed in ${duration}ms`, 'color: #10b981; font-weight: bold');
        console.log(`%c[Prefetch] ✓ Successful: ${successful} | ✗ Failed: ${failed}`, 'color: #6366f1');
        console.log(`%c[Prefetch] Cached: Feed (5 pages), Leaderboards (2), Chains (1), Investors (1)${token ? ', Intros (4), Messages (1)' : ''}`, 'color: #8b5cf6');

        if (failed > 0) {
          console.warn('[Prefetch] Some requests failed, but app will continue normally');
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`[Prefetch] Failed request ${index}:`, result.reason);
            }
          });
        }
      } catch (error) {
        // Silent fail - prefetch errors shouldn't break the app
        console.error('[Prefetch] Error during prefetch:', error);
      }
    };

    // Start prefetch immediately
    prefetchData();
  }, [queryClient]);

  // This hook doesn't return anything - it just runs in the background
}
