## Goal

Move Verdant's backend from the Lovable Cloud project to your own external Supabase project "Verdant": full schema, RLS + grants, DB functions/triggers, the 30-row `plant_species` catalog, email + Google auth, the `plant-snapshots` bucket, and server secrets. No user accounts, no sensor history, no existing snapshot files.

## Important blocker to resolve first

My backend tools still report the Lovable Cloud project (`ofhfkupvqkqwhabcxynj`, "Managed by Lovable: true") as this project's active backend. That means I cannot yet run migrations directly against your external "Verdant" project.

Two ways forward — pick one when you approve:

- **A. You run the SQL.** I produce one complete `verdant-migration.sql` file in the repo. You paste it into the SQL editor of the external Verdant project, and create the bucket there. I then rewire the app to point at it.
- **B. Lovable points at Verdant.** If the Integrations connect switched the project's backend and my tooling just hasn't refreshed, confirm and I'll re-check; if it now resolves to Verdant, I run everything through the migration tool myself.

Either way the code changes below are identical.

## What gets recreated in the Verdant project

1. **Tables** (with `created_at`/`updated_at` and the `set_updated_at` trigger where present):
   `plant_species`, `profiles`, `user_plants`, `sensor_readings`, `watering_events`, `ai_summaries`, `notifications`.
2. **Grants** — explicit `GRANT` per table for `authenticated` and `service_role` (plus `anon` nowhere, since every policy is `auth.uid()`-scoped). Without these PostgREST returns permission errors.
3. **RLS policies** — a faithful copy of today's rules: users manage only their own plants; readings/watering/summaries gated through ownership of the parent plant; profiles and notifications scoped to `auth.uid()`; catalog readable by any signed-in user.
4. **Functions/triggers** — `handle_new_user()` (auto-creates a profile on signup, wired to `auth.users`) and `set_updated_at()`.
5. **Catalog data** — the 30 `plant_species` rows exported from the current database as literal `INSERT` statements inside the same migration.
6. **Storage** — private bucket `plant-snapshots` plus the `storage.objects` policies that let a user read only objects under their own `user_id/` prefix.

## Auth setup (your actions in the Verdant project dashboard)

- Enable **Email** provider; keep email confirmation as you want it.
- Enable **Google** provider: create an OAuth client in Google Cloud, add Verdant's callback URL as an authorized redirect URI, paste client ID + secret into Supabase → Authentication → Providers → Google.
- Add the app's preview and published URLs to **Site URL / Redirect URLs**.

Note: the current Google sign-in goes through the Lovable-managed broker (`lovable.auth.signInWithOAuth`). On an external project that broker no longer applies, so I'll switch the Google button to `supabase.auth.signInWithOAuth('google', ...)` against the new project. Email/password code is unchanged.

## Secrets

The external project needs these set as environment variables for the server runtime:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (from the Verdant project's API settings)
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `ARDUINO_INGEST_SECRET` — I'll keep the existing value so your Pi's `config.yaml` doesn't change
- `LOVABLE_API_KEY` — stays as-is; the AI summaries still run through the Lovable AI Gateway
- `APP_URL`

I'll request the Verdant service-role key and publishable key via the secure secret form — never paste them in chat.

## Code changes

- Point the generated Supabase clients/env at the new project (URL, keys, project id).
- Swap the Google sign-in call in `src/routes/auth.tsx` from the Lovable broker to the standard Supabase OAuth call.
- Regenerate `src/integrations/supabase/types.ts` against the new schema.
- No changes needed in `src/routes/api/public/ingest.ts`, `snapshot-upload.ts`, `src/lib/plants.functions.ts`, or the Pi agent — they read from env and the ingest secret is preserved.

## Verification

- Sign up a fresh account, confirm a `profiles` row is created by the trigger.
- Add a plant with a `device_id`, POST a sample reading to `/api/public/ingest`, confirm it appears on the dashboard.
- POST a test image to `/api/public/snapshot-upload` and confirm the signed URL renders on the plant page.
- Confirm the species picker lists all 30 catalog entries.

## What is intentionally not migrated

Existing user accounts, `user_plants`, `sensor_readings`, `watering_events`, `ai_summaries`, `notifications` rows, and the current snapshot files. The Lovable Cloud project stays intact as a fallback until you tell me to stop using it.
