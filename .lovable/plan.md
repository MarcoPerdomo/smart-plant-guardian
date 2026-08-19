# Platform newsletter & announcements

Let signed-in users opt in to product news (new features, upgrades, platform notices), with a double opt-in confirmation and an admin composer in `/admin` to write and send announcements.

## One important constraint

Lovable's built-in email sending is for app/transactional email only — it explicitly does not support newsletters or bulk campaigns. So the newsletter is built in two layers:

1. **In-app announcements (works immediately, no external service).** An admin-published announcement lands in every subscriber's notification bell and a new "What's new" page. This is fully supported today.
2. **Email delivery (needs a marketing provider).** The double opt-in confirmation email is a normal transactional email and can be sent by the platform. The actual newsletter blast requires a dedicated marketing email service (for example Resend Broadcasts or Mailchimp). The composer will store the announcement and give you a one-click "Copy HTML / export confirmed subscribers (CSV)" until you pick a provider; once you add a provider API key I can wire "Send email" directly to it.

## What you get

**For users (Settings → Notifications)**
- A "Product newsletter" opt-in toggle: news about new features, upgrades and platform changes.
- Turning it on sends a confirmation email; the subscription stays `pending` until the link is clicked, then shows "Confirmed".
- Unsubscribe any time from the same toggle.

**For admins (`/admin` → Newsletter)**
- Composer: title, short summary, body (markdown), optional link + CTA label.
- Live preview and a subscriber count (confirmed / pending).
- Save as draft, then **Publish**:
  - creates an in-app notification for every confirmed subscriber (shows in the bell, links to the announcement),
  - marks the announcement published with a timestamp.
- Export confirmed subscriber emails as CSV and copy the rendered email HTML for your marketing provider.
- List of past announcements with recipient counts.

**For everyone**
- `/whats-new` page listing published announcements, newest first (signed-in area, linked from the bell).

## Technical notes

Database (migration, with GRANTs + RLS):
- `newsletter_subscriptions` — `user_id` (unique), `email`, `status` (`pending`/`confirmed`/`unsubscribed`), `confirm_token uuid`, `confirmed_at`, `unsubscribed_at`, timestamps. Users read/write only their own row; service role full.
- `announcements` — `title`, `summary`, `body`, `link_url`, `cta_label`, `status` (`draft`/`published`), `published_at`, `created_by`, `recipient_count`. Read: any authenticated user when `status = 'published'`; write: admins via `has_role(auth.uid(),'admin')`.
- Notification fan-out on publish reuses the existing `notifications` table with `kind = 'announcement'` and `link = '/whats-new'`, so the bell and badge counts work with no changes.

Server functions:
- `src/lib/newsletter.functions.ts` (`requireSupabaseAuth`): `getMySubscription`, `subscribe` (creates/updates row, sends confirmation email), `unsubscribe`.
- Confirmation link handled by a public route `src/routes/newsletter.confirm.tsx` reading `?token=`, calling a public server fn that flips the matching `pending` row to `confirmed`.
- `src/lib/newsletter-admin.functions.ts`: `listAnnouncements`, `saveAnnouncement`, `publishAnnouncement` (verifies admin role via `context.supabase.rpc('has_role')` before using the admin client for fan-out), `listSubscribersCsv`.

Email:
- New React Email template `src/lib/email-templates/newsletter-confirm.tsx` registered in `registry.ts`, branded to match the weather digest, sent through the existing `sendTemplateEmail` helper with an idempotency key.

UI:
- `src/routes/_authenticated/settings.tsx` — newsletter toggle + status line.
- `src/routes/_authenticated/admin/newsletter.tsx` — composer, preview, subscriber stats, export, history.
- `src/routes/_authenticated/whats-new.tsx` — published announcement list; nav entry under the Account group.

## Build order

1. Migration: `newsletter_subscriptions`, `announcements`, grants, RLS.
2. Confirmation email template + newsletter server functions + public confirm route.
3. Settings opt-in UI.
4. Admin composer, publish fan-out, CSV export, `/whats-new` page and nav entry.
