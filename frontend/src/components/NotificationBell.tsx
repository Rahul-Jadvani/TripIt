import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings, Check, Trash2, Loader2, Send, MessageSquare, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NotificationItem } from './NotificationItem';
import { ConfirmDialog } from './ConfirmDialog';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useClearAllNotifications,
} from '@/hooks/useNotifications';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { data: notificationsData, isLoading, refetch } = useNotifications({
    limit: 10,
  });

  const { data: unreadCountData, refetch: refetchUnreadCount } = useUnreadNotificationCount();
  const { unreadMessagesCount, pendingIntrosCount } = useNotificationCounts();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const clearAllMutation = useClearAllNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadCountData?.unread_count ?? 0;
  const supplementalCount = (unreadMessagesCount || 0) + (pendingIntrosCount || 0);
  const notificationBubbleCount = unreadCount + supplementalCount;
  const hasNotifications = notifications.length > 0;
  const hasQuickAlerts = (pendingIntrosCount ?? 0) > 0 || (unreadMessagesCount ?? 0) > 0;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = async () => {
    return new Promise<void>((resolve, reject) => {
      markAllAsReadMutation.mutate(undefined, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const handleClearAll = async () => {
    return clearAllMutation.mutateAsync();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnreadCount()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationBubbleCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1.5 -right-1.5 h-5 min-w-[1.4rem] w-fit px-1 flex items-center justify-center p-0 text-[10px] font-semibold leading-none bg-primary/90 text-primary-foreground shadow-lg"
            >
              {notificationBubbleCount > 9 ? '9+' : notificationBubbleCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[95vw] sm:w-[420px] p-0 border border-border/60 bg-background text-card-foreground shadow-2xl backdrop-blur-xl overflow-hidden"
        align="end"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 p-4 border-b border-border/60 bg-background/60 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Inbox</p>
              <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 rounded-full bg-secondary/50 border-border/70 hover:bg-secondary/80"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-9 w-9 rounded-full bg-secondary/50 border-border/70 hover:bg-secondary/80"
              >
                <Link to="/notifications" onClick={() => setOpen(false)}>
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="h-9 flex-1 sm:flex-none gap-2 border-border/70 bg-secondary/40 text-xs font-semibold"
            >
              <Check className="h-3.5 w-3.5" />
              {markAllAsReadMutation.isPending ? 'Marking...' : 'Mark all read'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={!hasNotifications || clearAllMutation.isPending}
              className="h-9 flex-1 sm:flex-none gap-2 border-border/70 bg-secondary/40 text-xs font-semibold disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearAllMutation.isPending ? 'Clearing...' : 'Clear all'}
            </Button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={showClearConfirm}
          onOpenChange={setShowClearConfirm}
          title="Clear all notifications?"
          description="This action cannot be undone. All notifications will be permanently deleted."
          actionLabel="Clear all"
          cancelLabel="Cancel"
          onConfirm={handleClearAll}
          isLoading={clearAllMutation.isPending}
          isDangerous={true}
        />

        {/* Notifications List */}
        <ScrollArea className="h-[320px] sm:h-[420px] bg-background/60">
          {hasQuickAlerts && (
            <div className="p-3 border-b border-border/60 bg-background/60 space-y-2">
              {pendingIntrosCount > 0 && (
                <Link
                  to="/intros"
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3 hover:bg-primary/15 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
                    <Send className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Pending intro requests</p>
                      <Badge variant="secondary" className="bg-primary text-primary-foreground">
                        {pendingIntrosCount > 9 ? '9+' : pendingIntrosCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pendingIntrosCount === 1
                        ? '1 intro request needs your attention.'
                        : `${pendingIntrosCount} intro requests waiting for action.`}
                    </p>
                  </div>
                </Link>
              )}
              {unreadMessagesCount > 0 && (
                <Link
                  to="/messages"
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-3 hover:bg-secondary/60 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-secondary/70 border border-border flex items-center justify-center text-primary">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">Unread messages</p>
                      <Badge variant="outline" className="border-primary/60 text-primary">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {unreadMessagesCount === 1
                        ? 'New message waiting in your inbox.'
                        : `${unreadMessagesCount} new messages waiting in your inbox.`}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          )}
          {isLoading ? (
            <div className="p-10 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Fetching notifications...
            </div>
          ) : hasNotifications ? (
            <div className="divide-y divide-border/70">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          ) : !hasQuickAlerts ? (
            <div className="p-10 text-center space-y-3 text-muted-foreground">
              <div className="h-16 w-16 rounded-full border border-dashed border-border/60 flex items-center justify-center mx-auto">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">You're all caught up</p>
                <p className="text-xs text-muted-foreground">
                  Activity about your projects, layerz, intros, and messages will appear here.
                </p>
              </div>
            </div>
          ) : null}
        </ScrollArea>

        {/* Footer */}
        {hasNotifications && (
          <div className="p-3 border-t border-border/60 bg-background/80 backdrop-blur">
            <Link
              to="/notifications"
              className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
              onClick={() => setOpen(false)}
            >
              View all activity
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
