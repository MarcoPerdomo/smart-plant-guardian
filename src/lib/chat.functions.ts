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

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: mine, error } = await context.supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const ids = (mine ?? []).map((m) => m.conversation_id);
    if (ids.length === 0) return [];

    const [{ data: convs }, { data: participants }, { data: recent }] = await Promise.all([
      context.supabase.from("conversations").select("*").in("id", ids).order("last_message_at", { ascending: false }),
      context.supabase.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids),
      context.supabase
        .from("messages")
        .select("conversation_id, body, created_at, sender_id")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const others: Record<string, string> = {};
    for (const p of participants ?? []) {
      if (p.user_id !== context.userId) others[p.conversation_id] = p.user_id;
    }
    const profiles = await profilesByIds(context.supabase, Object.values(others));
    const lastRead = new Map((mine ?? []).map((m) => [m.conversation_id, m.last_read_at]));

    const lastMessage: Record<string, { body: string; created_at: string; sender_id: string }> = {};
    const unread: Record<string, number> = {};
    for (const m of recent ?? []) {
      if (!lastMessage[m.conversation_id]) lastMessage[m.conversation_id] = m;
      const read = lastRead.get(m.conversation_id);
      if (m.sender_id !== context.userId && (!read || m.created_at > read)) {
        unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1;
      }
    }

    return (convs ?? []).map((c) => ({
      id: c.id,
      last_message_at: c.last_message_at,
      other: profiles[others[c.id] ?? ""] ?? null,
      last_message: lastMessage[c.id] ?? null,
      unread: unread[c.id] ?? 0,
    }));
  });

export const openConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ user_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) throw new Error("You cannot message yourself");
    const { data: friends } = await context.supabase.rpc("are_friends", {
      _a: context.userId,
      _b: data.user_id,
    });
    if (!friends) throw new Error("You can only message friends");

    const { data: mine } = await context.supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", context.userId);
    const myIds = (mine ?? []).map((m) => m.conversation_id);
    if (myIds.length > 0) {
      const { data: shared } = await context.supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", data.user_id)
        .in("conversation_id", myIds);
      const existing = (shared ?? [])[0];
      if (existing) return { id: existing.conversation_id };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv, error } = await supabaseAdmin
      .from("conversations")
      .insert({ kind: "direct", created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: pErr } = await supabaseAdmin.from("conversation_participants").insert([
      { conversation_id: conv.id, user_id: context.userId },
      { conversation_id: conv.id, user_id: data.user_id },
    ]);
    if (pErr) throw new Error(pErr.message);
    return { id: conv.id as string };
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: participants, error } = await context.supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", data.id);
    if (error) throw new Error(error.message);
    if (!(participants ?? []).some((p) => p.user_id === context.userId)) throw new Error("Conversation not found");

    const otherId = (participants ?? []).find((p) => p.user_id !== context.userId)?.user_id ?? null;
    const profiles = otherId ? await profilesByIds(context.supabase, [otherId]) : {};

    const { data: messages, error: mErr } = await context.supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (mErr) throw new Error(mErr.message);

    return {
      id: data.id,
      other: otherId ? profiles[otherId] ?? null : null,
      messages: (messages ?? []).map((m) => ({ ...m, is_mine: m.sender_id === context.userId })),
    };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ conversation_id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("messages")
      .insert({ conversation_id: data.conversation_id, sender_id: context.userId, body: data.body.trim() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ conversation_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversation_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: mine } = await context.supabase
      .from("conversation_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", context.userId);
    const ids = (mine ?? []).map((m) => m.conversation_id);
    if (ids.length === 0) return { count: 0 };
    const { data: recent } = await context.supabase
      .from("messages")
      .select("conversation_id, sender_id, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    const lastRead = new Map((mine ?? []).map((m) => [m.conversation_id, m.last_read_at]));
    let count = 0;
    for (const m of recent ?? []) {
      const read = lastRead.get(m.conversation_id);
      if (m.sender_id !== context.userId && (!read || m.created_at > read)) count += 1;
    }
    return { count };
  });
