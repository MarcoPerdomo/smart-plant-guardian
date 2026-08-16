import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getConversation, markConversationRead, sendMessage } from "@/lib/chat.functions";
import { UserAvatar, displayNameOf } from "@/components/social/user-avatar";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  component: ConversationPage,
  head: () => ({
    meta: [
      { title: "Chat — Verdant" },
      { name: "description", content: "A private plant chat with your Verdant friend." },
      { property: "og:title", content: "Chat — Verdant" },
      { property: "og:description", content: "A private plant chat with your Verdant friend." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ConversationPage() {
  const { id } = useParams({ from: "/_authenticated/messages/$id" });
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => getConversation({ data: { id } }),
  });

  useEffect(() => {
    markConversationRead({ data: { conversation_id: id } })
      .then(() => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["unread_messages"] });
      })
      .catch(() => undefined);
  }, [id, data?.messages.length, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["conversation", id] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  const send = useMutation({
    mutationFn: () => sendMessage({ data: { conversation_id: id, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["conversation", id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-9rem)]">
      <header className="flex items-center gap-3 pb-4 border-b border-border">
        <Link to="/messages" className="p-1 rounded-md hover:bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <UserAvatar profile={data?.other ?? null} size={36} />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{displayNameOf(data?.other ?? null)}</p>
          {data?.other?.username && (
            <Link
              to="/u/$username"
              params={{ username: data.other.username }}
              className="text-xs text-muted-foreground hover:underline"
            >
              @{data.other.username}
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        ) : (data?.messages ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages yet. Break the ice with a plant photo story.
          </p>
        ) : (
          data?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.is_mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${m.is_mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {format(new Date(m.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) send.mutate();
        }}
        className="flex gap-2 pt-3 border-t border-border"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-base sm:text-sm"
        />
        <button
          type="submit"
          disabled={!body.trim() || send.isPending}
          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" /> Send
        </button>
      </form>
    </div>
  );
}
