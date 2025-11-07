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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
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
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Initialize socket listeners for real-time updates
  useRealTimeUpdates();

  // Update counts when socket events fire
  useEffect(() => {
    // Listen for message events to update count
    const handleMessageReceived = () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'count'] });
    };

    const handleMessagesRead = () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'count'] });
    };

    // Listen for intro events
    const handleIntroReceived = () => {
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'count'] });
    };

    const handleIntroAccepted = () => {
      queryClient.invalidateQueries({ queryKey: ['intro-requests', 'count'] });
    };

    // These event listeners would be handled by the socket in useRealTimeUpdates
    // but we could also manually set the counts if needed
    return () => {
      // Cleanup if needed
    };
  }, [queryClient]);

  return {
    unreadMessagesCount: messagesData?.unread_count || 0,
    pendingIntrosCount: introsData?.pending_count || 0,
  };
}
