import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  created_at: string;
};

// ============ Username ============
export const getMyUsername = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, country_code, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const checkUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ username: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const username = data.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return { available: false, reason: "3-24 characters, letters, numbers, dot or underscore" };
    }
    const { data: rows, error } = await context.supabase.rpc("search_profiles", { _q: username, _limit: 50 });
    if (error) throw new Error(error.message);
    const taken = (rows ?? []).some((r) => (r.username ?? "").toLowerCase() === username);
    return { available: !taken, reason: taken ? "That username is taken" : null };
  });

export const setUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        username: z.string(),
        bio: z.string().max(280).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const username = data.username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) throw new Error("Usernames are 3-24 characters: letters, numbers, dot or underscore");

    const patch: { username: string; username_set_at: string; bio?: string | null } = {
      username,
      username_set_at: new Date().toISOString(),
    };
    if (data.bio !== undefined) patch.bio = data.bio ?? null;

    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) {
      if (error.code === "23505") throw new Error("That username is already taken");
      throw new Error(error.message);
    }
    return { ok: true, username };
  });

export const updateSocialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ bio: z.string().max(280).nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update({ bio: data.bio }).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ People search & profiles ============
export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    if (q.length < 2) return [];
    const { data: rows, error } = await context.supabase.rpc("search_profiles", { _q: q, _limit: 20 });
    if (error) throw new Error(error.message);
    const profiles = (rows ?? []) as PublicProfile[];
    const statuses = await friendshipStatuses(context, profiles.map((p) => p.id));
    return profiles.map((p) => ({ ...p, friendship: statuses[p.id] ?? null }));
  });

type Ctx = { supabase: any; userId: string };

type FriendshipInfo = { status: string; direction: "outgoing" | "incoming"; id: string };

