# Notifications bell and badge counts

Add an always-visible bell in the top bar plus small count badges on Social, Friends, Messages and Feed, so unread activity is obvious from anywhere in the app.

## What you get

**Bell in the header (desktop and mobile)**
- Sits next to the weather chip, always visible on every signed-in page.
- Red dot with a number when you have unread notifications; counts above 9 show as `10+`.
- Click opens a panel listing your latest notifications: actor name, title, body and relative time ("2 hours ago"), unread ones highlighted.
- Clicking a notification marks it read and navigates to its link (feed, friends, or the message thread).
- "Mark all as read" at the top of the panel.
- Empty state: "Nothing new — your plants are behaving."

**Badges on the navigation items**
- **Friends**: number of incoming pending friend requests.
- **Messages**: unread messages (already counted today, restyled to match).
- **Feed**: number of friend posts created since you last opened the feed.
- **Social** group trigger (desktop dropdown) and the mobile hamburger button show a combined dot/number so you notice something without opening the menu.
- All badges use the same pill component and cap at `10+`.

**Freshness**
- Counts refetch every 30 seconds and immediately when you switch back to the tab.
- Opening the relevant page clears its badge (feed marks itself seen, messages mark the thread read, notifications marked read on click).

## Technical notes

Server (`src/lib/notifications.functions.ts`, all behind `requireSupabaseAuth`, scoped to `context.userId`):
- `listNotifications({ limit })` — latest 30 notifications for the user, joined with actor profile (id, username, display_name, avatar_url) via the existing `profiles_public_by_ids` helper.
- `getBadgeCounts()` — one call returning `{ notifications, friendRequests, messages, feed }`:
  - notifications: `notifications` where `read_at is null`
  - friendRequests: `friendships` where `addressee_id = me and status = 'pending'`
  - messages: reuse the existing `getUnreadCount` logic
  - feed: posts from accepted friends newer than the caller's last feed view
- `markNotificationRead({ id })` and `markAllNotificationsRead()` — UPDATE `read_at = now()` on own rows (the existing UPDATE policy on `notifications` already covers this; no migration needed for the bell).

Feed "last seen": add a `feed_last_seen_at timestamptz` column to `profiles` (migration) plus a `markFeedSeen()` server fn called when `/feed` mounts, so the count is consistent across devices instead of per-browser.

UI:
- `src/components/notifications/notification-bell.tsx` — bell button + `DropdownMenu` panel, uses `useQuery` with `refetchInterval: 30_000` and `refetchOnWindowFocus`.
- `src/components/ui/count-badge.tsx` — shared pill rendering `n > 9 ? "10+" : n`, with `aria-label` for screen readers.
- `src/routes/_authenticated/route.tsx` — mount the bell in the header, replace the ad-hoc message badge with `CountBadge`, add badges to Friends/Feed/Social and to the mobile menu items and hamburger trigger.
- Existing per-page queries (`friendships`, `unread_messages`) invalidated after the relevant actions so badges drop instantly.

## Build order

1. Migration: `profiles.feed_last_seen_at`.
2. `notifications.functions.ts` with list, counts, mark-read, mark-feed-seen.
3. `CountBadge` + `NotificationBell` components.
4. Wire header (desktop + mobile) and clear-on-visit behaviour on `/feed`, `/friends`, `/messages`.
