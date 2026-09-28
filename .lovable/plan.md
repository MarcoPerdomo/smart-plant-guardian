# Rebrand Verdant to Sentia and move to sentia-plants.com

Same colours, layout and design. Every piece of visible text, metadata, email, assistant copy and documentation changes from Verdant to Sentia. Database tables, data and accounts stay exactly as they are.

## Order of work

```text
1. Connect sentia-plants.com (+ www) to this project, make it primary
2. Code sweep: Verdant -> Sentia, verdant-nl.app -> sentia-plants.com
3. Email sender: set up notify.sentia-plants.com, switch emails once verified
4. Publish
5. Search Console: verify sentia-plants.com, submit new sitemap
6. Old domain: keep verdant-nl.app connected so old links still work
7. You: Supabase dashboard settings + Pi config update (checklist below)
```

## 1. Domain
- Connect `sentia-plants.com` and `www.sentia-plants.com` to this project and set it as the primary address.
- Keep `verdant-nl.app` connected so existing links, the Pi agent and bookmarks keep working during the switch. It can be removed later.

## 2. Code sweep (about 75 files)
- All pages: homepage, About, Get started, auth, dashboard, plants, social, marketplace, wallet, settings, admin, What's new, OAuth consent screen.
- "Ask Verdant" becomes "Ask Sentia" (menu, chat page, Premium upsell).
- Legal pages (Terms, Privacy, Cookies, Subprocessors): operator name and domain updated. Terms and Privacy get a note that "Verdant" was the previous name, which is good GDPR practice.
- Beta banner, cookie banner, footer, header logo text.
- Page titles, descriptions, social share tags, canonical links, `og:site_name`: all use Sentia and `https://sentia-plants.com`.
- `robots.txt` and `sitemap.xml`: new domain.
- Assistant system prompts and tool messages: introduce itself as Sentia.
- MCP server: name "Sentia MCP Server", tool descriptions updated; manifest regenerates on build.
- Emails: all auth emails (signup code, reset, magic link, invite, email change, reauthentication), newsletter confirmation, weather digest, admin announcements: brand name, logo text, footer, links.
- Download filenames (data export, subscriber CSV) renamed to `sentia-...`.
- Pi agent: README, example config (`api_base_url: https://sentia-plants.com`), service file renamed to `sentia-agent.service`, log/identifier strings.
- Project docs (`AGENTS.md`, supabase migration notes) updated.

Kept deliberately unchanged:
- Browser storage keys for cookie consent and beta-banner dismissal, so existing users are not asked for cookie consent again.
- Database tables, columns, functions, storage bucket names, old migration files.
- Ingest secret and endpoint path (`/api/public/ingest`): only the domain changes.

## 3. Automated emails
- Set up the new sender subdomain `notify.sentia-plants.com` (Lovable adds the DNS records automatically since the domain is registered here).
- Until it finishes verifying, emails keep sending from `notify.verdant-nl.app` with the Sentia name, so nothing breaks. Once verified, switch the sender to `noreply@notify.sentia-plants.com`.

## 5. Google Search Console
- Add and verify `https://sentia-plants.com/` with a verification tag, add it as a property, and submit `https://sentia-plants.com/sitemap.xml`.
- Keep the old `verdant-nl.app` property; Google moves ranking over as it recrawls. Your current ranking is small, so the loss is minimal.

## 7. What you change yourself

Supabase dashboard (Authentication -> URL Configuration):
- Site URL: `https://sentia-plants.com`
- Redirect URLs: add `https://sentia-plants.com/**` and `https://www.sentia-plants.com/**`. Keep the verdant entries until you remove the old domain.
- Google sign-in (if enabled): add `https://sentia-plants.com` to authorised origins in Google Cloud Console; the OAuth app name and consent screen should say Sentia.
- Email templates in Supabase: nothing to do, auth emails already run through the app.
- Tables, triggers, RLS, cron: no changes. Only check any scheduled job that calls the weather digest URL on the old domain; point it at `https://sentia-plants.com/api/public/weather-digest` (I will check and list any I find).

Raspberry Pi:
- In `config.yaml`, set `api_base_url` to `https://sentia-plants.com`. Device ID and ingest secret stay the same.
- Optionally rename the systemd service to `sentia-agent` (commands in the updated README).

MCP clients (Claude, ChatGPT etc.): re-add the connector with the new address `https://sentia-plants.com/mcp`.

## Technical details
- Global replace with review: `Verdant` -> `Sentia`, `verdant-nl.app` -> `sentia-plants.com`, `ask verdant` variants, lowercase slugs in filenames. Exclude `supabase/migrations/**`, `src/integrations/supabase/types.ts`, `routeTree.gen.ts`, localStorage keys.
- `SITE_NAME` in `lovable/email/auth/webhook.ts`, `preview.ts`, `send-email.ts`; `SENDER_DOMAIN`/`FROM_DOMAIN` switched only after the new email domain is verified.
- Search Console via connector: META token -> root `head()` in `__root.tsx` -> publish -> verify -> add site -> list sites -> submit sitemap.
- Check cron jobs with a read query on `cron.job` for old-domain URLs.
- Typecheck and build must pass; render the auth email previews to confirm branding.
