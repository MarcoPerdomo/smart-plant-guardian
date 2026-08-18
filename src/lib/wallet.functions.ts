import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: wallet } = await context.supabase
      .from("wallets")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: txns } = await context.supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    const { data: payouts } = await context.supabase
      .from("payout_requests")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      available_cents: wallet?.available_cents ?? 0,
      pending_cents: wallet?.pending_cents ?? 0,
      transactions: txns ?? [],
      payouts: payouts ?? [],
    };
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        amount_cents: z.number().int().positive(),
        iban_last4: z.string().regex(/^\d{4}$/),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: wallet } = await context.supabase
      .from("wallets")
      .select("available_cents")
      .eq("user_id", context.userId)
      .maybeSingle();
    const available = wallet?.available_cents ?? 0;
    if (data.amount_cents > available) throw new Error("Amount exceeds your available balance");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("payout_requests")
      .insert({ user_id: context.userId, amount_cents: data.amount_cents, iban_last4: data.iban_last4 })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("wallets")
      .update({ available_cents: available - data.amount_cents })
      .eq("user_id", context.userId);
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: context.userId,
      kind: "payout",
      amount_cents: -data.amount_cents,
      description: `Payout requested to IBAN ••••${data.iban_last4}`,
    });
    return row;
  });

export const adminListPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: rows, error } = await context.supabase
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    const { data: profiles } = await context.supabase.rpc("profiles_public_by_ids", { _ids: ids });
    const map: Record<string, { username: string | null; display_name: string | null }> = {};
    for (const p of (profiles ?? []) as { id: string; username: string | null; display_name: string | null }[]) {
      map[p.id] = { username: p.username, display_name: p.display_name };
    }
    return (rows ?? []).map((r) => ({ ...r, user: map[r.user_id] ?? null }));
  });

export const adminProcessPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "paid", "rejected"]),
        admin_note: z.string().max(300).nullable().default(null),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payout } = await supabaseAdmin.from("payout_requests").select("*").eq("id", data.id).maybeSingle();
    if (!payout) throw new Error("Payout not found");
    if (payout.status === "paid") throw new Error("Already paid");

    await supabaseAdmin
      .from("payout_requests")
      .update({
        status: data.status,
        admin_note: data.admin_note,
        admin_id: context.userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (data.status === "rejected") {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("available_cents")
        .eq("user_id", payout.user_id)
        .maybeSingle();
      await supabaseAdmin
        .from("wallets")
        .update({ available_cents: (wallet?.available_cents ?? 0) + payout.amount_cents })
        .eq("user_id", payout.user_id);
      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: payout.user_id,
        kind: "adjustment",
        amount_cents: payout.amount_cents,
        description: "Payout rejected — funds returned to wallet",
      });
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: payout.user_id,
      kind: "payout_update",
      title: "Payout update",
      body: `Your payout request was ${data.status}`,
      link: "/wallet",
    });
    return { ok: true };
  });
