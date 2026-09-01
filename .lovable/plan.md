# Rebrand public pages around Verdant's vision and add About Us

Goal: shift the public-facing copy from "Arduino sensor beta" to Europe's connected plant-lover network powered by AI and community, then add an About page that leads with the new Vision and Mission.

## 1. Homepage rewrite

Update `src/routes/index.tsx`:
- New title/description/og/twitter meta focused on the plant-lover network and AI care assistant.
- New hero headline and subheadline reflecting the vision (e.g. "Turn every home into a thriving green sanctuary").
- Keep Arduino/sensors as a supporting feature card, not the lead value prop.
- Add a feature card for community/social and one for the marketplace.
- Add an "About us" link in the footer.
- Keep the Beta badge and existing CTA structure.

## 2. About Us page

Create `src/routes/about.tsx`:
- Route `/about` with full head metadata (title, description, og, twitter, canonical to `https://verdant-nl.app/about`).
- Sections:
  - Vision statement (verbatim from user).
  - Mission statement (verbatim from user).
  - "Why Verdant" — short bridge between vision and current beta features (AI care, community, marketplace).
  - "From the founder" placeholder section with a brief intro line and a note that Marco's full story will be added soon.
- Reuse the same simple header/footer pattern as the legal pages.
- Add a `Link` to `/about` in the landing page footer and, if space allows, in the landing header.

## 3. Public SEO metadata refresh

Update metadata on all public routes to use the new framing:
- `src/routes/get-started.tsx`: title/description that mention the Verdant ecosystem rather than only sensors.
- `src/routes/privacy.tsx`, `src/routes/terms.tsx`, `src/routes/cookies.tsx`, `src/routes/subprocessors.tsx`: keep legal accuracy, update descriptions where they summarize the service.
- Standardize all canonical URLs to `https://verdant-nl.app/*` (some legal pages currently point to `leaf-buddy-system.lovable.app`).
- Update `public/sitemap.xml` to include `/about`.

## 4. Authenticated header/footer links

If the app shell has a public-style footer or marketing links, add `/about` alongside Privacy/Terms so signed-in users can also reach it.

## 5. Verification

- Run `tsgo --noEmit -p tsconfig.json`.
- Check the preview homepage and `/about` for correct copy and metadata.
- Re-check SEO findings after the edits and mark any affected metadata findings fixed.
