# Make sensor readings appear live

## What's actually happening

Your data is arriving. Plant `a4789531…` has 1 reading in `sensor_readings`, recorded at 20:34:58 UTC today — a few minutes ago. So the Pi → ingest → database path works.

The problem is purely in the UI: the plant page loads readings once, when the page mounts. There is no polling and no realtime subscription, so a reading that lands after you opened the page never shows up until you manually reload or navigate away and back. The dashboard behaves the same way.

Answer to "how long does it take": today, forever — until a reload.

## What to build

1. **Auto-refresh the plant detail page** — refetch the plant query every 60 seconds while the tab is visible, and refetch on window focus so switching back to the tab shows fresh data immediately.
2. **Auto-refresh the dashboard** — same treatment for the plant list query so the tiles' moisture/temp/light values keep up.
3. **Realtime push (optional, recommended)** — subscribe to inserts on `sensor_readings` for the open plant and invalidate the query when one arrives, so a new reading appears within a second instead of up to a minute. Requires adding `sensor_readings` to the realtime publication via a migration; RLS still applies so users only receive their own plants' rows.
4. **Show freshness** — display "Last reading 3 minutes ago" plus a small live indicator on the detail page header, so it's obvious whether the page is current or the sensor has gone quiet.

## Technical notes

- `src/routes/_authenticated/plants/$id.tsx`: add `refetchInterval: 60_000`, `refetchIntervalInBackground: false`, `refetchOnWindowFocus: true` to the `["plant", id]` query.
- `src/routes/_authenticated/dashboard.tsx`: same options on the `["user_plants"]` query.
- Realtime: `useEffect` subscribing to a channel filtered on `plant_id=eq.<id>`, invalidating `["plant", id]` on insert, with `supabase.removeChannel` cleanup. Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;`
- No changes to the ingest route or the Pi agent — those are working.

Note: your Pi is configured with `interval_seconds: 300`, so even with live UI a new reading only arrives every 5 minutes. Lower that in `config.yaml` if you want faster feedback while testing.
