import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ownerTables = [
  "profiles",
  "user_plants",
  "sensor_readings",
  "watering_events",
  "plant_events",
  "plant_photos",
  "ai_summaries",
  "posts",
  "post_comments",
  "post_reactions",
  "messages",
  "conversations",
  "conversation_participants",
  "notifications",
  "marketplace_listings",
  "wallets",
  "wallet_transactions",
  "payout_requests",
  "newsletter_subscriptions",
  "legal_acceptances",
  "feedback",
] as const;

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const bundles: Record<string, unknown[]> = {};

    for (const table of ownerTables) {
      const { data, error } = await (supabase.from(table) as never as { select: (cols: string) => { eq: (col: string, val: string) => Promise<{ data: unknown[] | null; error: Error | null }> } }).select("*").eq("user_id", userId);
      bundles[table] = data ?? [];
      if (error) bundles[table] = [];
    }

    const { data: ordersBuyer } = await supabase.from("marketplace_orders").select("*").eq("buyer_id", userId);
    bundles["marketplace_orders_buyer"] = (ordersBuyer as unknown[]) ?? [];

    const { data: ordersSeller } = await supabase.from("marketplace_orders").select("*").eq("seller_id", userId);
    bundles["marketplace_orders_seller"] = (ordersSeller as unknown[]) ?? [];

    const { data: friendshipsRequester } = await supabase.from("friendships").select("*").eq("requester_id", userId);
    bundles["friendships_requester"] = (friendshipsRequester as unknown[]) ?? [];

    const { data: friendshipsAddressee } = await supabase.from("friendships").select("*").eq("addressee_id", userId);
    bundles["friendships_addressee"] = (friendshipsAddressee as unknown[]) ?? [];

    const payload = {
      userId,
      exportedAt: new Date().toISOString(),
      bundles,
    };

    return { json: JSON.stringify(payload, null, 2) };
  });

type DeletionRow = { id: string; scheduled_for: string; requested_at: string };
// New table, typed loosely until generated types refresh.
const deletionTable = (supabase: unknown) =>
  (supabase as { from: (t: string) => any }).from("account_deletion_requests");

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reason: z.string().max(500).optional() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const existing = await deletionTable(supabase)
      .select("id, scheduled_for, requested_at")
      .eq("user_id", userId)
      .is("cancelled_at", null)
      .is("completed_at", null)
      .maybeSingle();
    if (existing.data) return { scheduledFor: (existing.data as DeletionRow).scheduled_for };

    const { data: row, error } = await deletionTable(supabase)
      .insert({ user_id: userId, reason: data.reason || null })
      .select("scheduled_for")
      .single();
    if (error) throw new Error(error.message);
    return { scheduledFor: (row as DeletionRow).scheduled_for };
  });

export const getMyDeletionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await deletionTable(context.supabase)
      .select("id, scheduled_for, requested_at")
      .eq("user_id", context.userId)
      .is("cancelled_at", null)
      .is("completed_at", null)
      .maybeSingle();
    return { scheduledFor: (data as DeletionRow | null)?.scheduled_for ?? null };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await deletionTable(context.supabase)
      .update({ cancelled_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("cancelled_at", null)
      .is("completed_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
