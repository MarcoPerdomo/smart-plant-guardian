import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function profilesByIds(supabase: any, ids: string[]): Promise<Record<string, PublicProfile>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase.rpc("profiles_public_by_ids", { _ids: unique });
  const map: Record<string, PublicProfile> = {};
  for (const p of (data ?? []) as PublicProfile[]) map[p.id] = p;
  return map;
}

export type NotificationItem = {
  id: string;
  kind: string;
  actor_id: string | null;
  plant_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor: PublicProfile | null;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, kind, actor_id, plant_id, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as NotificationItem[];
    const actorIds = rows.map((r) => r.actor_id).filter(Boolean) as string[];
    const profiles = await profilesByIds(context.supabase, actorIds);

    return rows.map((r) => ({ ...r, actor: r.actor_id ? profiles[r.actor_id] ?? null : null }));
  });

export const getBadgeCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count: unreadNotifications, error: nErr } = await context.supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (nErr) throw new Error(nErr.message);

    const { count: friendRequests, error: fErr } = await context.supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("addressee_id", context.userId)
      .eq("status", "pending");
    if (fErr) throw new Error(fErr.message);

    const { data: mine, error: cErr } = await context.supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", context.userId);
    if (cErr) throw new Error(cErr.message);
    const ids = (mine ?? []).map((m) => m.conversation_id);
    let unreadMessages = 0;
    if (ids.length > 0) {
      const { data: recent } = await context.supabase
        .from("messages")
        .select("conversation_id, sender_id, created_at")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(500);
      const lastRead = new Map((mine ?? []).map((m) => [m.conversation_id, m.last_read_at]));
      for (const m of recent ?? []) {
        const read = lastRead.get(m.conversation_id);
        if (m.sender_id !== context.userId && (!read || m.created_at > read)) unreadMessages += 1;
      }
    }

    let feed = 0;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("feed_last_seen_at")
      .eq("id", context.userId)
      .maybeSingle();
    const lastSeen = profile?.feed_last_seen_at;
    const { data: accepted } = await context.supabase.rpc("friend_ids", { _user_id: context.userId });
    const friendIds = (accepted ?? []) as string[];
    if (friendIds.length > 0) {
      let q = context.supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .in("author_id", friendIds)
        .is("deleted_at", null);
      if (lastSeen) q = q.gt("created_at", lastSeen);
      const { count: feedCount, error: feedErr } = await q;
      if (feedErr) throw new Error(feedErr.message);
      feed = feedCount ?? 0;
    }

    return {
      notifications: unreadNotifications ?? 0,
      friendRequests: friendRequests ?? 0,
      messages: unreadMessages,
      feed,
    };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markFeedSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ feed_last_seen_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
