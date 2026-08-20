import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const categorySchema = z.enum(["bug", "feature", "plant_data", "other"]);

export const createFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        category: categorySchema,
        message: z.string().min(2).max(5000),
        pagePath: z.string().max(500).optional(),
        userAgent: z.string().max(1000).optional(),
        screenshotPath: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { error } = await supabase.from("feedback").insert({
      user_id: userId,
      category: data.category,
      message: data.message,
      page_path: data.pagePath,
      user_agent: data.userAgent,
      screenshot_path: data.screenshotPath,
      status: "new",
    });

    if (error) throw error;
    return { ok: true };
  });

export const listMyFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  });

export const adminListFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { data, error } = await supabase
      .from("feedback")
      .select("*, profiles!inner(display_name, username)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return data ?? [];
  });

export const adminUpdateFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "triaged", "in_progress", "resolved", "closed"]),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) throw new Response("Forbidden", { status: 403 });

    const { error } = await supabase.from("feedback").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
