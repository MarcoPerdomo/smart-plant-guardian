# Auth emails through Verdant (no custom SMTP)

## What changes for users

- Supabase auth emails — signup confirmation (the 6-digit code), password reset, magic link, invite, email change — are sent from `notify.verdant-nl.app`, branded as Verdant, instead of Supabase's default unbranded sender.
- The signup confirmation email contains **both** the 6-digit code and the click-through link, completing the email-verification feature. The dashboard step of editing the "Confirm signup" template goes away — no custom SMTP needed.

## Approach

Lovable's managed auth-email tooling is attempted first (it normally handles the Supabase hook wiring automatically). Since this project runs on an **external** Supabase project (yfszbddvgowfniqvzkcg), the tool may report that managed auth emails aren't available — in that case we build the equivalent by hand:

1. **Scaffold auth email templates** with Lovable's tooling. If it succeeds, it creates the auth-email hook plus six branded templates.
2. **Fallback (external project):** create a public server route at `/api/public/auth-email` that Supabase's *Send Email hook* (HTTPS) calls for every auth email. The route:
   - Verifies a shared secret header before doing anything.
   - Validates the payload with Zod (auth email type, user email, token, redirect URL).
   - Renders one of six React Email templates (signup, magiclink, recovery, invite, email_change, reauthentication) in Verdant branding — same visual language as the existing newsletter/weather-digest templates (white email body, green primary, Leaf mark).
   - The signup template shows the 6-digit code prominently plus the confirmation link.
   - Sends synchronously through the existing `sendLovableEmail` helper from `notify.verdant-nl.app`.
3. **Hook configuration:** point Supabase's Send Email hook at the stable production URL with the shared secret. The secret goes into Lovable secrets (server-side only).
4. **Rate limit:** optionally raise Supabase's `over_email_send_rate_limit` in the dashboard so a few signups/resets in a row don't get throttled.

## User-facing notes

- The hook targets the **published** site, so the new emails go live on the next publish; in the preview environment auth emails still fall back to Supabase's default.
- Branding caveat (informational): `notify.verdant-nl.app` stays exclusively Lovable-managed for sending; nothing changes there.

## Technical notes

- Files touched: `src/lib/email-templates/` (up to six new auth templates + registry entries), `src/routes/api/public/auth-email.ts` (fallback route), one new shared secret, `supabase/config.toml` only if Lovable's tooling scaffolds it.
- Reuse the existing send helper (`src/lib/email-templates/send-email.ts` shape — `sendLovableEmail` with `LOVABLE_API_KEY`); no queue, no email tables, no third-party SMTP.
- End-to-end check after implementation: create a throwaway signup against the published site, confirm the branded email arrives with a working 6-digit code, verify it completes sign-in, then delete the test user.
