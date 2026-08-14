Plant photo journal

Add manual photo uploads per plant, a latest-photo card on the plant page, and a full gallery page ordered by date.

## What you get

- **Upload button** on the plant detail page (`/plants/:id`): pick or take a photo, optionally add a note, and it's stored against that plant.
- **Latest photo card** on the plant page showing the newest photo, the date it was taken, and any note, with a "View all photos" link.
- **Gallery page** at `/plants/:id/photos`: all photos for that plant, newest first, grouped by date, each with note and a delete option. Make sure you also create a button for edit caption.
- Photos are private to you — served through short-lived signed links.
- Structured so a later AI pass (health, yellow leaves, disease, flowering, leaf count) can read each photo and write results back without changing the schema shape.

## Database

New table `plant_photos`:

- `plant_id` (the plant it belongs to), `user_id` (owner)
- `storage_path` (file in the `plant-images` bucket)
- `taken_at` (defaults to upload time; editable later)
- `caption` (optional note)
- `width`, `height`, `bytes`, `content_type`
- `ai_analysis` (JSON, empty for now — reserved for future inference)
- standard `id`, `created_at`, `updated_at` with update trigger

Access rules: only the signed-in owner can view, add, edit, or remove their own photo records. Storage policies on `plant-images` are scoped so a user can only read/write files under their own user folder.

## Technical notes

- Files go to the existing private `plant-images` bucket under `photos/{user_id}/{plant_id}/{timestamp}.{ext}`, keeping the Pi's automated `plant-snapshots` bucket separate from user uploads.
- New server functions in `src/lib/plants.functions.ts`, all behind `requireSupabaseAuth` and verifying plant ownership: `listPlantPhotos`, `createPlantPhoto` (records a row after upload), `deletePlantPhoto`, `getPhotoSignedUrls` (batch signed URLs, 1h TTL).
- Browser uploads the file directly with the authenticated Supabase client (`supabase.storage.from("plant-images").upload(...)`), then calls `createPlantPhoto` with the returned path — avoids sending image bytes through the server function.
- Client-side resize/compress to max 1600px JPEG before upload to keep files small.
- New route `src/routes/_authenticated/plants/$id.photos.tsx` → `/plants/$id/photos`, with its own `head()` metadata.
- Plant detail page gets a `PlantPhotos` section (upload button + latest photo) reusing the existing signed-URL pattern from the `Snapshot` component.
- React Query keys: `["plant_photos", id]`, invalidated on upload/delete.