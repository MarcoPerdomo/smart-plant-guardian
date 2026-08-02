## Goal
Let the Raspberry Pi agent upload camera snapshots to cloud storage and display the latest snapshot on each plant's detail page.

## What will change

### Backend / Cloud
1. **Create a public storage bucket** `plant-snapshots` for image files.
2. **Add RLS policies** so authenticated users can read their own plant snapshots and the Pi agent can upload via a verified server route.
3. **Add a public server route** `/api/public/snapshot-upload` that:
   - Verifies `X-Ingest-Secret`.
   - Looks up the plant by `device_id`.
   - Receives a multipart JPEG upload.
   - Stores it in `plant-snapshots/{user_id}/{plant_id}/{timestamp}.jpg` using the service role client.
   - Returns the public URL.
4. **Extend `sensor_readings`** with an optional `snapshot_url` column so the plant page can fetch the latest image.

### Pi agent
5. **Update `pi-agent/sensors/camera.py`** to return the full snapshot file path after capture.
6. **Update `pi-agent/agent.py`** to:
   - Capture a snapshot.
   - POST it to `/api/public/snapshot-upload` first.
   - Include the returned `snapshot_url` in the subsequent `/api/public/ingest` reading payload under `extra.snapshot_url`.
7. **Update `pi-agent/config.example.yaml`** with the new snapshot-upload endpoint and keep the existing `snapshot_dir` / `keep_snapshots` settings.

### Web UI
8. **Update plant detail page** (`src/routes/_authenticated/plants/$id.tsx`) to show the most recent snapshot above or beside the charts.
9. **Update settings page** (`src/routes/_authenticated/settings.tsx`) to document the snapshot-upload endpoint and required header.

## Out of scope for this plan
- Live video streaming (still deferred).
- Automatic pest counting changes (existing yellow-trap logic stays as-is).

## Verification
- Mock multipart POST to `/api/public/snapshot-upload` with a test image and verify it returns a public URL.
- Confirm the plant detail page renders the latest `snapshot_url` from `sensor_readings`.