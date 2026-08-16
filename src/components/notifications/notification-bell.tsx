import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/social/user-avatar";
import { CountBadge } from "@/components/ui/count-badge";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from "@/lib/notifications.functions";

const EMPTY_PHRASES = [
  "Nothing new — your plants are behaving.",
  "Nothing new, go outside!",
  "Nothing to report, enjoy your day!",
  "All quiet in the greenhouse.",
  "No news is good news.",
  "Your plants are thriving in silence.",
  "Go touch some grass (or a fern).",
  "The garden is calm today.",
  "Zero alerts, full serenity.",
  "Nothing to water here.",
  "Sit back and watch them grow.",
];

export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const unread = notifications.filter((n) => !n.read_at).length;

  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleClick(n: NotificationItem) {
    if (!n.read_at) {
      await markNotificationRead({ data: { id: n.id } });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
    setOpen(false);
    if (n.link) navigate({ to: n.link as "./" });
  }

  const emptyPhrase = EMPTY_PHRASES[Math.floor(Math.random() * EMPTY_PHRASES.length)];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1">
            <CountBadge count={unread} />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="font-display font-semibold text-sm">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-xs flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
            >
              <CheckAll className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{emptyPhrase}</div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleClick(n)}
              className="flex items-start gap-3 px-3 py-3 cursor-pointer border-b border-border last:border-0"
            >
              <UserAvatar profile={n.actor} size={36} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${n.read_at ? "text-muted-foreground" : "font-medium"}`}>
                  {n.title}
                </div>
                {n.body && <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </div>
              {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary mt-1.5" aria-hidden />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CheckAll({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 7 17l-5-5" />
      <path d="m22 10-7.5 7.5L13 16" />
    </svg>
  );
}
