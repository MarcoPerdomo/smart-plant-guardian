# Newsletter buttons everywhere, state-aware

Add newsletter call-to-action buttons across the app that show the right thing depending on whether the visitor is signed out, unsubscribed, pending confirmation, or subscribed. Settings stays the manage hub.

## Current state (verified)

- The only real signup form is **Settings → Product newsletter** (states: not subscribed / pending / confirmed / unsubscribed, with Resend confirmation and Unsubscribe).
- The **Marketplace coming-soon page** links to that Settings section.
- **What's new**, the **homepage**, the **footers**, and **Get started** have no newsletter button at all.
- Signing up requires an account; the sign-up page (`/auth`) supports a `?next=` redirect back into the app.

## What to build

### 1. One shared CTA component

`src/components/newsletter-cta.tsx` — a `NewsletterCta` component with two looks:

- **Full card** (a bordered block with heading, one-line description, and the action button) for the homepage and What's new.
- **Compact link** (a single footer-style link) for the footers.

State logic (reuses `getMySubscription`, `subscribeNewsletter` from the existing newsletter server functions):

| Visitor state | What shows | Click does |
|---|---|---|
| Signed out | "Get product news" | Goes to the sign-up page with a redirect back to Settings → newsletter |
| Not subscribed / unsubscribed | "Sign me up" | Sends the confirmation email (existing flow) |
| Pending | "Resend confirmation" + note to check the inbox | Resends the confirmation email |
| Subscribed | "You're subscribed" + Manage link | Manage opens Settings → newsletter |

While the subscription status is loading, the component renders nothing (no layout jump, no wrong button flash).

### 2. Where each button lands

- **What's new** (`src/routes/_authenticated/whats-new.tsx`): the full card sits under the page heading. Signed-in only, so it shows Sign me up / Resend / Subscribed states.
- **Homepage** (`src/routes/index.tsx`): a full-card newsletter section after the "How it works" steps, before the footer. Signed-out visitors get the sign-up redirect; signed-in users get the direct subscribe button.
- **Public footer**: add a "Newsletter" compact link to `SimpleFooter` (`src/components/simple-layout.tsx`) and to the inline footers on the homepage and Get started, so every public page (About, Founder story, Privacy, Terms, Cookies, Subprocessors, Get started, homepage) offers it. The link sends signed-out visitors to sign-up first, signed-in users straight to Settings → newsletter.
- **Get started** (`src/routes/get-started.tsx`): a short closing card after step 7 ("Stay in the loop, get product news by email") with the same state-aware button.

### 3. No backend changes

All server functions, the database, and the confirmation email flow already exist and stay untouched. No em dashes in any new visible text.

## Files touched

- New: `src/components/newsletter-cta.tsx`
- Edited: `src/routes/_authenticated/whats-new.tsx`, `src/routes/index.tsx`, `src/routes/get-started.tsx`, `src/components/simple-layout.tsx`

## Verification

Typecheck and build pass, then a Playwright pass over the public pages (homepage, get-started, About, Privacy) confirming the Newsletter link renders and leads to the sign-up page when signed out.