async function friendshipStatuses(context: Ctx, ids: string[]): Promise<Record<string, FriendshipInfo>> {
  if (ids.length === 0) return {};
  const { data } = await context.supabase
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.in.(${ids.join(",")}),addressee_id.in.(${ids.join(",")})`);
  const map: Record<string, FriendshipInfo> = {};
  for (const f of data ?? []) {
    const other = f.requester_id === context.userId ? f.addressee_id : f.requester_id;
    if (!ids.includes(other)) continue;
    map[other] = {
      id: f.id,
      status: f.status,
      direction: f.requester_id === context.userId ? "outgoing" : "incoming",
    };
  }
  return map;
}

export const getPublicProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ username: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("get_profile_by_username", {
      _username: data.username.trim(),
    });
    if (error) throw new Error(error.message);
    const profile = (rows ?? [])[0];
    if (!profile) throw new Error("That gardener could not be found");
    const statuses = await friendshipStatuses(context, [profile.id]);
    const isMe = profile.id === context.userId;
    return {
      ...profile,
      is_me: isMe,
      friendship: statuses[profile.id] ?? null,
    };
  });

// ============ Friendships ============
export const listFriendships = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("friendships")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const otherIds = rows.map((f) => (f.requester_id === context.userId ? f.addressee_id : f.requester_id));
    const profiles = await profilesByIds(context, otherIds);
    const decorate = (f: (typeof rows)[number]) => {
      const otherId = f.requester_id === context.userId ? f.addressee_id : f.requester_id;
      return {
        id: f.id,
        status: f.status,
        created_at: f.created_at,
        direction: (f.requester_id === context.userId ? "outgoing" : "incoming") as "outgoing" | "incoming",
        profile: profiles[otherId] ?? null,
      };
    };
    const all = rows.map(decorate);
    return {
      friends: all.filter((f) => f.status === "accepted"),
      incoming: all.filter((f) => f.status === "pending" && f.direction === "incoming"),
      outgoing: all.filter((f) => f.status === "pending" && f.direction === "outgoing"),
    };
  });

async function profilesByIds(context: Ctx, ids: string[]): Promise<Record<string, PublicProfile>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await context.supabase.rpc("profiles_public_by_ids", { _ids: unique });
  const map: Record<string, PublicProfile> = {};
  for (const p of (data ?? []) as PublicProfile[]) map[p.id] = p;
  return map;
}

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("You are already your own best plant friend");
    const { data: blocked } = await context.supabase.rpc("is_blocked", { _a: context.userId, _b: data.user_id });
    if (blocked) throw new Error("You cannot connect with this person");

    const { data: existing } = await context.supabase
      .from("friendships")
      .select("id, status, requester_id")
      .or(
        `and(requester_id.eq.${context.userId},addressee_id.eq.${data.user_id}),and(requester_id.eq.${data.user_id},addressee_id.eq.${context.userId})`,
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") return { ok: true, status: "accepted" };
      if (existing.status === "pending") return { ok: true, status: "pending" };
      // previously declined — reopen as a fresh request from me
      const { error } = await context.supabase
        .from("friendships")
        .update({ status: "pending" })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, status: "pending" };
    }

    const { error } = await context.supabase
      .from("friendships")
      .insert({ requester_id: context.userId, addressee_id: data.user_id, status: "pending" });
    if (error) throw new Error(error.message);
    return { ok: true, status: "pending" };
  });

export const respondToFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error: fErr } = await context.supabase
      .from("friendships")
      .select("id, addressee_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row || row.addressee_id !== context.userId) throw new Error("Request not found");

    const { error } = await context.supabase
      .from("friendships")
      .update({ status: data.accept ? "accepted" : "declined" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${context.userId},addressee_id.eq.${data.user_id}),and(requester_id.eq.${data.user_id},addressee_id.eq.${context.userId})`,
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid(), block: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.block) {
      await context.supabase
        .from("friendships")
        .delete()
        .or(
          `and(requester_id.eq.${context.userId},addressee_id.eq.${data.user_id}),and(requester_id.eq.${data.user_id},addressee_id.eq.${context.userId})`,
        );
      const { error } = await context.supabase
        .from("blocks")
        .insert({ blocker_id: context.userId, blocked_id: data.user_id });
      if (error && error.code !== "23505") throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", context.userId)
        .eq("blocked_id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============ Feed ============
export const getFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        cursor: z.string().nullable().optional(),
        limit: z.number().int().positive().max(50).optional(),
        author_id: z.string().uuid().nullable().optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const limit = data.limit ?? 20;
    let query = context.supabase
      .from("posts")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);
    if (data.author_id) query = query.eq("author_id", data.author_id);
    if (data.cursor) query = query.lt("created_at", data.cursor);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const posts = (rows ?? []).slice(0, limit);
    const nextCursor = (rows ?? []).length > limit ? posts[posts.length - 1]?.created_at ?? null : null;
    if (posts.length === 0) return { posts: [], nextCursor: null, photoUrls: {} as Record<string, string> };

    const ids = posts.map((p) => p.id);
    const [profiles, reactions, comments] = await Promise.all([
      profilesByIds(context, posts.map((p) => p.author_id)),
      context.supabase.from("post_reactions").select("post_id, user_id, emoji").in("post_id", ids),
      context.supabase.from("post_comments").select("post_id").in("post_id", ids).is("deleted_at", null),
    ]);

    const reactionMap: Record<string, { emoji: string; count: number; mine: boolean }[]> = {};
    for (const r of reactions.data ?? []) {
      const list = (reactionMap[r.post_id] ??= []);
      const found = list.find((x) => x.emoji === r.emoji);
      if (found) {
        found.count += 1;
        found.mine = found.mine || r.user_id === context.userId;
      } else {
        list.push({ emoji: r.emoji, count: 1, mine: r.user_id === context.userId });
      }
    }
    const commentCounts: Record<string, number> = {};
    for (const c of comments.data ?? []) commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1;

    // Sign photos with the admin client: friends can see a post's photo even
    // though storage objects stay owner-scoped.
    const paths = posts
      .map((p) => (p.payload as { storage_path?: string } | null)?.storage_path)
      .filter((p): p is string => Boolean(p));
    const photoUrls: Record<string, string> = {};
    if (paths.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed } = await supabaseAdmin.storage.from("plant-images").createSignedUrls(paths, 3600);
      for (const s of signed ?? []) if (s.path && s.signedUrl) photoUrls[s.path] = s.signedUrl;
    }

    return {
      posts: posts.map((p) => ({
        ...p,
        author: profiles[p.author_id] ?? null,
        reactions: reactionMap[p.id] ?? [],
        comment_count: commentCounts[p.id] ?? 0,
        is_mine: p.author_id === context.userId,
      })),
      nextCursor,
      photoUrls,
    };
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        kind: z.enum(["help", "milestone"]),
        plant_id: z.string().uuid().nullable().optional(),
        photo_id: z.string().uuid().nullable().optional(),
        body: z.string().min(1).max(1000),
        milestone: z.string().max(60).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const payload: Record<string, string> = {};
    let photoId: string | null = null;

    if (data.plant_id) {
      const { data: plant } = await context.supabase
        .from("user_plants")
        .select("id, nickname")
        .eq("id", data.plant_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!plant) throw new Error("Plant not found");
      payload.nickname = plant.nickname;
    }
    if (data.photo_id) {
      const { data: photo } = await context.supabase
        .from("plant_photos")
        .select("id, storage_path")
        .eq("id", data.photo_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!photo) throw new Error("Photo not found");
      photoId = photo.id;
      payload.storage_path = photo.storage_path;
    }
    if (data.milestone) payload.milestone = data.milestone;

    const { data: row, error } = await context.supabase
      .from("posts")
      .insert({
        author_id: context.userId,
        plant_id: data.plant_id ?? null,
        photo_id: photoId,
        kind: data.kind,
        body: data.body.trim(),
        payload,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("posts")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ post_id: z.string().uuid(), emoji: z.string().min(1).max(8) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("post_reactions")
      .select("id")
      .eq("post_id", data.post_id)
      .eq("user_id", context.userId)
      .eq("emoji", data.emoji)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase.from("post_reactions").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { reacted: false };
    }
    const { error } = await context.supabase
      .from("post_reactions")
      .insert({ post_id: data.post_id, user_id: context.userId, emoji: data.emoji });
    if (error) throw new Error(error.message);
    return { reacted: true };
  });

export const listComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ post_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("post_comments")
      .select("*")
      .eq("post_id", data.post_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const profiles = await profilesByIds(context, (rows ?? []).map((c) => c.author_id));
    return (rows ?? []).map((c) => ({
      ...c,
      author: profiles[c.author_id] ?? null,
      is_mine: c.author_id === context.userId,
    }));
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ post_id: z.string().uuid(), body: z.string().min(1).max(1000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("post_comments")
      .insert({ post_id: data.post_id, author_id: context.userId, body: data.body.trim() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("post_comments")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
