# Fix: admins see other users' plants on the dashboard

## What's happening

Your admin account has an extra database read permission ("Admins read all plants") so that the admin panel can list everyone's plants. The normal user-facing screens don't add their own "only mine" filter — they just ask for "the plants I'm allowed to see". For a regular user that means their own plants; for an admin it means everybody's. So the dashboard leaks other users' plants into your personal garden view.

This is confirmed in the plant-loading code: the dashboard query filters only on "not archived", never on the signed-in user.

## The fix

Make every personal (non-admin) screen explicitly scoped to the signed-in user, so admin privileges only apply inside `/admin`.

- Dashboard list: only plants where the owner is you.
- Plant detail, AI summary, watering log, manual reading, photo upload/list, delete: each verifies the plant belongs to you before acting; otherwise "Plant not found".
- Weather alerts / digest paths that fetch plants keep their existing per-user scoping.

The admin panel keeps its cross-user view — it goes through the separate admin functions, which stay unchanged.

## Technical notes

- In `src/lib/plants.functions.ts`, add `.eq("user_id", context.userId)` to every `user_plants` query inside the user-facing server functions: `listUserPlants`, `getPlant`, `deletePlant`, `generateSummary`, `logWatering`, the manual-reading ownership check, and the photo functions' ownership check.
- No database migration needed — the admin RLS policy stays as-is; the application layer stops relying on RLS alone for the "mine only" filter.
- Also audit any other file querying `user_plants` with the authenticated client for the same missing owner filter and apply the same rule.
