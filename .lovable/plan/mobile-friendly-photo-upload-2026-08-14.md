# Mobile-friendly photo upload

Yes — the upload UI is already in place. On a plant's page there is a "Photo journal" card with a note field and an **Upload photo** button, plus a "View all photos" link to the full gallery, which also has its own upload button.

What is not yet mobile-proof is *how* that button behaves on phones. Three concrete gaps:

## 1. Camera-only on mobile
The file input is set to force the rear camera. On Android and iOS this skips the photo library entirely, so you cannot upload an existing shot of your plant — only take a new one.

Fix: offer two buttons — **Take photo** (camera) and **Choose from library** (gallery) — so both paths work on phone and desktop.

## 2. iPhone HEIC photos can fail
iPhones save photos as HEIC. The current resize step relies on browser image decoding, which fails for HEIC in some browsers, so the upload errors out.

Fix: if decoding fails, fall back to uploading the original file with its real content type instead of throwing, and show a clear message if the browser truly cannot handle it.

## 3. Mobile ergonomics
- Buttons and the caption field will get full-width, comfortable tap targets on small screens.
- Show a real "Uploading…" state with the button disabled (already partly there) and prevent double taps.
- Large phone photos (12MP+) will be resized before upload, as today, to keep uploads fast on mobile data.

## Technical notes
- `src/components/plant-photos.tsx`: split the single hidden input into two (one with `capture="environment"`, one without), render two buttons, and improve small-screen layout.
- `src/lib/photo-upload.ts`: wrap `createImageBitmap` in try/catch and fall back to the original `File` and its MIME type; keep the 1600px/JPEG path as the default.
- No database, storage, or server-function changes needed — the `plant_photos` table, bucket, and upload flow stay as they are.

## Verification
Check the plant page and `/plants/{id}/photos` render both buttons, and confirm an upload succeeds end to end from a narrow (mobile) viewport.
