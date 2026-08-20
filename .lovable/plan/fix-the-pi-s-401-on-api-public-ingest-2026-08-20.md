# Fix the Pi's 401 on /api/public/ingest

## What I verified just now

- `https://verdant-nl.app/api/public/ingest` is live: a GET returns `200` with the usage message, so the route is deployed on the custom domain.
- A POST with a deliberately wrong header returns exactly your error: `401 {"ok":false,"error":"Invalid ingest secret"}`.
- The endpoint returns `500 "Ingestion not configured"` when the secret is missing. You get `401`, not `500` — so a secret **is** configured on production; the value your Pi sends simply doesn't match it.
- `ARDUINO_INGEST_SECRET` exists in the app's secret store (alongside `APP_URL`, `LOVABLE_API_KEY`, `WEATHER_DIGEST_SECRET`).

## The likely cause

The ingest endpoint is **not** a Supabase Edge Function. It's a server route in this app, and it reads `ARDUINO_INGEST_SECRET` from the app's own backend secrets — not from Supabase's Edge Function secrets. A value set or read in the Supabase dashboard is a different store and has no effect here. Second most likely: the value in `config.yaml` picked up quotes, a trailing space, or a line break during copy/paste.

Secret values can't be read back once stored, so the fix is to set both sides to one value we know.

## Plan

1. Re-set `ARDUINO_INGEST_SECRET` in the app's secrets through the secure form, using a value you choose (e.g. `openssl rand -hex 32`). You keep a copy — I never see it.
2. You paste that same value into `pi-agent/config.yaml` as `ingest_secret`, unquoted, on one line, then restart the agent (`sudo systemctl restart verdant-agent`).
3. I re-test the endpoint from here with a wrong secret to confirm it still rejects, and you run the Pi's one-shot check:
   `.venv/bin/python agent.py --config config.yaml --once`
4. Confirm the reading landed by querying `sensor_readings` for your `device_id`, and check the plant detail chart.
5. If it still 401s afterwards, the next suspect is the published deployment lagging behind the secret update — I'll re-publish and retest.

## Docs cleanup (small)

Update `pi-agent/README.md` and `supabase/EXTERNAL-PROJECT-MIGRATION.md` to state clearly that `ARDUINO_INGEST_SECRET` lives in the app's backend secrets, not in Supabase, so this doesn't bite again.

## Notes

- Your `device_id` must match `user_plants.device_id` exactly, but a mismatch there gives `404`, not `401` — so that isn't the current problem.
- The same secret guards `/api/public/snapshot-upload`, so it gets fixed by the same step.
