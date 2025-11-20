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
let subscriberCount = 0; // Track number of components using this hook
let listenersAttached = false; // prevent duplicate listener registration across mounts/HMR

/**
 * Play notification sound for messages and intros
 */
function playNotificationSound(type: 'message' | 'intro') {
  try {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'message') {
      // Message chime: two quick beeps
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      // Second beep
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.12);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.22);
      oscillator.start(audioContext.currentTime + 0.12);
      oscillator.stop(audioContext.currentTime + 0.22);
    } else {
      // Intro chime: three musical notes
      const notes = [600, 800, 1000];
      notes.forEach((freq, idx) => {
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime + idx * 0.12);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + idx * 0.12);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + idx * 0.12 + 0.1
        );
        oscillator.start(audioContext.currentTime + idx * 0.12);
        oscillator.stop(audioContext.currentTime + idx * 0.12 + 0.1);
      });
    }
  } catch (error) {
    // Silently fail if audio context is not available
    if (import.meta.env.DEV) console.debug('[Audio] Notification sound error:', error);
  }
}

export function useRealTimeUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Increment subscriber count for this component
    subscriberCount++;

    // Get backend URL from environment or use default
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Initialize Socket.IO connection (only once)
    if (!socket) {
      // Get auth token from localStorage
      const token = localStorage.getItem('token');

      // Build socket configuration
      const socketConfig: any = {
        transports: ['polling', 'websocket'], // Start with polling, then upgrade to WebSocket
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        timeout: 20000,
        autoConnect: true,
      };

      // Only add auth if token exists
      if (token) {
        socketConfig.auth = { token };
      }

      socket = io(BACKEND_URL, socketConfig);
      // Connection event handlers (dev-only logs)
      if (import.meta.env.DEV) {
        // light diagnostics during development
        socket.on('connect', () => {
          console.log('[Socket.IO] Connected');
        });
        socket.on('disconnect', () => {
          console.log('[Socket.IO] Disconnected');
        });
        socket.on('connect_error', (error: any) => {
          console.log('[Socket.IO] Connection error:', error);
        });
      }
    }
    // Attach listeners once (when first subscriber joins)
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
        // Don't invalidate feed - backend cache + periodic refresh handles it
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
        // Don't invalidate feed on every vote - backend cache handles it
        // Only invalidate leaderboard as vote counts affect rankings
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });
      socket.on('vote:removed', (data) => {
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        // Don't invalidate feed on every vote - backend cache handles it
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });
      socket.on('vote:reconciled', (data) => {
        // Show toast notification
        toast.info('Vote counts updated', {
          description: 'Your vote has been synchronized',
          duration: 3000,
        });

        // Force refetch to get authoritative counts for the specific project only
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        // Don't invalidate entire feed - backend cache handles consistency
      });
      socket.on('comment:added', (data) => {
        // Only invalidate project cache for comment count update
        // Comments cache is already updated via optimistic update + onSuccess
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      });
      socket.on('comment:updated', (data) => {
        // Only invalidate project cache, comments cache updated via optimistic + onSuccess
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      });
      socket.on('comment:deleted', (data) => {
        // Only invalidate project cache for comment count
        // Comments cache already updated via optimistic + onSuccess
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
      });
      socket.on('comment:voted', (data) => {
        // Just invalidate the project cache to update comment vote counts if displayed
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
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
        // Invalidate featured projects specifically, not entire feed
        queryClient.invalidateQueries({ queryKey: ['featured-projects'] });
      });
      socket.on('badge:awarded', (data) => {
        toast.success('New badge awarded!');
        queryClient.invalidateQueries({ queryKey: ['project', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['badges', data.project_id] });
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
      });

      // Intros & messages
      socket.on('intro:received', (data) => {
        // Play notification chime
        playNotificationSound('intro');

        toast('New intro request received!');

        // Immediately add intro to received list
        if (data.data) {
          queryClient.setQueryData(
            ['intro-requests', 'received'],
            (old: any = []) => {
              // Check if intro already exists
              const exists = old.some((intro: any) => intro.id === data.data.id);
              return exists ? old : [data.data, ...old]; // Add to top
            }
          );
        }

        // Update intro request count badge
        queryClient.setQueryData(
          ['intro-requests', 'count'],
          (old: any = { pending_count: 0 }) => ({
            pending_count: (old?.pending_count || 0) + 1,
          })
        );
      });
      socket.on('intro:accepted', (data) => {
        toast.success('Your intro request was accepted!', {
          description: `${data.data?.builder_name || 'Someone'} accepted your intro request. Check your messages!`,
          duration: 5000,
        });

        const requestId = data.request_id || data.data?.request_id || data.data?.id;

        // Immediately remove intro from sent list
        if (requestId) {
          queryClient.setQueryData(
            ['intro-requests', 'sent'],
            (old: any = []) => old.filter((req: any) => req.id !== requestId)
          );
        }

        // Add conversation with new message immediately
        if (data.data?.initial_message && data.data?.builder_id) {
          queryClient.setQueryData(
            ['messages', 'conversation', data.data.builder_id],
            (old: any[] = []) => {
              const exists = old.some((msg) => msg.id === data.data.initial_message.id);
              return exists ? old : [...old, data.data.initial_message];
            }
          );
        }

        // Add to conversations list
        if (data.data?.builder_id && data.data?.builder_name) {
          queryClient.setQueryData(
            ['messages', 'conversations'],
            (old: any[] = []) => {
              const exists = old.some((conv: any) => conv.user?.id === data.data.builder_id);
              if (exists) return old;
              return [
                {
                  user: {
                    id: data.data.builder_id,
                    username: data.data.builder_username || 'Builder',
                    display_name: data.data.builder_name,
                    avatar_url: data.data.builder_avatar,
                  },
                  last_message: data.data.initial_message,
                  unread_count: 0,
                },
                ...old,
              ];
            }
          );
        }

        // Update message count
        queryClient.setQueryData(
          ['messages', 'count'],
          (old: any = { unread_count: 0 }) => ({
            unread_count: (old?.unread_count || 0) + 1,
          })
        );
      });

      socket.on('intro:declined', (data) => {
        toast('Your intro request was declined');

        const requestId = data.request_id || data.data?.request_id || data.data?.id;

        // Immediately remove intro from sent list
        if (requestId) {
          queryClient.setQueryData(
            ['intro-requests', 'sent'],
            (old: any = []) => old.filter((req: any) => req.id !== requestId)
          );
        }
        // Invalidate intro request count badge
        queryClient.invalidateQueries({ queryKey: ['intro-requests', 'count'] });
      });
      socket.on('message:received', (data) => {
        const message = data.data;
        const senderId = message?.sender_id || data.sender_id;
        const senderName = message?.sender?.username || data.sender_name || 'Someone';

        // Play notification chime
        playNotificationSound('message');

        toast(`New message from ${senderName}`, {
          description: message?.message?.substring(0, 50) || 'View message',
          duration: 4000,
        });

        if (senderId && message) {
          // Immediately add message to conversation cache (instant appearance)
          queryClient.setQueryData(
            ['messages', 'conversation', senderId],
            (old: any[] = []) => {
              // Check if message already exists
              const exists = old.some((msg) => msg.id === message.id);
              return exists ? old : [...old, message];
            }
          );
        }

        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
        // Invalidate message count badge
        queryClient.refetchQueries({ queryKey: ['messages', 'count'] });
      });
      // New persistent notification (from votes, comments, etc.)
      socket.on('new_notification', (notification) => {
        // Show toast for immediate feedback
        const title = notification.title || 'New Notification';
        const message = notification.message || '';

        // Display toast based on notification type
        switch (notification.notification_type) {
          case 'vote':
            toast('👍 ' + title, {
              description: message,
              duration: 5000,
            });
            // Play subtle sound
            playNotificationSound('message');
            break;
          case 'comment':
          case 'comment_reply':
            toast('💬 ' + title, {
              description: message,
              duration: 5000,
            });
            playNotificationSound('message');
            break;
          default:
            toast(title, {
              description: message,
              duration: 5000,
            });
        }

        // Update notifications cache (add to top of list)
        queryClient.setQueryData(
          ['notifications', {}],
          (old: any = {}) => {
            const oldData = old.data || [];
            // Check if notification already exists
            const exists = oldData.some((n: any) => n.id === notification.id);
            return exists
              ? old
              : {
                  ...old,
                  data: [notification, ...oldData],
                  total: (old?.total || 0) + 1,
                };
          }
        );

        // Update unread count
        queryClient.setQueryData(
          ['unreadCount'],
          (old: any = { unread_count: 0 }) => ({
            unread_count: (old?.unread_count || 0) + 1,
          })
        );

        // Invalidate to ensure sync with server
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      });

      socket.on('message:read', () => {
        // Refetch message count as a message was marked read
        queryClient.refetchQueries({ queryKey: ['messages', 'count'] });
      });
      socket.on('messages:read', (data) => {
        // Mark messages as read in conversation cache
        if (data.sender_id) {
          queryClient.setQueryData(
            ['messages', 'conversation', data.sender_id],
            (old: any[] = []) =>
              old.map((msg: any) =>
                msg.sender_id === data.sender_id ? { ...msg, is_read: true } : msg
              )
          );
        }

        // Update conversations list to show messages are read
        queryClient.setQueryData(
          ['messages', 'conversations'],
          (old: any[] = []) =>
            old.map((conv: any) =>
              conv.user?.id === data.sender_id
                ? { ...conv, unread_count: 0 }
                : conv
            )
        );

        // Refetch message count
        queryClient.refetchQueries({ queryKey: ['messages', 'count'] });
      });
    }

    // Cleanup on unmount
    return () => {
      // Decrement subscriber count
      subscriberCount--;

      // Only remove listeners when last subscriber unmounts
      if (socket && listenersAttached && subscriberCount === 0) {
        // Remove all listeners added by this hook
        socket.off('project:created');
        socket.off('project:updated');
        socket.off('project:deleted');
        socket.off('vote:cast');
        socket.off('vote:removed');
        socket.off('vote:reconciled');
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
