import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ownerTables = [
  "profiles",
  "user_plants",
  "sensor_readings",
  "watering_events",
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

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ reason: z.string().max(500).optional() }).parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();

    const { error } = await supabase.from("archived_records").insert({
      entity_type: "account_deletion_request",
      entity_id: userId,
      owner_id: userId,
      snapshot: { requested_at: new Date().toISOString(), email: profile?.email ?? null, reason: data.reason ?? null },
      reason: data.reason ?? "User requested account deletion",
      archived_by: userId,
    });

    if (error) throw error;

    return { ok: true };
  });
