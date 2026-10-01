# Account deletion: countdown, admin processing, deletions list, security cleanup

## 1. 10-second countdown after "Confirm deletion"
- The red confirmation box becomes a status bar: "Your account is scheduled for deletion on <date>. Signing you out in 10s", with a shrinking progress bar and a **Cancel** button.
- **Cancel** withdraws the request on the spot: "Deletion cancelled, your account is safe". The person stays signed in.
- After 10 seconds: they are signed out and taken to the homepage without a page reload. The popup "Your account is scheduled for deletion on <date>. Sign in before then to keep it." then stays up for 8 seconds, so it can be read.
- The "Keep my account" popup also stays for 6 seconds.

## 2. Admin "Process due deletions" button (option 1A)
- New button in the admin Archive tab: "Process due deletions (N due)".
- For every request whose 30 days have passed, it:
  1. Deletes that person's uploaded photo files (plant photos and avatar).
  2. Deletes the account and all its data.
  3. Marks the request completed.
- Shows a summary afterwards, for example "2 accounts deleted, 37 files removed", plus any accounts that could not be removed and why.
- The automatic daily cleanup stays as a safety net. If it runs first, it now leaves the account alone when photo files still exist, so files are never left behind. The admin button handles those cases.

## 3. Account deletions list in the Archive tab
- A new "Account deletions" section: requested date, scheduled date, and status (pending, due, cancelled, completed), with a short user reference only, no personal details.
- Filter: pending and due (the default), or all.

## 4. Security warnings cleanup
- Review the 12 special database helpers flagged as usable by signed-in users:
  - Helpers that only run inside the database (notification triggers, feed posting, search text, watering sync, the new-user setup): remove direct access for signed-in users and visitors. Their behaviour does not change.
  - Helpers the app really calls (friends, blocks, roles, premium, profiles, search): keep access. The remaining warnings are expected, and I'll mark them as reviewed with the reason.
- After the change, check that sign-up, posting, comments, reactions and the friends and profile pages still work.
- Leaked-password protection: needs a paid Supabase plan, so this stays a dashboard switch for you. It is not a code change.

## Technical details
- `settings.tsx`: `countdown` state with a cleaned-up interval; Cancel calls `cancelAccountDeletion`; when the countdown ends, run `supabase.auth.signOut()`, then `navigate({ to: "/" })`, with the toast set to `duration: 8000`. `deletion-banner.tsx`: toast `duration: 6000`.
- `src/lib/admin.functions.ts`: `listDeletionRequests` and `processDueDeletions`. Both check the admin role through `has_role` on the user's session first, then load `supabaseAdmin` inside the handler. Processing lists the user's files in the `plant-images` bucket (from `plant_photos.storage_path` plus a folder listing for each user) and the avatar files, removes them, calls `auth.admin.deleteUser`, marks `completed_at`, and writes an audit row.
- Migration: `process_due_account_deletions()` skips users who still have `plant_photos` rows. `REVOKE EXECUTE ... FROM anon, authenticated` on the trigger-only helpers. Each one is checked with the linter, and the findings that are intentional get marked as reviewed.
- Add these tasks to `roadmap.md` while building.
- Verify: typecheck/build; call the admin functions in the preview where a session is available, otherwise report them as untested; read the linter output after the migration.
