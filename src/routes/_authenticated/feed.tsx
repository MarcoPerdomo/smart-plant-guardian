import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HelpCircle, Users, Sprout } from "lucide-react";
import { createPost, getFeed, listFriendships } from "@/lib/social.functions";
import { listUserPlants } from "@/lib/plants.functions";
import { PostCard, type FeedPost } from "@/components/social/post-card";

export const Route = createFileRoute("/_authenticated/feed")({
  component: FeedPage,
  head: () => ({
    meta: [
      { title: "Plant feed — Verdant" },
      { name: "description", content: "See what your plant friends are growing, watering and rescuing." },
      { property: "og:title", content: "Plant feed — Verdant" },
      { property: "og:description", content: "See what your plant friends are growing, watering and rescuing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function FeedPage() {
  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: () => getFeed({ data: {} }) });
  const { data: friendships } = useQuery({ queryKey: ["friendships"], queryFn: () => listFriendships() });
  const friendCount = friendships?.friends.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Feed</h1>
          <p className="text-sm text-muted-foreground">
            {friendCount > 0 ? `${friendCount} plant friend${friendCount === 1 ? "" : "s"}` : "Find friends to fill your feed"}
          </p>
        </div>
        <Link
          to="/friends"
          className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted flex items-center gap-1.5"
        >
          <Users className="w-4 h-4" /> Friends
        </Link>
      </header>

      <HelpComposer />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the greenhouse gossip…</p>
      ) : (data?.posts ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Sprout className="w-8 h-8 text-primary mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing here yet. Water a plant, add a photo, or{" "}
            <Link to="/friends" className="text-primary hover:underline">
              add some friends
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(data?.posts ?? []).map((post) => {
            const path = (post.payload as { storage_path?: string } | null)?.storage_path;
            return (
              <PostCard
                key={post.id}
                post={post as unknown as FeedPost}
                photoUrl={path ? data?.photoUrls[path] : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function HelpComposer() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [plantId, setPlantId] = useState("");
  const { data: plants = [] } = useQuery({ queryKey: ["plants"], queryFn: () => listUserPlants(), enabled: open });

  const post = useMutation({
    mutationFn: () =>
      createPost({
        data: { kind: "help", body: body.trim(), plant_id: plantId || null },
      }),
    onSuccess: () => {
      toast.success("Your friends will see it");
      setBody("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-border bg-card px-5 py-4 text-left text-sm text-muted-foreground hover:bg-muted/40 flex items-center gap-2"
      >
        <HelpCircle className="w-4 h-4 text-primary" /> Ask your friends for help with a plant…
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <HelpCircle className="w-5 h-5 text-primary" /> Ask for help
      </h2>
      <select
        value={plantId}
        onChange={(e) => setPlantId(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
      >
        <option value="">Which plant? (optional)</option>
        {plants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nickname}
          </option>
        ))}
      </select>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Yellowing leaves at the base — too much water?"
        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => post.mutate()}
          disabled={!body.trim() || post.isPending}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {post.isPending ? "Posting…" : "Post to friends"}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
