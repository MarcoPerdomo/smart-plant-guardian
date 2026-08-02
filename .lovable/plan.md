## Root cause (confirmed from server logs)

Every import row fails at the very last step, after the AI work has already succeeded. The published server logs show, once per plant:

```
[error] [Supabase] Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY.
[warn]  Image generation failed for Monstera deliciosa Error: Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY.
```

- The AI gateway logs show 90+ successful care-profile calls and a successful image generation — so prompts, model, and credits are all fine.
- `plant_species` still contains only the 30 seeded rows, source `seed`, nothing from the import.
- The import writes rows with the privileged (service-role) Supabase client. Since the backend was moved to your external "Verdant" project, that service-role key is not present in the published server runtime, so both the image upload and the row insert throw.

Secondary problem: the failure message is only in a `title` tooltip, which is why hovering tells you nothing useful.

## Fix

**1. Stop depending on the service-role key for catalog imports**

Add a migration so admins can write the catalog directly under RLS:
- `plant_species`: add INSERT and UPDATE policies for authenticated users where `public.has_role(auth.uid(), 'admin')`, plus the matching grants.
- Storage `plant-images` bucket: add INSERT/UPDATE policies for admins so catalog images can be uploaded with the user's own session.

Then change `importOneSpecies`, `generateSpeciesImageFor`, and `uploadCatalogImage` to use the request's authenticated client (`context.supabase`) instead of `supabaseAdmin`. This removes the broken dependency entirely and keeps the admin gate intact.

**2. Re-bind the service-role key anyway**

Other paths still use it (`addManualReading`, `generateSummary`, the Pi ingest endpoints, snapshot uploads). I'll attempt an automatic re-bind of the Supabase secrets; if the external project can't be re-bound automatically, I'll tell you exactly where to paste the Verdant service-role key so those paths work too.

**3. Make errors visible**

In the import page, show the failure text inline under each failed row (and a "copy errors" action) rather than only in a hover tooltip.

## Verification

- Re-run an import of 2–3 names and confirm new rows appear in `plant_species` with source `batch`.
- Check server logs for the absence of the missing-key error.
