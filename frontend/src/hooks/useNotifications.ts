import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/services/notificationApi';
import type { NotificationType } from '@/types';
import { toast } from 'sonner';

export function useNotifications(options?: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  types?: NotificationType[];
}) {
  return useQuery({
    queryKey: ['notifications', options],
    queryFn: () => notificationApi.getNotifications(options),
    select: (response) => response.data,
    refetchInterval: 60000, // Refetch every 60 seconds (we have real-time updates via socket)
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['unreadCount'],
    queryFn: () => notificationApi.getUnreadCount(),
    select: (response) => response.data,
    refetchInterval: 60000, // Refetch every 60 seconds (we have real-time updates via socket)
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markAsRead(notificationId),
    onMutate: (notificationId) => {
      // Optimistic update for notifications
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          ),
        };
      });

      // Optimistic update for unread count
      queryClient.setQueryData(['unreadCount'], (old: any) => {
        if (typeof old?.unread_count !== 'number') return old;
        return {
          ...old,
          unread_count: Math.max(0, old.unread_count - 1),
        };
      });
    },
    onSuccess: () => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: (response) => {
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((n: any) => ({ ...n, is_read: true })),
        };
      });
      queryClient.setQueryData(['unreadCount'], { unread_count: 0 });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      const count = response.data.count;
      if (count > 0) {
        toast.success(`Marked ${count} notification${count > 1 ? 's' : ''} as read`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to mark notifications as read');
    },
  });
}

export function useClearAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationApi.deleteAll(),
    onSuccess: (response) => {
      // Clear the cache immediately
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old) {
          return { notifications: [], total: 0, unread_count: 0 };
        }
        return {
          ...old,
          notifications: [],
          total: 0,
          unread_count: 0,
        };
      });
      queryClient.setQueryData(['unreadCount'], { unread_count: 0 });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      const count = response.data.count;
      if (count > 0) {
        toast.success(`Cleared ${count} notification${count > 1 ? 's' : ''}`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to clear notifications');
    },
  });
}
