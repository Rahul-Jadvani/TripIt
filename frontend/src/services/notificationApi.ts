import api from './api';
import type { Notification, NotificationType } from '../types';

export const notificationApi = {
  // Get user's notifications
  async getNotifications(options?: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
    types?: NotificationType[];
  }): Promise<{
    data: {
      notifications: Notification[];
      unread_count: number;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    };
  }> {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.unread_only) params.append('unread_only', 'true');
    if (options?.types && options.types.length > 0) {
      params.append('types', options.types.join(','));
    }

    const response = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ data: { notification: Notification } }> {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<{ data: { count: number } }> {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  // Get unread count
  async getUnreadCount(): Promise<{ data: { unread_count: number } }> {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
};

export default notificationApi;
