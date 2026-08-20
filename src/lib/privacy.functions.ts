import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type ExportBundle = {
  table: string;
  rows: Record<string, unknown>[];
};

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

    const bundles: ExportBundle[] = [];

    for (const table of ownerTables) {
      const { data, error } = await supabase.from(table as string).select("*").eq("user_id", userId);
      bundles.push({ table, rows: (data as Record<string, unknown>[]) ?? [] });
      if (error) {
        bundles[bundles.length - 1].rows = [];
      }
    }

    const extra: ExportBundle[] = [];

    const { data: ordersBuyer } = await supabase.from("marketplace_orders").select("*").eq("buyer_id", userId);
    extra.push({ table: "marketplace_orders_buyer", rows: (ordersBuyer as Record<string, unknown>[]) ?? [] });

    const { data: ordersSeller } = await supabase.from("marketplace_orders").select("*").eq("seller_id", userId);
    extra.push({ table: "marketplace_orders_seller", rows: (ordersSeller as Record<string, unknown>[]) ?? [] });

    const { data: friendshipsRequester } = await supabase.from("friendships").select("*").eq("requester_id", userId);
    extra.push({ table: "friendships_requester", rows: (friendshipsRequester as Record<string, unknown>[]) ?? [] });

    const { data: friendshipsAddressee } = await supabase.from("friendships").select("*").eq("addressee_id", userId);
    extra.push({ table: "friendships_addressee", rows: (friendshipsAddressee as Record<string, unknown>[]) ?? [] });

    return { userId, exportedAt: new Date().toISOString(), bundles: [...bundles, ...extra] };
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
