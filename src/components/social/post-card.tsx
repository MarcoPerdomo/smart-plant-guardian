import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Droplets, Sprout, Camera, Trophy, HelpCircle, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addComment, deleteComment, deletePost, listComments, toggleReaction } from "@/lib/social.functions";
import { UserAvatar, displayNameOf } from "@/components/social/user-avatar";

export const REACTIONS = ["🌱", "💚", "🌸", "💧", "👏"] as const;

export type FeedPost = {
  id: string;
  author_id: string;
  plant_id: string | null;
  kind: string;
  body: string | null;
  payload: unknown;
  created_at: string;
  author: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
  reactions: { emoji: string; count: number; mine: boolean }[];
  comment_count: number;
  is_mine: boolean;
};

const KIND_META: Record<string, { icon: React.ElementType; verb: string }> = {
  watering: { icon: Droplets, verb: "watered" },
  photo: { icon: Camera, verb: "added a photo of" },
  new_plant: { icon: Sprout, verb: "welcomed a new plant:" },
  milestone: { icon: Trophy, verb: "hit a milestone with" },
  help: { icon: HelpCircle, verb: "needs help with" },
};

export function PostCard({ post, photoUrl }: { post: FeedPost; photoUrl?: string }) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const payload = (post.payload ?? {}) as { nickname?: string; milestone?: string };
  const meta = KIND_META[post.kind] ?? { icon: Sprout, verb: "posted about" };
  const Icon = meta.icon;
  const nickname = payload.nickname ?? "a plant";
  const isBig = post.kind === "photo" || post.kind === "help";

  const react = useMutation({
    mutationFn: (emoji: string) => toggleReaction({ data: { post_id: post.id, emoji } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => deletePost({ data: { id: post.id } }),
    onSuccess: () => {
      toast.success("Update removed");
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <article className={`rounded-2xl border border-border bg-card ${isBig ? "p-5" : "px-5 py-4"}`}>
      <header className="flex items-center gap-3">
        <UserAvatar profile={post.author} size={isBig ? 40 : 32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            {post.author?.username ? (
              <Link to="/u/$username" params={{ username: post.author.username }} className="font-medium hover:underline">
                {displayNameOf(post.author)}
              </Link>
            ) : (
              <span className="font-medium">{displayNameOf(post.author)}</span>
            )}{" "}
            <span className="text-muted-foreground">{meta.verb}</span>{" "}
            <span className="font-medium">{nickname}</span>
            {payload.milestone ? <span className="text-muted-foreground"> · {payload.milestone}</span> : null}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Icon className="w-3 h-3 text-primary" />
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
        {post.is_mine && (
          <button
            onClick={() => remove.mutate()}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Delete update"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </header>

      {post.body && <p className="mt-3 text-sm whitespace-pre-wrap">{post.body}</p>}

      {isBig && photoUrl && (
        <img
          src={photoUrl}
          alt={`${nickname} shared by ${displayNameOf(post.author)}`}
          className="mt-3 rounded-xl w-full max-h-[28rem] object-contain bg-muted"
          loading="lazy"
        />
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((emoji) => {
          const r = post.reactions.find((x) => x.emoji === emoji);
          return (
            <button
              key={emoji}
              onClick={() => react.mutate(emoji)}
              className={`px-2 py-1 rounded-full border text-xs transition-colors ${
                r?.mine ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
              }`}
            >
              {emoji}
              {r?.count ? <span className="ml-1 tabular-nums">{r.count}</span> : null}
            </button>
          );
        })}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="ml-auto px-2 py-1 rounded-full border border-border text-xs hover:bg-muted flex items-center gap-1.5"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {post.comment_count > 0 ? post.comment_count : "Comment"}
        </button>
      </footer>

      {showComments && <Comments postId={post.id} />}
    </article>
  );
}

function Comments({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["post_comments", postId],
    queryFn: () => listComments({ data: { post_id: postId } }),
  });

  const add = useMutation({
    mutationFn: () => addComment({ data: { post_id: postId, body: body.trim() } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["post_comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteComment({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post_comments", postId] });
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-3">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <UserAvatar profile={c.author} size={26} />
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-medium">{displayNameOf(c.author)}</span>{" "}
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </p>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
            </div>
            {c.is_mine && (
              <button onClick={() => del.mutate(c.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) add.mutate();
        }}
        className="flex gap-2"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a kind word…"
          className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
        />
        <button
          type="submit"
          disabled={add.isPending || !body.trim()}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          Post
        </button>
      </form>
    </div>
  );
}
