import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, UserPlus, Check, X, UserMinus } from "lucide-react";
import {
  listFriendships,
  removeFriend,
  respondToFriendRequest,
  searchUsers,
  sendFriendRequest,
} from "@/lib/social.functions";
import { UserAvatar, displayNameOf } from "@/components/social/user-avatar";

export const Route = createFileRoute("/_authenticated/friends")({
  component: FriendsPage,
  head: () => ({
    meta: [
      { title: "Plant friends — Verdant" },
      { name: "description", content: "Find fellow plant people by username and manage your friend requests." },
      { property: "og:title", content: "Plant friends — Verdant" },
      { property: "og:description", content: "Find fellow plant people by username and manage your friend requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FriendsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["user_search", q.trim()],
    queryFn: () => searchUsers({ data: { q: q.trim() } }),
    enabled: q.trim().length >= 2,
  });
  const { data: friendships } = useQuery({ queryKey: ["friendships"], queryFn: () => listFriendships() });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["friendships"] });
    qc.invalidateQueries({ queryKey: ["user_search"] });
    qc.invalidateQueries({ queryKey: ["feed"] });
  };

  const request = useMutation({
    mutationFn: (userId: string) => sendFriendRequest({ data: { user_id: userId } }),
    onSuccess: () => {
      toast.success("Request sent");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: (v: { id: string; accept: boolean }) => respondToFriendRequest({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.accept ? "You're connected" : "Request declined");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unfriend = useMutation({
    mutationFn: (userId: string) => removeFriend({ data: { user_id: userId } }),
    onSuccess: () => {
      toast.success("Friend removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-semibold">Plant friends</h1>

      <section className="rounded-2xl border border-border bg-card p-5">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Find people</label>
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by username or name"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        {q.trim().length >= 2 && (
          <div className="mt-4 divide-y divide-border">
            {isFetching && results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Searching…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No gardeners found.</p>
            ) : (
              results.map((u) => (
                <div key={u.id} className="py-3 flex items-center gap-3">
                  <UserAvatar profile={u} size={36} />
                  <div className="flex-1 min-w-0">
                    <PersonName profile={u} />
                  </div>
                  {u.friendship?.status === "accepted" ? (
                    <span className="text-xs text-muted-foreground">Friends</span>
                  ) : u.friendship?.status === "pending" ? (
                    <span className="text-xs text-muted-foreground">
                      {u.friendship.direction === "outgoing" ? "Requested" : "Wants to connect"}
                    </span>
                  ) : (
                    <button
                      onClick={() => request.mutate(u.id)}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {(friendships?.incoming.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Requests</h2>
          <div className="mt-2 divide-y divide-border">
            {friendships?.incoming.map((f) => (
              <div key={f.id} className="py-3 flex items-center gap-3">
                <UserAvatar profile={f.profile} size={36} />
                <div className="flex-1 min-w-0">
                  <PersonName profile={f.profile} />
                </div>
                <button
                  onClick={() => respond.mutate({ id: f.id, accept: true })}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  onClick={() => respond.mutate({ id: f.id, accept: false })}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Decline
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-lg font-semibold">Your friends</h2>
        {(friendships?.friends.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">
            No friends yet — search above and send your first request.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-border">
            {friendships?.friends.map((f) => (
              <div key={f.id} className="py-3 flex items-center gap-3">
                <UserAvatar profile={f.profile} size={36} />
                <div className="flex-1 min-w-0">
                  <PersonName profile={f.profile} />
                </div>
                <button
                  onClick={() => f.profile && unfriend.mutate(f.profile.id)}
                  className="px-2 py-1.5 rounded-lg border border-border text-xs hover:bg-muted text-muted-foreground flex items-center gap-1.5"
                >
                  <UserMinus className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {(friendships?.outgoing.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Pending invitations</h2>
          <div className="mt-2 divide-y divide-border">
            {friendships?.outgoing.map((f) => (
              <div key={f.id} className="py-3 flex items-center gap-3">
                <UserAvatar profile={f.profile} size={36} />
                <div className="flex-1 min-w-0">
                  <PersonName profile={f.profile} />
                </div>
                <span className="text-xs text-muted-foreground">Waiting</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PersonName({
  profile,
}: {
  profile: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
}) {
  if (!profile) return <span className="text-sm text-muted-foreground">Unknown gardener</span>;
  return (
    <>
      {profile.username ? (
        <Link to="/u/$username" params={{ username: profile.username }} className="text-sm font-medium hover:underline">
          {displayNameOf(profile)}
        </Link>
      ) : (
        <span className="text-sm font-medium">{displayNameOf(profile)}</span>
      )}
      {profile.username && <div className="text-xs text-muted-foreground truncate">@{profile.username}</div>}
    </>
  );
}
