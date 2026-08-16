import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Leaf, Users, MapPin, MessageCircle, UserPlus, Check, Ban } from "lucide-react";
import { blockUser, getPublicProfile, respondToFriendRequest, sendFriendRequest } from "@/lib/social.functions";
import { openConversation } from "@/lib/chat.functions";
import { UserAvatar, displayNameOf } from "@/components/social/user-avatar";

export const Route = createFileRoute("/_authenticated/u/$username")({
  component: ProfilePage,
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Verdant` },
      { name: "description", content: `See @${params.username}'s plant collection stats and connect on Verdant.` },
      { property: "og:title", content: `@${params.username} on Verdant` },
      { property: "og:description", content: `See @${params.username}'s plant collection stats and connect on Verdant.` },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function countryName(code: string | null) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function ProfilePage() {
  const { username } = useParams({ from: "/_authenticated/u/$username" });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["public_profile", username],
    queryFn: () => getPublicProfile({ data: { username } }),
    retry: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["public_profile", username] });
    qc.invalidateQueries({ queryKey: ["friendships"] });
  };

  const request = useMutation({
    mutationFn: () => sendFriendRequest({ data: { user_id: profile!.id } }),
    onSuccess: () => {
      toast.success("Request sent");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const accept = useMutation({
    mutationFn: () => respondToFriendRequest({ data: { id: profile!.friendship!.id, accept: true } }),
    onSuccess: () => {
      toast.success("You're connected");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const block = useMutation({
    mutationFn: () => blockUser({ data: { user_id: profile!.id, block: true } }),
    onSuccess: () => {
      toast.success("User blocked");
      navigate({ to: "/friends" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const message = useMutation({
    mutationFn: () => openConversation({ data: { user_id: profile!.id } }),
    onSuccess: (conv) => navigate({ to: "/messages/$id", params: { id: conv.id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;
  if (error || !profile)
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Gardener not found</h1>
        <p className="text-sm text-muted-foreground mt-2">That username doesn&apos;t exist on Verdant.</p>
      </div>
    );

  const country = countryName(profile.country_code);
  const friendship = profile.friendship;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <UserAvatar profile={profile} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-semibold">{displayNameOf(profile)}</h1>
            {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-primary" /> {profile.plant_count} plants
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" /> {profile.friend_count} friends
              </span>
              {country && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> {country}
                </span>
              )}
              <span>Growing since {format(new Date(profile.created_at), "MMM yyyy")}</span>
            </div>
          </div>
        </div>

        {!profile.is_me && (
          <div className="mt-5 flex flex-wrap gap-2">
            {friendship?.status === "accepted" ? (
              <button
                onClick={() => message.mutate()}
                disabled={message.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" /> Message
              </button>
            ) : friendship?.status === "pending" && friendship.direction === "incoming" ? (
              <button
                onClick={() => accept.mutate()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Accept request
              </button>
            ) : friendship?.status === "pending" ? (
              <span className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground">
                Request pending
              </span>
            ) : (
              <button
                onClick={() => request.mutate()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Add friend
              </button>
            )}
            <button
              onClick={() => block.mutate()}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted flex items-center gap-1.5"
            >
              <Ban className="w-4 h-4" /> Block
            </button>
          </div>
        )}
      </section>

      <p className="text-xs text-muted-foreground text-center">
        Plant updates are shared with friends only — connect to see {displayNameOf(profile)}&apos;s feed.
      </p>
    </div>
  );
}
