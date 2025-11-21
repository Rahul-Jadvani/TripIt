export interface Notice {
  id: string;
  text: string;
  type?: 'default' | 'success' | 'info' | 'warning' | 'error';
  duration?: number; // milliseconds, 0 or undefined means no auto-dismiss
}

type NoticeCallback = (notice: Notice) => void;

const subscribers: Set<NoticeCallback> = new Set();

/**
 * Subscribe to notifications
 * @param callback - Function to call when a notification is published
 * @returns Unsubscribe function
 */
export function subscribeNotice(callback: NoticeCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Publish a notification to all subscribers
 * @param notice - The notification to publish
 */
export function publishNotice(notice: Omit<Notice, 'id'> & { id?: string }): void {
  const fullNotice: Notice = {
    id: notice.id ?? `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    text: notice.text,
    type: notice.type ?? 'default',
    duration: notice.duration ?? 4000,
  };

  subscribers.forEach(callback => callback(fullNotice));
}

/**
 * Helper functions for common notification types
 */
export const notify = {
  success: (text: string, duration?: number) =>
    publishNotice({ text, type: 'success', duration }),

  info: (text: string, duration?: number) =>
    publishNotice({ text, type: 'info', duration }),

  warning: (text: string, duration?: number) =>
    publishNotice({ text, type: 'warning', duration }),

  error: (text: string, duration?: number) =>
    publishNotice({ text, type: 'error', duration }),

  default: (text: string, duration?: number) =>
    publishNotice({ text, type: 'default', duration }),
};
