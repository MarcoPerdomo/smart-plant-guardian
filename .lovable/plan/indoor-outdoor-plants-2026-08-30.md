# Indoor / outdoor plants

Parking the local-LLM work — AI stays on Lovable AI credits.

## Current state (verified)
- `plant_species` has no indoor/outdoor column (no `environment`, `indoor`, or `outdoor` field exists).
- `user_plants` has no environment field either — only `location` (free text).
- The Add Plant flow (`src/routes/_authenticated/plants/new.tsx`) picks a species, then nickname / location / device / notes.
- New species are enriched by AI in `src/lib/plants.server.ts` (`generateSpeciesProfile`).

## What to build

### 1. Database
- Add `environment` to `plant_species`: values `indoor`, `outdoor`, `both`, `unknown` (default `unknown`), plus a short `environment_notes` text explaining why (e.g. "Tropical — keep indoors below 15 °C; can go outside in summer shade").
- Add `environment` to `user_plants` (`indoor` / `outdoor`), default `indoor`.
- Backfill: set every existing `user_plants` row to `indoor` (you are the only user with plants).

### 2. Enrich the species catalog
- Extend the AI enrichment prompt in `src/lib/plants.server.ts` so newly imported species return `environment` and `environment_notes`.
- Add an admin action on `/admin/plants` to backfill `environment` for the ~132 existing species that are still `unknown`, batched through the AI, same pattern as the existing image backfill.

### 3. Add Plant UI
- Species results and the selected-species card show an Indoor / Outdoor / Both badge, and the selected card shows the `environment_notes` description.
- New step in the form: choose whether *your* plant lives indoors or outdoors, pre-selected from the species' recommendation, with a hint when the choice differs from the recommendation.
- Add a quick Indoor / Outdoor / All filter above the species search list.

### 4. Elsewhere
- Show the indoor/outdoor badge on the plant detail page and in the dashboard plant cards.
- Allow changing it from the plant detail page.

## Technical notes
- One migration: two enum-backed text columns with checks via allowed-value lists, defaults, and the backfill update for `user_plants`.
- `src/lib/plants.functions.ts`: include `environment` in `createPlant` input and add an update path; species selects already use `*`.
- Weather alerts (`src/lib/weather-rules.ts`) currently treat all plants the same — out of scope here, but the new field makes outdoor-specific rules possible later.
