# Global notification bell and badge system

Surface the existing `notifications` table in the authenticated header, add count badges to the Social navigation group, and clear those badges automatically when the user visits the relevant sections.

## What you get

**Bell in the header (desktop and mobile)**
- Sits next to the weather chip, always visible on every signed-in page.
- Red dot with a number when you have unread notifications; counts above 9 show as 9+.
- Click opens a panel listing your latest notifications: actor name, title, body and relative time ("2 hours ago"), unread ones highlighted.
- Clicking a notification marks it read and navigates to its link (feed, friends, or the message thread).
- "Mark all as read" at the top of the panel.
- Empty state rotates through friendly greenhouse phrases.

**Badges on the Social group**
- The Social dropdown trigger shows the combined unread total for notifications, pending friend requests, unread messages, and new feed posts since the last visit.
- Inside the dropdown, each of Feed, Friends, and Messages shows its own count.
- On mobile the hamburger button gets a small dot when any Social unread exists, and the sheet repeats the per-item badges.

**Automatic clearing**
- Opening `/feed` marks the feed as seen and refreshes the badge counts.
- Opening `/messages` or a conversation marks messages as read and refreshes the badge counts.
- Accepting/declining a friend request or sending one refreshes the badge counts.

## Technical notes

- Add `feed_last_seen_at` to `profiles` so the feed badge can compare against the newest friend post.
- New `src/lib/notifications.functions.ts` with `listNotifications`, `getBadgeCounts`, `markNotificationRead`, and `markFeedSeen`, all behind `requireSupabaseAuth`.
- New `src/components/notifications/notification-bell.tsx` and `src/components/ui/count-badge.tsx`.
- Wire the bell and badges into `src/routes/_authenticated/route.tsx`; badge query refetches every 30 seconds and on window focus.
- Update `src/routes/_authenticated/feed.tsx`, `friends.tsx`, `messages.index.tsx`, and `messages.$id.tsx` to invalidate `badge_counts` when their relevant state changes.

## Build order

1. Migration: add `profiles.feed_last_seen_at`.
2. Create notification server functions and badge component.
3. Add the bell to the authenticated header and badges to desktop/mobile navigation.
4. Clear badges on feed, friends, and messages interactions.
