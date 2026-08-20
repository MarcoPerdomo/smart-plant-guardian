import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const tables = [
      "profiles",
      "user_plants",
      "sensor_readings",
      "watering_events",
      "plant_photos",
      "ai_summaries",
      "friendships",
      "posts",
      "post_comments",
      "post_reactions",
      "messages",
      "conversations",
      "conversation_participants",
      "notifications",
      "marketplace_listings",
      "marketplace_orders",
      "wallets",
      "wallet_transactions",
      "payout_requests",
      "newsletter_subscriptions",
      "legal_acceptances",
      "feedback",
    ] as const;

    const exportData: Record<string, unknown[]> = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
      if (error) {
        exportData[table] = [];
        continue;
      }
      exportData[table] = data ?? [];
    }

    // Add auth-related rows that use different owner columns
    const { data: listingsAsBuyer } = await supabase.from("marketplace_orders").select("*").eq("buyer_id", userId);
    const { data: listingsAsSeller } = await supabase.from("marketplace_orders").select("*").eq("seller_id", userId);
    exportData["marketplace_orders_buyer"] = listingsAsBuyer ?? [];
    exportData["marketplace_orders_seller"] = listingsAsSeller ?? [];

    const { data: friendshipsRequester } = await supabase.from("friendships").select("*").eq("requester_id", userId);
    const { data: friendshipsAddressee } = await supabase.from("friendships").select("*").eq("addressee_id", userId);
    exportData["friendships_requester"] = friendshipsRequester ?? [];
    exportData["friendships_addressee"] = friendshipsAddressee ?? [];

    return { userId, exportedAt: new Date().toISOString(), data: exportData };
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
