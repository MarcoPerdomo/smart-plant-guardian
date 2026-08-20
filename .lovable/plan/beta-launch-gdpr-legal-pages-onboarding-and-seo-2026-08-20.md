# Beta launch: GDPR, legal pages, onboarding and SEO

Goal: make Verdant safe and self-explanatory for a small beta group of friends, with GDPR-compliant legal pages, a clear "Beta" marker, a feedback loop, and public pages search engines can index.

Controller details used across legal pages: Marco, Netherlands (individual data controller — the pages will say so plainly; swap in a company entity later if you incorporate).

## 1. Legal and GDPR

App-owned pages now, provider-ready later:

- `/privacy` — what is collected (account email, username, optional city/region/coordinates, plants, photos, sensor readings, messages, marketplace/wallet data), why, legal basis, retention, who processes it (Supabase hosting, Google/Gemini AI summaries, Open-Meteo weather, Lovable email), your rights, contact email.
- `/terms` — beta service, no warranty, acceptable use, marketplace rules (peer-to-peer, 7% commission, simulated payments during beta), account termination, Dutch law / Netherlands jurisdiction.
- `/cookies` — what's stored: the Supabase auth session and consent preference only; no ad or third-party tracking during beta.
- `/subprocessors` — table of the processors above with purpose and region.
- Footer links on the landing page and in the authenticated Account menu; a required "I agree to the Terms and Privacy Policy" checkbox on sign-up.

Note: these are honest, plain-language pages written from your actual stack — not lawyer-reviewed. Because you chose "both", each page is structured so a Iubenda/Termly-generated document can be dropped in (or embedded) later without changing routes or links.

Cookie/consent banner: a small bottom banner storing the choice locally, with "Necessary only" and "Accept" and a link to `/cookies`. It gates nothing today (no analytics installed) but is wired so any future analytics script only loads after consent.

GDPR user rights, in Settings → Privacy:
- **Export my data** — server function that gathers profile, plants, photos metadata, readings, posts, messages and marketplace records for the signed-in user and downloads a JSON file.
- **Delete my account** — type-to-confirm, soft-archives content and deletes the auth user via the admin client, then signs out.

## 2. Beta marker and feedback

- `Beta` chip next to the Verdant wordmark (landing header and app header) and in page titles/meta.
- Dismissible top banner in the app: "Verdant is in beta — things may change. Tell us what breaks." with a Feedback button; dismissal remembered per user.
- Feedback form (dialog): category (bug / idea / plant data / other), message, optional screenshot upload, auto-attached page path and browser info. Stored in a new `feedback` table, visible in `/admin` → Feedback with status (new / triaged / done).

## 3. Onboarding for new users

- First-run checklist card on the dashboard: pick a username → add your first plant → set your location for weather → connect a device (optional) → turn on notifications. Each item links to the right place and ticks off automatically from real data; dismissible once complete.
- `/get-started` page: how Verdant works, what the sensors do, and a copy-paste Raspberry Pi setup section (existing `pi-agent` instructions) with where to find the ingest secret.
- Empty states on Dashboard, Feed, Friends and Marketplace that explain the next action instead of showing a blank list.

## 4. SEO for the beta

- Public, indexable pages: `/` (landing, sharpened copy), `/get-started`, `/privacy`, `/terms`, `/cookies`, `/subprocessors`.
- A public plant care hub: `/plants` index and `/plants/$slug` pages generated from the existing `plant_species` catalogue (~132 species) — common name, scientific name, light, water frequency, humidity, soil, toxicity, pests. This is the main organic-search surface, with a "Track this plant in Verdant" CTA.
- Per-route unique title, description, og/twitter tags; `Product`/`FAQPage`/`Article` JSON-LD where it fits; canonical tags.
- `public/robots.txt` and a `/sitemap.xml` server route listing static pages plus every species slug.
- Authenticated routes stay `noindex`.

## Technical notes

- New table `feedback` (id, user_id, category, message, page_path, user_agent, screenshot_path, status, timestamps) with GRANTs, RLS: users insert/read their own, admins read/update all. Screenshots go to a new owner-scoped `feedback-screenshots` bucket.
- New table `legal_acceptances` (user_id, document, version, accepted_at) so sign-up consent and future policy updates are auditable.
- Public species pages read through a server publishable client plus a narrow `TO anon` SELECT policy on non-archived `plant_species` rows — no admin client, no auth.
- Data export/delete live in `src/lib/privacy.functions.ts` using `requireSupabaseAuth`, with deletion using the admin client after verifying the caller.
- Consent + beta banner state in `localStorage`; no third-party scripts added.

## Build order

1. Legal pages, footer links, sign-up consent checkbox, `legal_acceptances`.
2. Cookie/consent banner.
3. Beta chip, beta banner, `feedback` table + form + admin view.
4. Settings → Privacy: data export and account deletion.
5. Onboarding checklist, `/get-started`, empty states.
6. Public species pages, robots.txt, sitemap, per-route metadata.
