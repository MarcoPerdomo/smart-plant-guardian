import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public: tells the sign-up form whether an email already belongs to an account. */
export const checkSignupEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (!profile) return { status: "available" as const };
    const { data: pending } = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id")
      .eq("user_id", profile.id)
      .is("cancelled_at", null)
      .is("completed_at", null)
      .maybeSingle();
    return { status: pending ? ("pending_deletion" as const) : ("active" as const) };
  });
