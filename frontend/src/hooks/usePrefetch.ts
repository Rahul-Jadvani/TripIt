/**
 * Prefetch Hook - Loads all critical data in background on app mount
 * Makes navigation feel instant by preloading feed, leaderboards, etc.
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { projectsService, leaderboardService, publicInvestorsService, messagesService, adminService } from '@/services/api';
import { communityApi } from '@/services/communityApi';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/utils/logger';
import { transformProject } from '@/hooks/useProjects';

// Get backend URL
const getBackendUrl = (): string => {
  return 'https://tripit-xgvr.onrender.com';
};

export function usePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
              return {
                ...response.data,
                data: response.data.data?.map(transformProject) || [],
              };
            },
            staleTime: 1000 * 60 * 5, // 5 min for real-time feel
          }),
          /* deferred: trending page 2 (idle on fast networks) */

          // Top Rated - pages 1-2
          queryClient.prefetchQuery({
            queryKey: ['projects', 'top-rated', 1],
            queryFn: async () => {
              const response = await projectsService.getAll('top-rated', 1);
              return {
                ...response.data,
                data: response.data.data?.map(transformProject) || [],
              };
            },
            staleTime: 1000 * 60 * 5,
          }),
          /* deferred: top-rated page 2 (idle on fast networks) */

          // Newest - page 1
          queryClient.prefetchQuery({
            queryKey: ['projects', 'newest', 1],
            queryFn: async () => {
              const response = await projectsService.getAll('newest', 1);
              return {
                ...response.data,
                data: response.data.data?.map(transformProject) || [],
              };
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
              // Transform data to match useProjectsLeaderboard format
              const transformed = response.data.data?.map((backendProject: any) => ({
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
              })) || [];
              return transformed;
            },
            staleTime: 1000 * 60 * 5, // 5 min, invalidated on badge awards
          }),
          queryClient.prefetchQuery({
            queryKey: ['leaderboard', 'builders', 50],
            queryFn: async () => {
              const response = await leaderboardService.getBuilders(50);
              // Transform data to match useBuildersLeaderboard format
              const transformed = response.data.data?.map((backendUser: any) => ({
                rank: backendUser.rank,
                id: backendUser.id,
                username: backendUser.username,
                avatar: backendUser.avatar_url,
                score: backendUser.karma || 0,
                projects: backendUser.project_count || 0,
              })) || [];
              return transformed;
            },
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch chains (public data) - MUST match useChains query key format
        const chainsPromises = [
          queryClient.prefetchQuery({
            queryKey: ['chains', { search: '', sort: 'trending', category: undefined, featured: false, page: 1, limit: 12 }],
            queryFn: async () => communityApi.getChains({ page: 1, limit: 12, sort: 'trending' }),
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch investors directory (public data)
        const investorsPromises = [
          queryClient.prefetchQuery({
            queryKey: ['investors', 'public'],
            queryFn: async () => (await publicInvestorsService.getAll()).data?.data || [],
            staleTime: 1000 * 60 * 5,
          }),
        ];

        // Prefetch intro requests and messages (for logged-in users)
        const token = localStorage.getItem('token');
        const userDataPromises = token ? [
          // Prefetch intro requests (received)
          queryClient.prefetchQuery({
            queryKey: ['intro-requests', 'received'],
            queryFn: async () => (await api.get('/intro-requests/received')).data?.data || [],
            staleTime: 1000 * 60,
          }),
          // Prefetch intro requests (sent)
          queryClient.prefetchQuery({
            queryKey: ['intro-requests', 'sent'],
            queryFn: async () => (await api.get('/intro-requests/sent')).data?.data || [],
            staleTime: 1000 * 60,
          }),
          // Prefetch message conversations
          queryClient.prefetchQuery({
            queryKey: ['messages', 'conversations'],
            queryFn: async () => (await messagesService.getConversations()).data?.data || [],
            staleTime: 1000 * 60,
          }),
        ] : [];

        // Prefetch Admin panel data (for admins only, but will fail gracefully for non-admins)
        const adminPanelPromises = token && user?.isAdmin ? [
          // Admin stats
          queryClient.prefetchQuery({
            queryKey: ['admin', 'stats'],
            queryFn: async () => (await adminService.getStats()).data?.data || {},
            staleTime: 1000 * 60 * 5,
          }),
          // Admin users
          queryClient.prefetchQuery({
            queryKey: ['admin', 'users', { search: '', role: 'all', perPage: 100 }],
            queryFn: async () => (await adminService.getUsers({ perPage: 100 })).data?.data || [],
            staleTime: 1000 * 60 * 3,
          }),
          // Admin validators
          queryClient.prefetchQuery({
            queryKey: ['admin', 'validators'],
            queryFn: async () => (await adminService.getValidators()).data?.data || [],
            staleTime: 1000 * 60 * 5,
          }),
          // Admin projects
          queryClient.prefetchQuery({
            queryKey: ['admin', 'projects', { search: '', perPage: 100 }],
            queryFn: async () => (await adminService.getProjects({ perPage: 100 })).data?.data || [],
            staleTime: 1000 * 60 * 3,
          }),
          // Admin investor requests
          queryClient.prefetchQuery({
            queryKey: ['admin', 'investor-requests'],
            queryFn: async () => (await adminService.getInvestorRequests()).data?.data || [],
            staleTime: 1000 * 60 * 2,
          }),
          // Admin chains
          queryClient.prefetchQuery({
            queryKey: ['adminChains', { page: 1, per_page: 50, search: '', status: '' }],
            queryFn: async () => (await api.get('/admin/chains?page=1&per_page=50')).data || {},
            staleTime: 1000 * 60 * 5,
          }),
        ] : [];

        // Build deferred tasks (run in idle if network is fast)
        const feedDeferred = [
          () => queryClient.prefetchQuery({
            queryKey: ['projects', 'trending', 2],
            queryFn: async () => {
              const response = await projectsService.getAll('trending', 2);
              return {
                ...response.data,
                data: response.data.data?.map(transformProject) || [],
              };
            },
            staleTime: 1000 * 60 * 5,
          }),
          () => queryClient.prefetchQuery({
            queryKey: ['projects', 'top-rated', 2],
            queryFn: async () => {
              const response = await projectsService.getAll('top-rated', 2);
              return {
                ...response.data,
                data: response.data.data?.map(transformProject) || [],
              };
            },
            staleTime: 1000 * 60 * 5,
          }),
        ];

        const connection: any = (typeof navigator !== 'undefined' && (navigator as any).connection) || null;
        const saveData: boolean = !!connection?.saveData;
        const effectiveType: string | undefined = connection?.effectiveType; // 'slow-2g' | '2g' | '3g' | '4g'
        const isFastNetwork = !saveData && (!effectiveType || effectiveType === '4g');

        const scheduleIdle = (cb: () => void, priority: 'high' | 'normal' = 'normal') => {
          const win: any = typeof window !== 'undefined' ? window : undefined;
          if (win && typeof win.requestIdleCallback === 'function') {
            // Higher priority work gets shorter timeout
            const timeout = priority === 'high' ? 2000 : 4000;
            win.requestIdleCallback(cb, { timeout });
          } else {
            // Fallback: schedule with setTimeout
            const delay = priority === 'high' ? 0 : 1000;
            setTimeout(cb, delay);
          }
        };

        // Execute critical prefetches immediately; defer heavy batches
        const results = await Promise.allSettled([
          ...feedPromises,
        ]);

        if (isFastNetwork) {
          // Stage 1 (high priority): Feed pagination + user data (if authenticated)
          scheduleIdle(() => {
            Promise.allSettled([
              ...feedDeferred.map((fn) => fn()),
              ...userDataPromises, // Only fires if token exists
            ]).catch(() => {});
          }, 'high');

          // Stage 2 (normal priority): Public directory data + leaderboards
          scheduleIdle(() => {
            Promise.allSettled([
              ...leaderboardPromises,
              ...chainsPromises,
              ...investorsPromises,
            ]).catch(() => {});
          }, 'normal');

          // Stage 3 (deferred): Admin panel (only if user is admin)
          if (user?.isAdmin && adminPanelPromises.length > 0) {
            scheduleIdle(() => {
              Promise.allSettled([
                ...adminPanelPromises,
              ]).catch(() => {});
            }, 'normal');
          }
        }

        // Log results for diagnostics
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        logger.log(`%c[Prefetch] Completed in ${duration}ms`, 'color: #10b981; font-weight: bold');
        logger.log(`%c[Prefetch] ✓ Successful: ${successful} | ✗ Failed: ${failed}`, 'color: #6366f1');
        logger.log(`%c[Prefetch] Cached: Feed (5 pages), Leaderboards (2), Chains (1), Investors (1)${token ? ', Intro Requests (2), Messages (1), Admin Panel (6)' : ''}`, 'color: #8b5cf6');

        if (failed > 0) {
          logger.warn('[Prefetch] Some requests failed, but app will continue normally');
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              logger.error(`[Prefetch] Failed request ${index}:`, result.reason);
            }
          });
        }
      } catch (error) {
        // Silent fail - prefetch errors shouldn't break the app
        logger.error('[Prefetch] Error during prefetch:', error);
      }
    };

    // Start prefetch immediately
    prefetchData();
  }, [queryClient]);

  // This hook doesn't return anything - it just runs in the background
}

