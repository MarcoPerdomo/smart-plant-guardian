# Fix account deletion and add a real 30-day grace period

## What is wrong today
- The "Request account deletion" button saves a request into the archive table, but only admins are allowed to write there, so every user gets the security error.
- Even if it saved, nothing ever acts on the request. No account has ever been deleted after 30 days, so the promise in Settings and the Privacy page is not kept yet.

## What users will experience
1. Settings, "Request account deletion", type `delete`, confirm.
2. They see "Your account is scheduled for deletion on <date>" and are signed out, landing on the homepage.
3. If they sign back in within 30 days, a banner says "Your account is scheduled for deletion on <date>" with a **Keep my account** button. Clicking it cancels the request; everything is exactly as before.
4. After 30 days, the account and all its plants, photos, journal entries, posts, messages and personal data are permanently removed, and the person can no longer sign in.
5. Admins can see pending deletion requests in the existing Archive tab.

## Answer to your side question
With this plan: yes. Nothing is touched during the 30 days. If you delete your test account and sign back in the same day, you click "Keep my account" and all your data is there. Today, nothing is ever deleted at all, so your data would also still be there, but that is the bug we are fixing.

## Technical details
- **Database (one migration):**
  - New `account_deletion_requests` table: `user_id` (unique, pending), `reason`, `requested_at`, `scheduled_for` (requested_at + 30 days), `cancelled_at`, `completed_at`. Grants to authenticated/service_role, RLS: users read/insert/cancel only their own row; admins read all. Keeps the admin-only `archived_records` rules untouched.
  - Security-definer helper not needed; policies scope to `auth.uid()`.
- **Server functions (`src/lib/privacy.functions.ts`):**
  - `requestAccountDeletion` inserts into the new table (owner from the session, never from input), returns `scheduled_for`.
  - New `getMyDeletionStatus` and `cancelAccountDeletion`.
- **Purge job:** public route `/api/public/process-deletions`, protected by a shared secret header, scheduled once a day via `pg_cron` (same pattern as the existing weather digest). For each due, non-cancelled request: remove the user's storage files (plant photos, avatars), call admin `deleteUser` (tables referencing `auth.users` cascade), mark `completed_at`, keep a minimal audit row in `archived_records` (user id, dates, no personal data). Daily cadence means deletion happens at most ~24h after day 30, well within the promise.
- **Frontend:** Settings shows the scheduled date and signs out after the request; authenticated layout shows the "Keep my account" banner while a request is pending; Archive admin tab lists pending requests.
- **Verification:** sign in as a test user in the preview, request deletion (no error, row created with date +30 days), sign back in and cancel, then run the purge job against a test request with a past date and confirm the account is gone.
