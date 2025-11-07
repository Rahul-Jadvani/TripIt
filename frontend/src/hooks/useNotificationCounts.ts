import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRealTimeUpdates } from './useRealTimeUpdates';

/**
 * Hook to get unread message count and pending intro request count
 * Automatically updates in real-time via Socket.IO events
 */
export function useNotificationCounts() {
  const queryClient = useQueryClient();

  // Get unread messages count
  const { data: messagesData = { unread_count: 0 } } = useQuery({
    queryKey: ['messages', 'count'],
    queryFn: async () => {
      const backendUrl = typeof window !== 'undefined'
        ? (window.location.hostname.includes('localhost') ? 'http://localhost:5000' : 'https://discovery-platform.onrender.com')
        : 'http://localhost:5000';

      const response = await fetch(`${backendUrl}/api/messages/unread-count`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      return { unread_count: 0 };
    },
    staleTime: 0, // Always refetch - counts change frequently
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 30, // Refetch every 30 seconds as fallback
  });

  // Get pending intro requests count
  const { data: introsData = { pending_count: 0 } } = useQuery({
    queryKey: ['intro-requests', 'count'],
    queryFn: async () => {
      const backendUrl = typeof window !== 'undefined'
        ? (window.location.hostname.includes('localhost') ? 'http://localhost:5000' : 'https://discovery-platform.onrender.com')
        : 'http://localhost:5000';

      const response = await fetch(`${backendUrl}/api/intro-requests/pending-count`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      return { pending_count: 0 };
    },
    staleTime: 0, // Always refetch - counts change frequently
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 30, // Refetch every 30 seconds as fallback
  });

  // Initialize socket listeners for real-time updates
  useRealTimeUpdates();

  // Refetch counts when socket events fire
  useEffect(() => {
    // Refetch both counts to ensure they're always up to date
    const interval = setInterval(() => {
      queryClient.refetchQueries({ queryKey: ['messages', 'count'] });
      queryClient.refetchQueries({ queryKey: ['intro-requests', 'count'] });
    }, 5000); // Refetch every 5 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  return {
    unreadMessagesCount: messagesData?.unread_count || 0,
    pendingIntrosCount: introsData?.pending_count || 0,
  };
}
