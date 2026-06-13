import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type NotificationRow,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id;

  const { data: notifications = [] } = useNotifications(userId);
  const { data: unread = 0 } = useUnreadNotificationCount(userId);
  const markAsRead = useMarkAsRead(userId);
  const markAllAsRead = useMarkAllAsRead(userId);

  if (!user) return null;

  const handleClick = (n: NotificationRow) => {
    if (!n.read_at) markAsRead.mutate(n.id);
    const link = (n.data as { link?: string } | null)?.link;
    if (link && typeof link === "string") navigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={cn(
                      "block w-full px-4 py-3 text-left transition-colors hover:bg-accent",
                      !n.read_at && "bg-primary/5"
                    )}
                  >
                    {n.title && (
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    )}
                    {n.body && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
