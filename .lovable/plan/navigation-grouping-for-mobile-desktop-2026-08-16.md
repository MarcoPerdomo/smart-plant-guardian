# Navigation grouping for mobile + desktop

## Goal
Reduce top-bar crowding by grouping authenticated nav links:
- **My Plants**: Dashboard + Add plant
- **Social**: Feed + Friends + Messages
Keep Settings, Admin (when admin), and Sign out accessible without making the bar wider than a phone screen.

## What will change

### 1. Responsive nav layout in `src/routes/_authenticated/route.tsx`
Replace the single horizontal `<nav>` with a responsive structure:

- **Desktop**: show compact grouped menus using `DropdownMenu`.
  - "My Plants" dropdown with Dashboard and Add plant.
  - "Social" dropdown with Feed, Friends, Messages (preserve unread badge on Messages).
  - Keep WeatherChip visible.
  - Move Settings / Sign out (and Admin when applicable) into a user/account `DropdownMenu` on the right to free more space.

- **Mobile**: hide the desktop nav behind a hamburger button that opens a `Sheet`. Inside the sheet show grouped sections:
  - My Plants (Dashboard, Add plant)
  - Social (Feed, Friends, Messages with unread badge)
  - Account (Settings, Admin if admin, Sign out)

### 2. Active-route highlighting inside dropdowns
Use `useMatch` (or TanStack `Link` `activeProps`) so items inside a group still show when their route is active. The parent trigger will also get an active/selected style when any child route is active.

### 3. Preserve existing behaviour
- Unread message count continues to poll and display on Messages.
- Admin link remains conditional on `amIAdmin()`.
- `UsernameGate` stays mounted.
- WeatherChip remains in the header.
- No route files change; only the layout's navigation JSX changes.

## Out of scope
- New pages, backend changes, or social features.
- Re-styling beyond the nav grouping.

## Verification
- Build passes (`lovable-exec build` / typecheck).
- Visual check: desktop shows dropdown groups, mobile shows hamburger sheet.
- Confirm all existing links still navigate correctly and active states work.
