import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NewsletterSubscription = {
  status: "pending" | "confirmed" | "unsubscribed";
  email: string;
  confirmed_at: string | null;
  created_at: string;
};

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("newsletter_subscriptions")
      .select("status, email, confirmed_at, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as NewsletterSubscription | null) ?? null;
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ email: z.string().trim().email().max(255).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", context.userId)
      .maybeSingle();

    const email = (data.email ?? profile?.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("No email address on your account — add one first.");

    const token = crypto.randomUUID();
    const { error } = await context.supabase
      .from("newsletter_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          email,
          status: "pending",
          confirm_token: token,
          confirmed_at: null,
          unsubscribed_at: null,
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    const appUrl = (process.env["APP_URL"] ?? "https://verdant-nl.app").replace(/\/$/, "");
    const confirmUrl = `${appUrl}/newsletter/confirm?token=${token}`;

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("newsletter-confirm", email, {
        templateData: { displayName: profile?.display_name ?? undefined, confirmUrl },
        idempotencyKey: `newsletter-confirm-${token}`,
      });
    } catch {
      return { ok: true, emailed: false as const };
    }

    return { ok: true, emailed: true as const };
  });

export const unsubscribeNewsletter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("newsletter_subscriptions")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: called from the confirmation link, verified by the one-time token. */
export const confirmNewsletter = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ token: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("newsletter_subscriptions")
      .select("id, status")
      .eq("confirm_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const, reason: "invalid" as const };
    if (row.status === "confirmed") return { ok: true as const, reason: "already" as const };

    const { error: uErr } = await supabaseAdmin
      .from("newsletter_subscriptions")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString(), unsubscribed_at: null })
      .eq("id", row.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true as const, reason: "confirmed" as const };
  });

export const listPublishedAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id, title, summary, body, link_url, cta_label, published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
