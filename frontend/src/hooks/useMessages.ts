import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { messagesService } from '@/services/api';
import { toast } from 'sonner';

// Fetch conversations
export function useConversations() {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: async () => (await messagesService.getConversations()).data?.data || [],
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
    queryFn: async () => (await messagesService.getConversation(userId)).data?.data?.messages || [],
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
      const { data } = await messagesService.send(recipientId, message);
      return data?.data;
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
      const { data } = await messagesService.markRead(messageId);
      return data?.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
