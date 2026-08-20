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

### 3.1 Enable Email provider

In your Verdant Supabase project:

1. Go to **Authentication → Providers**.
2. Find **Email** in the list and turn it **on**.
3. Decide on email confirmation:
   - **Confirm email = ON** (recommended): users receive a confirmation link after signing up. The app's sign-up screen already tells them to check their email.
   - **Confirm email = OFF**: accounts are active immediately after sign-up.
4. Save the settings.

### 3.2 Set up Google OAuth in Google Cloud

You need a Google Cloud project (you can reuse an existing one or create a new one). This gives you the Client ID and Client Secret to paste into Supabase.

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and select your project.
2. Go to **APIs & Services → OAuth consent screen**.
   - Choose **External** (or **Internal** if this is a Google Workspace organization).
   - Fill in the app name (e.g., "Verdant"), your email, and the developer contact email.
   - Under **Authorized domains**, add the domains you will use. For now add:
     - `lovable.app` (covers the Lovable preview URL)
     - Your future custom domain, if you have one
   - Add these non-sensitive scopes:
     - `openid`
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
   - Finish the consent screen setup.
3. Go to **APIs & Services → Credentials**.
   - Click **Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name it "Verdant Web".
   - Under **Authorized redirect URIs**, add the Supabase callback URL. You can find this in Supabase under **Authentication → Providers → Google** — it looks like:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Click **Create**.
4. A popup appears with your **Client ID** and **Client Secret**. Copy both immediately (the secret is only shown once).

### 3.3 Enable Google provider in Supabase

1. In your Verdant Supabase project, go to **Authentication → Providers**.
2. Find **Google** and turn it **on**.
3. Paste the **Client ID** and **Client Secret** from Google Cloud into the fields.
4. Save.

### 3.4 Configure redirect URLs

1. Go to **Authentication → URL Configuration**.
2. **Site URL**: set this to your published Verdant URL (or the Lovable preview URL for now if you have not published yet).
3. **Additional redirect URLs**: add every origin the app will use, one per line. At minimum include:
   - Your Lovable preview URL (e.g., `https://id-preview--...lovable.app`)
   - Your published URL, once you have one
   - `http://localhost:8080` if you also run the app locally
   - The `/auth` path on each origin, e.g.:
     ```
     https://id-preview--...lovable.app/auth
     ```
   This matters because the Google button redirects back to `/auth`, and the app then forwards the user to `/dashboard`.

The app's Google button now calls `supabase.auth.signInWithOAuth` directly
(`src/routes/auth.tsx`) instead of the Lovable OAuth broker, because the broker
only serves Lovable-managed projects.

## 4. Secrets / environment variables

The app reads these at runtime:

| Variable | Where from |
| --- | --- |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Verdant → Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY` | same page (publishable/anon key) |
| `VITE_SUPABASE_PROJECT_ID` | the project ref in the URL |
| `SUPABASE_SERVICE_ROLE_KEY` | same page — **server only, never commit** |
| `ARDUINO_INGEST_SECRET` | the app's own backend secrets (Project Settings → Secrets) — **not** a Supabase Edge Function secret; keep the existing value so the Pi's `config.yaml` keeps working |
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
