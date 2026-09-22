# Access tiers: Free, Premium, Admin

## What's live today

The assistant is fully wired and running: "Ask Verdant" chat and the external assistant connection (5 actions: list plants, plant insights, log watering, add plant, search catalogue). Both are open to any signed-in user today — no tier check anywhere.

Checked in code:
- Catalogue import and catalogue image generation are already admin-only.
- But the Add Plant screen still lets **any** user create a brand-new catalogue entry with AI when they type a name that isn't in the catalogue. This is the one gap.
- Marketplace is open to all signed-in users.

## Tiers at launch

| | Free (Basic) | Premium | Admin |
|---|---|---|---|
| Plants, watering, photos, sensors, social | Yes | Yes | Yes |
| AI Check summaries | Yes | Yes | Yes |
| Ask Verdant (chat + voice + external assistant) | No | Yes | Yes |
| Marketplace | No | No | Yes (for now) |
| Add a new plant to the catalogue | No | No | Yes |
| Catalogue import & image generation | No | No | Yes |

Admins keep everything they have today, and automatically count as Premium.

## Premium memberships

New table recording every grant: who, who granted it, when it started, an optional end date, when it was revoked, and an admin note. Nothing is deleted, so history stays visible.

A person is Premium if they have a grant that hasn't been revoked and hasn't passed its end date. Grants with no end date stay on until an admin revokes them.

## Admin panel: new "Premium" tab

- List of current Premium members: name/email, since when, how long they've been Premium, end date (or "no end date"), who granted it.
- Search a user, grant Premium with an optional end date and note, or revoke.
- History section showing expired and revoked grants.
- Small counters at the top: active Premium members, expiring in the next 30 days, total ever granted.
- The Users & roles tab gets a Premium marker per user so it's visible at a glance.

## What free users see

- "Ask Verdant" stays in the menu with a small Premium tag. Opening it shows a short page explaining it's a Premium feature and how to request access, instead of the chat.
- Marketplace disappears from the menu for non-admins, and direct links send them back to the dashboard.
- On Add Plant, typing a name that isn't in the catalogue no longer creates it. Instead they get a message that the plant can be requested, with a button that notifies admins.

## Technical notes

- Migration: `premium_grants` table (user_id, granted_by, granted_at, expires_at, revoked_at, revoked_by, note) with grants, RLS (own rows readable; admin-only writes) and a `security definer` function `public.is_premium(_user_id uuid)` returning true for active grants or `has_role(_user_id,'admin')`.
- Server enforcement (the real gate, not the UI):
  - `src/routes/api/chat.ts` — after claims validation, call `is_premium`; return 403 otherwise.
  - `src/lib/mcp/tools/*` — shared premium check in the tool context; `add_plant` also stays within the catalogue.
  - `src/lib/plants.functions.ts` `lookupOrCreateSpecies` — add the same admin check the import functions use; split out a non-creating `findSpecies` used by Add Plant.
  - `src/lib/marketplace.functions.ts` — admin check in every listing/order/wallet server function.
- New `src/lib/premium.functions.ts`: `myAccess()` (isAdmin, isPremium, premiumSince, expiresAt), `listPremiumMembers`, `grantPremium`, `revokePremium` (admin-gated).
- New route `src/routes/_authenticated/admin/premium.tsx` plus an entry in the admin tab list.
- Route guards: `beforeLoad` on `/chat` and `/marketplace/*` using `myAccess()`; `src/routes/_authenticated/route.tsx` hides/tags the menu entries.
- Regenerate Supabase types and the MCP manifest; verify typecheck and build.
