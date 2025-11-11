import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useRealTimeUpdates } from './useRealTimeUpdates';

/**
 * Hook to get unread message count and pending intro request count
 * Automatically updates in real-time via Socket.IO events
 */
export function useNotificationCounts() {
  const queryClient = useQueryClient();

  // Initialize socket listeners for real-time updates
  // Socket events (message:received, intro:received) automatically invalidate these queries
  useRealTimeUpdates();

  // Get unread messages count - cached from socket events, only fallback to fetch if stale
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes - socket events keep it fresh
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // NO refetchInterval - socket events trigger invalidation instead
  });

  // Get pending intro requests count - cached from socket events, only fallback to fetch if stale
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes - socket events keep it fresh
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // NO refetchInterval - socket events trigger invalidation instead
  });

  return {
    unreadMessagesCount: messagesData?.unread_count || 0,
    pendingIntrosCount: introsData?.pending_count || 0,
  };
}
