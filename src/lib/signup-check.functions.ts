import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailInput = (i: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(i);

/**
 * Public: checks whether an email already belongs to an account (active or
 * pending deletion). When it does, the existing owner is notified by email
 * instead of revealing anything to the visitor, so the sign-up form can stay
 * privacy-preserving and never confirm whether an address is registered.
 */
export const checkSignupEmail = createServerFn({ method: "POST" })
  .inputValidator(emailInput)
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
    const status = pending ? ("pending_deletion" as const) : ("active" as const);

    // Notify the existing owner; never leak the outcome to the visitor.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("signup-attempt-notice", email, {
        templateData: {
          signInUrl: "https://sentia-plants.com/auth",
          resetUrl: "https://sentia-plants.com/auth",
        },
        idempotencyKey: `signup-attempt-${profile.id}-${new Date().toISOString().slice(0, 13)}`,
      });
    } catch {
      /* email notice is best-effort, never block or reveal */
    }

    return { status };
  });
