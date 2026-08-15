# Admin Panel (role-gated)

A proper `/admin` area, visible and usable only to users with the `admin` role. Everyone else never sees the link and is bounced if they type the URL.

## What you get

**1. Admin home — `/admin`**
- Small stats row: total users, total plants, total species, photos stored.
- Cards linking to the sub-sections below.

**2. Users & roles — `/admin/users`**
- Search users by email or display name.
- Each row shows email, display name, join date, plant count, current roles.
- Buttons to grant/remove `admin`, `moderator`, `user` roles.
- You cannot remove your own admin role (guard against locking yourself out).

**3. Plants — `/admin/plants`**
- Search all users' plants by nickname/owner email.
- View owner, species, created date, photo count.
- Delete a plant (with confirmation), which cascades its readings, photos and summaries.

**4. Species catalog — `/admin/species`**
- Search the ~132-row catalog, see which entries lack images or care data.
- Edit key care fields inline, delete a bad entry, and jump to the existing batch import page.
- Keeps the current `/admin/plants/import` tool, moved under the panel's nav.

**5. Navigation**
- The current always-visible "Import" link in the header is replaced by an "Admin" link that only renders when the signed-in user actually has the admin role.

## Access control

Two layers, both required:
- **Route gate:** an `/admin` layout route checks the role before rendering; non-admins are redirected to the dashboard.
- **Server gate:** every admin server function re-verifies `has_role(auth.uid(), 'admin')` before doing anything. UI hiding alone is not security.

## Technical notes

- New route folder `src/routes/_authenticated/admin/` with a `route.tsx` layout (role check + admin sub-nav), plus `index.tsx`, `users.tsx`, `plants.tsx`, `species.tsx`; existing `plants/import.tsx` stays where it is.
- New `src/lib/admin.functions.ts` + `src/lib/admin.server.ts` with server functions: `getAdminStats`, `searchUsers`, `setUserRole`, `removeUserRole`, `adminListPlants`, `adminDeletePlant`, `adminUpdateSpecies`, `adminDeleteSpecies`. All use `.middleware([requireSupabaseAuth])`, then check the caller's admin role via `context.supabase.rpc('has_role', ...)`, and only then load `supabaseAdmin` inside the handler for cross-user reads/writes.
- A `useIsAdmin` hook (a small cached server fn call) drives the header link and the route gate.
- Database migration needed: `user_roles` currently has no insert/update/delete policies at all, so role changes are impossible. Add admin-only insert/delete policies (writes still go through the verified server functions), and admin-scoped read/delete policies on `user_plants`, `plant_species`, and `profiles` so the panel can operate. Roles stay in `user_roles` — never on `profiles`.
- User search reads `profiles` (email, display_name) rather than `auth.users`, so a user only appears after their profile row is created by the existing signup trigger.

## Open question

Deleting a plant also removes all its sensor history and photos permanently. I'll add a typed confirmation ("delete") for that action unless you'd prefer a soft-delete/archive flag instead.
