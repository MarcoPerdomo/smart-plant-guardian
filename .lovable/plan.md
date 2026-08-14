# Fix plant search (and make it instant)

## What's wrong

Confirmed by running the exact query the app sends: the search request is rejected by the database API with a parse error.

The search combines three conditions (common name, scientific name, aliases). The aliases part uses a type-cast syntax that the Data API does not accept inside an OR group, so the whole request fails and the UI falls back to an empty list — hence "0 species in catalog" for "African", even though the catalog has 132 species and 5 of them match "African" (4 by name, 5 via aliases).

It also feels slow because every keystroke triggers a fresh round-trip to the server, with no debounce and no caching.

## The fix

1. Make aliases searchable properly
   - Add a maintained `search_text` column on `plant_species` that concatenates common name, scientific name and aliases, with a trigram index for fast partial matching.
   - Search becomes a single valid condition against that column instead of the invalid cast.

2. Make search feel instant
   - Load the catalog once when the Add Plant page opens (cached by the query client), then filter in the browser as you type — zero latency per keystroke.
   - Keep the server search as the source of truth for the initial load; add a debounce only if a server round-trip is still needed.
   - Show a proper error state instead of silently rendering "0 species" when the request fails.

## Technical details

- Migration: add `search_text text` to `public.plant_species`, populated by a trigger (and backfilled) from `common_name || scientific_name || array_to_string(aliases, ' ')`; create `pg_trgm` GIN index on it.
- `src/lib/plants.functions.ts` → `searchSpecies`: replace the `.or(...aliases::text.ilike...)` clause with `search_text.ilike.%q%` (single filter, no OR group).
- `src/routes/_authenticated/plants/new.tsx`: fetch the full catalog once (`q: ""`) with `staleTime`, filter locally on `common_name`, `scientific_name`, `aliases`; surface `isError` in the dropdown label.
