## What's happening

The import is one single request that tries to do all 50 plants sequentially. Per plant it makes **two** AI calls — a care-profile call plus an image generation call — then uploads the image to storage. Image generation alone is typically 15–40s, so 50 plants is easily 20–40 minutes inside one HTTP request.

Confirmed in the database: `plant_species` still has only the original 30 seeded rows and **zero** rows with source `batch`. So nothing was written — the request is either still hanging or was cut off by the serverless request timeout before completing, and because the whole run is one call, you get no partial progress and no feedback.

## Fix

Change the import from "one giant request" to "many small requests driven by the browser".

1. **New server function `importOneSpecies`** (in `src/lib/plants.functions.ts`): same admin check, but handles a *single* name — check slug exists → generate profile → optionally generate + upload image → insert → return `{ name, status, error? }`. Keeps each request within a few seconds to ~30s.
2. **Retire the 50-at-once path**: keep `batchImportSpecies` only as a thin loop for small lists (or remove it) so nothing can queue a 20-minute request again.
3. **Client-side queue in the admin import page**: iterate the pasted names with limited concurrency (3 at a time), calling `importOneSpecies` per name.
4. **Live progress UI**: progress bar `x / n`, a running list of created / skipped / failed with the error message per failure, a Cancel button, and a Retry-failed button. Results persist on screen instead of only arriving at the end.
5. **Images made optional and non-blocking**: a checkbox "Generate catalog images" (default **off**). With it off, an import of 50 plants drops to roughly 1–3 minutes total. Images can then be filled in later via a separate "Generate missing images" pass over rows where `image_url is null`.
6. **Raise the 50 cap** on the client since the limit no longer matters once each request handles one plant.

## Technical details

- Concurrency of 3 keeps us under AI gateway rate limits; on a `429` the client backs off and retries that name once.
- Each plant is inserted immediately, so a cancelled or interrupted run leaves the already-imported plants in place; re-running the same list skips them by slug.
- Image generation, when enabled, stays server-side using the existing `generateSpeciesImage` / `uploadCatalogImage` helpers in `src/lib/plants.server.ts`.
- No database migration needed.

## Note on the current stuck run

Nothing was committed, so there's no cleanup to do — after this change you can paste the same 50 names and watch them land one by one.
