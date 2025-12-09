import { memo, useCallback } from 'react';
import { Notification } from '@/types';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from '@/utils/date';
import {
  Bell,
  CheckCircle,
  XCircle,
  Folder,
  UserPlus,
  Star,
  AlertCircle,
  Trash2,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
}

const NotificationIcon = ({ type }: { type: string }) => {
  const iconClass = "h-4 w-4 flex-shrink-0";

  switch (type) {
    case 'chain_new_project':
      return <Folder className={cn(iconClass, "text-blue-500")} />;
    case 'chain_request_approved':
      return <CheckCircle className={cn(iconClass, "text-green-500")} />;
    case 'chain_request_rejected':
      return <XCircle className={cn(iconClass, "text-red-500")} />;
    case 'project_added_to_chain':
      return <Folder className={cn(iconClass, "text-blue-500")} />;
    case 'project_removed_from_chain':
      return <Trash2 className={cn(iconClass, "text-orange-500")} />;
    case 'chain_follower':
      return <UserPlus className={cn(iconClass, "text-purple-500")} />;
    case 'chain_featured':
      return <Star className={cn(iconClass, "text-orange-500")} />;
    case 'chain_project_request':
      return <AlertCircle className={cn(iconClass, "text-blue-500")} />;
    case 'vote':
      return <ThumbsUp className={cn(iconClass, "text-green-500")} />;
    case 'comment':
      return <MessageSquare className={cn(iconClass, "text-cyan-500")} />;
    case 'comment_reply':
      return <MessageSquare className={cn(iconClass, "text-cyan-500")} />;
    default:
      return <Bell className={cn(iconClass, "text-muted-foreground")} />;
  }
};

export const NotificationItem = memo(function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const handleClick = useCallback(() => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  }, [notification.is_read, notification.id, onMarkAsRead]);

  // Check if this is a snap notification
  const isSnapNotification = notification.redirect_url?.includes('/snaps/');

  const notificationContent = (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl border transition-all duration-200 bg-background/60 shadow-sm",
        !isSnapNotification && "cursor-pointer hover:bg-background/80",
        "flex gap-3 p-4 rounded-xl border transition-all duration-200 bg-background/60 shadow-sm",
        !isSnapNotification && "cursor-pointer hover:bg-background/80",
        notification.is_read
          ? "border-border/50 hover:border-primary/40"
          : "border-primary/40 bg-primary/10 hover:bg-primary/15 shadow-[0_12px_35px_rgba(59,130,246,0.18)]"
      )}
      onClick={handleClick}
    >
      <div className="mt-0.5">
        <NotificationIcon type={notification.notification_type} />
      </div>

      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {notification.title}
          </p>
          {!notification.is_read && (
            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
          )}
        </div>

        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {notification.message}
        </p>

        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  );

  // For snap notifications, just show the content without link
  if (isSnapNotification) {
    return notificationContent;
  }

  // For other notifications, link to notifications page for full details
  return (
    <Link to="/notifications" className="block">
      {notificationContent}
    </Link>
  );
});
