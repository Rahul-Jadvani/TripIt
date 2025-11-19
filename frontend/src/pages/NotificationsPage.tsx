import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/NotificationItem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useNotifications({
    unread_only: filter === 'unread',
    page,
    limit: 20,
  });

  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const notifications = data?.notifications || [];
  const totalPages = data?.total_pages || 1;
  const unreadCount = data?.unread_count || 0;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            You must be logged in to view notifications
          </p>
          <Button asChild>
            <Link to="/login">Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Stay updated with your layerz and projects
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(v) => {
        setFilter(v as 'all' | 'unread');
        setPage(1); // Reset pagination on filter change
      }}>
        <TabsList>
          <TabsTrigger value="all">
            All Notifications
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-destructive">Failed to load notifications</p>
            </Card>
          ) : notifications.length === 0 ? (
            <Card className="p-12 text-center space-y-4">
              <Bell className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <p className="text-muted-foreground text-lg">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {filter === 'unread'
                    ? "You're all caught up!"
                    : "You'll be notified about activity on your layerz and projects"}
                </p>
                {filter === 'unread' && data && (
                  <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    Total notifications: {data.total || 0}
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <>
              <Card className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                  />
                ))}
              </Card>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
