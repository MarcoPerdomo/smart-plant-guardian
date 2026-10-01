# Deletion countdown, readable messages, and the three open points

## Part 1: Build now

**10-second countdown after "Confirm deletion"**
- The red confirmation box turns into a status bar: "Your account is scheduled for deletion on <date>. Signing you out in 10s", with a progress bar that shrinks and a **Cancel** button.
- **Cancel**: the deletion request is withdrawn right away, the bar shows "Deletion cancelled, your account is safe", and the person stays signed in.
- After 10 seconds: they are signed out and taken to the homepage.

**A message people can read**
- The quick popup vanished because the whole page reloaded at the same moment. Now the app moves to the homepage without a reload, and the popup ("Your account is scheduled for deletion on <date>. Sign in before then to keep it.") stays for 8 seconds.
- The "Keep my account" popup also stays for 6 seconds.

## Part 2: The three open points (what each one needs)

**1. Photo files stay in storage after deletion**
- What happens today: after 30 days the photo records are removed, but the image files themselves stay in storage. Nobody can see or open them, but they still take up space and technically still hold personal data, which doesn't fully match the privacy promise.
- Why it isn't automatic yet: the daily cleanup runs inside the database, and the database can't delete storage files. Only the app's server can do that. This project's own Supabase setup can't call the app on a schedule.
- Options:
  - A. **Admin "Process due deletions" button** in the Archive tab. One click removes the files, then deletes the accounts. Cheap and simple, but someone has to click it, for example weekly.
  - B. **Free external scheduler** (for example cron-job.org) calls a protected app link once a day. Fully automatic. Needs a free account and one secret key.
  - Recommendation: A now, B when sign-ups grow.

**2. Pending requests in the admin Archive tab**
- A small "Account deletions" list showing each request's dates and status (pending, cancelled, completed), with no personal details. Small change, no risk. It pairs naturally with option 1A.

**3. Older security warnings**
- 12 warnings say that signed-in users can run some special database helpers. Most of these are meant to be used that way (checking friends, roles, profiles). Fix: review each helper and remove access from the ones only used internally, like the notification triggers. Low risk, about one database change, and it should be tested afterwards.
- 1 warning: leaked-password protection is off. This setting needs a paid Supabase plan. It is a dashboard switch, not code.

Tell me which of these to do next. Part 1 gets built as soon as you approve.

## Technical details
- `settings.tsx`: add a `countdown` state (10 seconds), using `setInterval` with cleanup; Cancel calls `cancelAccountDeletion`; when the countdown ends, run `supabase.auth.signOut()` and then `navigate({ to: "/" })` instead of `window.location`; set the toast `duration: 8000`.
- `deletion-banner.tsx`: success toast `duration: 6000`, and invalidate the status query.
- Part 2 items are not included in this build.
