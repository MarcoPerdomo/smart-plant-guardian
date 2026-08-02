# Migrating Verdant to your own Supabase project

This guide moves the Verdant backend from the Lovable-managed project to your
external Supabase project **"Verdant"**.

Scope (as agreed): schema + `plant_species` catalog + auth + empty storage
bucket + secrets. **Not** migrated: user accounts, plants, sensor history,
watering events, AI summaries, notifications, existing snapshot files.

---

## 1. Create the storage bucket

In the Verdant project dashboard: **Storage → New bucket**

- Name: `plant-snapshots`
- Public: **off** (private)

Do this *before* step 2 — the SQL adds policies that reference the bucket.

## 2. Run the schema + catalog migration

Open **SQL Editor** in the Verdant project, paste the entire contents of
[`verdant-external-migration.sql`](./verdant-external-migration.sql), run it.

It creates:

| Object | Notes |
| --- | --- |
| `profiles` | 1:1 with `auth.users`, notification preferences |
| `plant_species` | catalog, seeded with 30 houseplants |
| `user_plants` | your plants, `device_id` links a Pi/Arduino |
| `sensor_readings` | time-series incl. `snapshot_url` |
| `watering_events` | manual + predicted watering log |
| `ai_summaries` | generated health summaries |
| `notifications` | in-app notification feed |
| `set_updated_at()` | timestamp trigger fn |
| `handle_new_user()` | auto-creates a profile on signup (trigger on `auth.users`) |
| RLS + GRANTs | every table locked to the owning user |
| storage policies | users read/write only `"<their user id>/..."` paths |

## 3. Auth providers

**Authentication → Providers**

- **Email** — enable. Turn "Confirm email" on or off to taste; the sign-up
  screen already handles both cases.
- **Google** — enable, then:
  1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth
     client ID* → Web application.
  2. Authorized redirect URI: the callback URL Supabase shows in the Google
     provider panel (`https://<your-ref>.supabase.co/auth/v1/callback`).
  3. Consent screen scopes: `openid`, `userinfo.email`, `userinfo.profile`.
  4. Paste the client ID + secret into the Supabase Google provider panel.

**Authentication → URL Configuration**

- Site URL: your published Verdant URL.
- Additional redirect URLs: the Lovable preview URL and
  `<each origin>/auth` (the app returns to `/auth` after Google sign-in and
  then forwards to the dashboard).

The app's Google button now calls `supabase.auth.signInWithOAuth` directly
(`src/routes/auth.tsx`) instead of the Lovable OAuth broker, because the
broker only serves Lovable-managed projects.

## 4. Secrets / environment variables

The app reads these at runtime:

| Variable | Where from |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Verdant → Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | same page (publishable/anon key) |
| `VITE_SUPABASE_PROJECT_ID` | the project ref in the URL |
| `SUPABASE_SERVICE_ROLE_KEY` | same page — **server only, never commit** |
| `ARDUINO_INGEST_SECRET` | keep the existing value so the Pi's `config.yaml` keeps working |
| `LOVABLE_API_KEY` | unchanged — AI summaries still use the Lovable AI Gateway |
| `APP_URL` | your published URL |

The four `VITE_`/`SUPABASE_` connection values are managed by the Lovable
integration once the external project is the active backend — they are not
edited by hand in `.env`.

## 5. Verify

1. Sign up with a fresh email → a row appears in `profiles`.
2. Sign in with Google → lands on `/dashboard`.
3. Add a plant with a `device_id`, then:
   ```bash
   curl -X POST "$APP_URL/api/public/ingest" \
     -H "X-Ingest-Secret: $ARDUINO_INGEST_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"device_id":"pi-tank-01","soil_moisture":42,"temperature_c":21.5,"humidity":55,"light_lux":800,"motion_events":3}'
   ```
   The reading should show on the plant page.
4. Upload a snapshot:
   ```bash
   curl -X POST "$APP_URL/api/public/snapshot-upload" \
     -H "X-Ingest-Secret: $ARDUINO_INGEST_SECRET" \
     -F device_id=pi-tank-01 -F snapshot=@test.jpg
   ```
   Then confirm the image renders on the plant detail page.
5. The species picker on **Add plant** lists 30 entries.

## 6. Rollback

Nothing is deleted from the old Lovable-managed project. If anything is off,
point the connection variables back at it and everything works as before.
