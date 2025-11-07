/**
 * Real-Time Updates Hook - Socket.IO integration
 * Listens for WebSocket events and updates React Query cache automatically
 */
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

// Socket.IO instance (singleton)
let socket: Socket | null = null;
let listenersAttached = false; // prevent duplicate listener registration across mounts/HMR

export function useRealTimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Get backend URL from environment or use default
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Initialize Socket.IO connection (only once)
    if (!socket) {
      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
      // Connection event handlers (dev-only logs)
      if (import.meta.env.DEV) {
        // light diagnostics during development
        socket.on('connect', () => {});
        socket.on('disconnect', () => {});
        socket.on('connect_error', () => {});
      }
    }
    // Attach listeners once
    if (!listenersAttached && socket) {
      listenersAttached = true;

      // Project created event
      socket.on('project:created', (data) => {
        toast.success('New project published!', {
          description: data.message,
          duration: 5000,
        });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });

      // Project updated event
      socket.on('project:updated', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      });

      // Project deleted event
      socket.on('project:deleted', (data) => {
        queryClient.removeQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });

      // Voting and comments
      socket.on('vote:cast', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });
      socket.on('vote:removed', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });
      socket.on('comment:added', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['comments', data.project_id] });
      });
      socket.on('comment:updated', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['comments', data.project_id] });
      });
      socket.on('comment:deleted', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['comments', data.project_id] });
      });
      socket.on('comment:voted', (data) => {
        queryClient.invalidateQueries({ queryKey: ['comments', data.project_id] });
      });

      // Leaderboard and user profile
      socket.on('leaderboard:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });
      socket.on('user:updated', (data) => {
        queryClient.invalidateQueries({ queryKey: ['user', data.user_id] });
      });

      // Project featured / badges
      socket.on('project:featured', (data) => {
        toast.success('Project featured!');
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
      });
      socket.on('badge:awarded', (data) => {
        toast.success('New badge awarded!');
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['badges', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });

      // Intros & messages
      socket.on('intro:received', () => {
        toast('New intro request received!');
        queryClient.invalidateQueries({ queryKey: ['intros', 'received'] });
        // Invalidate intro request count badge
        queryClient.invalidateQueries({ queryKey: ['intro-requests', 'count'] });
      });
      socket.on('intro:accepted', (data) => {
        toast.success('Your intro request was accepted!', {
          description: `${data.data?.builder_name || 'Someone'} accepted your intro request. Check your messages!`,
          duration: 5000,
        });
        // Invalidate both intro requests and conversations to show new conversation immediately
        queryClient.invalidateQueries({ queryKey: ['intro-requests', 'sent'] });
        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
        // Invalidate message count badge since conversation was created
        queryClient.invalidateQueries({ queryKey: ['messages', 'count'] });
        // If initial message exists, add it to the conversation
        if (data.data?.initial_message && data.data?.builder_id) {
          queryClient.setQueryData(
            ['messages', 'conversation', data.data.builder_id],
            (old: any[] = []) => {
              // Avoid duplicates
              const exists = old.some((msg) => msg.id === data.data.initial_message.id);
              return exists ? old : [...old, data.data.initial_message];
            }
          );
        }
      });
      socket.on('intro:declined', () => {
        toast('Your intro request was declined');
        queryClient.invalidateQueries({ queryKey: ['intro-requests', 'sent'] });
        // Invalidate intro request count badge
        queryClient.invalidateQueries({ queryKey: ['intro-requests', 'count'] });
      });
      socket.on('message:received', (data) => {
        const message = data.data;
        const senderId = message?.sender_id || data.sender_id;
        const senderName = message?.sender?.username || data.sender_name || 'Someone';
        toast(`New message from ${senderName}`, {
          description: message?.message?.substring(0, 50) || 'View message',
          duration: 4000,
        });
        if (senderId) {
          queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', senderId] });
        }
        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
        // Invalidate message count badge
        queryClient.invalidateQueries({ queryKey: ['messages', 'count'] });
      });
      socket.on('message:read', () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        // Invalidate message count badge when messages are read
        queryClient.invalidateQueries({ queryKey: ['messages', 'count'] });
      });
      socket.on('messages:read', (data) => {
        if (data.sender_id) {
          queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', data.sender_id] });
        }
        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
        // Invalidate message count badge when messages are read
        queryClient.invalidateQueries({ queryKey: ['messages', 'count'] });
      });
    }

    // Cleanup on unmount
    return () => {
      if (socket && listenersAttached) {
        // Remove all listeners added by this hook
        socket.off('project:created');
        socket.off('project:updated');
        socket.off('project:deleted');
        socket.off('vote:cast');
        socket.off('vote:removed');
        socket.off('comment:added');
        socket.off('comment:updated');
        socket.off('comment:deleted');
        socket.off('comment:voted');
        socket.off('project:featured');
        socket.off('badge:awarded');
        socket.off('leaderboard:updated');
        socket.off('user:updated');
        socket.off('intro:received');
        socket.off('intro:accepted');
        socket.off('intro:declined');
        socket.off('message:received');
        socket.off('message:read');
        socket.off('messages:read');
        listenersAttached = false;
      }
    };
  }, [queryClient]);

  // Return socket instance for manual operations if needed
  return socket;
}

// Export function to disconnect socket (call this on app unmount)
export function disconnectSocket() {
  if (socket) {
    if (import.meta.env.DEV) console.log('[Socket.IO] Disconnecting...');
    socket.disconnect();
    socket = null;
  }
}
