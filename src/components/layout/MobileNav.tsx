import { Link, useLocation } from "react-router-dom";
import { Home, FileText, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";

const TABS = [
  { to: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    to: "/dashboard",
    label: "Requests",
    icon: FileText,
    match: (p: string) =>
      p === "/dashboard" ||
      (p.startsWith("/dashboard") &&
        !p.startsWith("/dashboard/messages")),
  },
  {
    to: "/dashboard/messages",
    label: "Messages",
    icon: MessageCircle,
    match: (p: string) => p.startsWith("/dashboard/messages"),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: User,
    match: (p: string) => p.startsWith("/profile"),
  },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  const { unreadCount } = useUnreadMessageCount();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card px-2 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {TABS.map(({ to, label, icon: Icon, match }) => {
        const active = match(pathname);
        const showBadge = label === "Messages" && unreadCount > 0;
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <div className="relative">
              <Icon size={20} />
              {showBadge && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
