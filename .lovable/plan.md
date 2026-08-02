## Goal

Let you hand me a simple list of houseplant names and automatically enrich the Verdant catalog with full care profiles, searchable aliases, and generated images.

## What you should give me

A plain list of common names, one per line. For example:

```text
Monstera deliciosa
Pothos
Peace lily
Fiddle leaf fig
Rubber plant
```

Aliases are welcome inline if you want them (e.g. "Pothos / Devil's ivy / Epipremnum aureum"), but they are not required — the AI will suggest aliases as part of the enrichment.

## What I will build

1. **Schema update — add aliases storage**
   - Add an `aliases text[]` column to `public.plant_species` (empty array by default).
   - Keep the existing care fields; no other table changes needed.

2. **Batch import server function**
   - Add `batchImportSpecies` in `src/lib/plants.functions.ts`.
   - Accepts an array of plant names.
   - For each name:
     - Slugifies the name and skips it if a species with that slug already exists.
     - Calls the Lovable AI Gateway to generate the full care profile (scientific name, light, water frequency, soil moisture range, temperature/humidity ranges, soil, fertilizer, toxicity, pests, diseases, care tips) plus a list of common aliases.
     - Generates a representative plant image via the image generation API and stores it in the `plant-snapshots` bucket (or a new `plant-images` public bucket if preferred).
     - Inserts the new species with `source = 'batch'`.
   - Returns a summary: created, skipped, failed.

3. **Search update**
   - Update `searchSpecies` so the search also matches entries in the `aliases` array, not just `common_name` and `scientific_name`.

4. **Lightweight admin import UI (optional)**
   - Add a protected page at `/_authenticated/admin/plants/import` with a textarea where you can paste the name list and click "Import". This is gated to a new `admin` role using the existing `user_roles` pattern.
   - If you prefer, I can instead expose the batch function and run it for you directly from a script — no UI needed.

## Verification

- Import a test batch of 5–10 names.
- Confirm each new species appears in the species picker when adding a plant.
- Confirm searching by an alias returns the correct plant.
- Confirm generated images render on the plant detail/species cards.

## Open decisions

- **Admin UI vs script-only**: Do you want a self-serve import page in the app, or should I just run the batch for you from the backend when you paste the list?
- **Image storage**: Should generated catalog images go into the existing private `plant-snapshots` bucket with a public URL, or should I create a separate public `plant-images` bucket for catalog photos?

Once you confirm those two points, I'll implement the plan.