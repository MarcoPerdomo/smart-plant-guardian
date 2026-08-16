import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle } from "lucide-react";
import { listConversations } from "@/lib/chat.functions";
import { UserAvatar, displayNameOf } from "@/components/social/user-avatar";


export const Route = createFileRoute("/_authenticated/messages/")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Messages — Verdant" },
      { name: "description", content: "Private plant chats with your Verdant friends." },
      { property: "og:title", content: "Messages — Verdant" },
      { property: "og:description", content: "Private plant chats with your Verdant friends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MessagesPage() {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => listConversations(),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-semibold">Messages</h1>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <MessageCircle className="w-8 h-8 text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            No chats yet. Open a friend&apos;s profile from{" "}
            <Link to="/friends" className="text-primary hover:underline">
              your friends list
            </Link>{" "}
            to start one.
          </p>
        </div>
      ) : (
        <ul className="rounded-2xl border border-border bg-card divide-y divide-border">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link to="/messages/$id" params={{ id: c.id }} className="flex items-center gap-3 p-4 hover:bg-muted/40">
                <UserAvatar profile={c.other} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{displayNameOf(c.other)}</span>
                    {c.unread > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.last_message?.body ?? "Say hello"}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
