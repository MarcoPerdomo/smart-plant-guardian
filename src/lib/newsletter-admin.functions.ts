import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("announcements")
      .select("id, title, summary, body, link_url, cta_label, status, published_at, recipient_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getSubscriberStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const counts: Record<string, number> = { confirmed: 0, pending: 0, unsubscribed: 0 };
    for (const status of Object.keys(counts)) {
      const { count } = await supabaseAdmin
        .from("newsletter_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", status);
      counts[status] = count ?? 0;
    }
    return counts as { confirmed: number; pending: number; unsubscribed: number };
  });

const announcementInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(140),
  summary: z.string().trim().max(300).nullable().optional(),
  body: z.string().trim().max(20000),
  link_url: z.string().trim().url().max(500).nullable().optional(),
  cta_label: z.string().trim().max(60).nullable().optional(),
});

export const saveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => announcementInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      title: data.title,
      summary: data.summary ?? null,
      body: data.body,
      link_url: data.link_url ?? null,
      cta_label: data.cta_label ?? null,
    };

    if (data.id) {
      const { error } = await context.supabase.from("announcements").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    const { data: row, error } = await context.supabase
      .from("announcements")
      .insert({ ...payload, status: "draft", created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("announcements")
      .delete()
      .eq("id", data.id)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Publishes an announcement and fans it out as an in-app notification to confirmed subscribers. */
export const publishAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ann, error: aErr } = await supabaseAdmin
      .from("announcements")
      .select("id, title, summary, status")
      .eq("id", data.id)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!ann) throw new Error("Announcement not found");
    if (ann.status === "published") throw new Error("Already published");

    const { data: subs, error: sErr } = await supabaseAdmin
      .from("newsletter_subscriptions")
      .select("user_id")
      .eq("status", "confirmed")
      .limit(5000);
    if (sErr) throw new Error(sErr.message);

    const rows = (subs ?? []).map((s) => ({
      user_id: s.user_id as string,
      kind: "announcement",
      title: ann.title as string,
      body: (ann.summary as string | null) ?? null,
      link: "/whats-new",
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from("notifications").insert(rows.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }

    const { error: uErr } = await supabaseAdmin
      .from("announcements")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        recipient_count: rows.length,
      })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    return { recipients: rows.length };
  });

/** Confirmed subscriber emails, for export into a dedicated marketing email service. */
export const listConfirmedSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("newsletter_subscriptions")
      .select("email, confirmed_at")
      .eq("status", "confirmed")
      .order("confirmed_at", { ascending: true })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []) as { email: string; confirmed_at: string | null }[];
  });
