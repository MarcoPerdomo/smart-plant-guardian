# Fix: sensor readings never reach the plant page

## What's wrong

The data is there — plant `a4789531…` has readings arriving every ~5 minutes from `edith_living_room` (latest 18:12 UTC today). The app can't read them because of two database access problems introduced by earlier security hardening:

1. A "no client writes" rule on `sensor_readings` was written as a **restrictive rule covering every operation** (including reads) with a condition that is always false. Restrictive rules override permissive ones, so the "users read their own plant readings" rule can never take effect — every read returns zero rows.
2. The `sensor_readings` table has **no Data-API grants at all** (neither `authenticated` nor `service_role`), so even with correct rules the app is not permitted to query it.

The Pi keeps writing successfully because ingestion goes through the server key path, which bypasses both.

## The fix

One database migration:

- Drop the all-operations restrictive rule and replace it with restrictive rules scoped to **INSERT, UPDATE, DELETE only** — clients still cannot write, but reads are no longer blocked.
- Keep the existing permissive read rule (owner of the plant can read its readings).
- Add the missing grants: `SELECT` to `authenticated`, `ALL` to `service_role`. No `anon` access — readings are private.

No frontend changes are needed; the plant page, refresh button and realtime subscription already work once reads are permitted.

## Verification

- Query readings as the owning user and confirm rows come back.
- Open the plant page and confirm the metrics, chart and history table populate, then confirm a new Pi reading appears live.
