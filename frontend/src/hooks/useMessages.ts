import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { toast } from 'sonner';

// Get backend URL
const getBackendUrl = (): string => {
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
  return isDev ? 'http://localhost:5000' : 'https://discovery-platform.onrender.com';
};

// Fetch conversations
export function useConversations() {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: async () => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/messages/conversations`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      throw new Error(data.message || 'Failed to fetch conversations');
    },
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}

// Fetch messages with a specific user
export function useMessagesWithUser(userId: string) {
  return useQuery({
    queryKey: ['messages', 'conversation', userId],
    queryFn: async () => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/messages/conversation/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data.messages;
      }
      throw new Error(data.message || 'Failed to fetch messages');
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipientId, message }: { recipientId: string; message: string }) => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipient_id: recipientId,
          message: message,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      throw new Error(data.message || 'Failed to send message');
    },
    onSuccess: (_, variables) => {
      // Invalidate conversations and specific conversation
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', variables.recipientId] });
      toast.success('Message sent!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

// Mark message as read
export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        return data.data;
      }
      throw new Error(data.message || 'Failed to mark message as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
