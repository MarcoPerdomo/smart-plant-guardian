# Verdant Social: usernames, friends, feed, chat

Turn Verdant into a plant-social app: find people by username, connect as friends, follow each other's plant life in a feed, react and comment, and chat privately. Built on tables that can later carry a marketplace (listings, orders, commission) without redesign.

## What you get

**Usernames and profiles**
- Every profile gets a unique `@username` (lowercase, 3-24 chars), plus optional bio and avatar.
- One-time prompt to pick a username for existing accounts; enforced before using social features.
- Public-ish profile page `/u/:username` showing: display name, @username, country only (never city/address), member since, plant count, friend count, and a Add friend / Message button. Plant details and the activity feed stay friends-only.

**Friends**
- Search by username or display name.
- Request → the other person accepts or declines. Either side can remove a friend later. Blocking included so an unwanted person can't request or message again.

**Feed (friends only)**
- Chronological feed of friends' plant activity:
  - Watered a plant (compact line, grouped when several on the same day)
  - New photo added (large card with the photo)
  - Acquired a new plant
  - Care milestones: first bloom, repotted, plant "birthday" (1 year with you), plant added anniversary
  - "Help me" posts: share a plant photo and ask friends what's wrong
- Each post supports emoji reactions (a small plant-flavoured set) and comments.
- Posts are generated automatically from actions you already take (watering log, photo upload, adding a plant) plus manual milestone / help posts.

**Private chat**
- 1:1 text chat between friends only, realtime, with unread badges. No group chats or attachments in this round.

**Notifications**
- In-app notifications for: friend request received, request accepted, comment on your post, reaction on your post, new chat message. Respects your existing notification toggles; email stays limited to the current weather digest.

**Privacy defaults**
- Activity is visible to accepted friends only. Only your country is ever shown publicly. You can delete any of your own posts and comments.

## Technical notes

New tables (all with grants + RLS, `auth.uid()` scoped, indexed for feed reads):
- `profiles`: add `username` (citext-style unique lowercase), `username_set_at`, `bio`, `avatar_url`. Username uniqueness enforced by unique index on lowercased value.
- `friendships`: `requester_id`, `addressee_id`, `status` (pending/accepted/declined), unique ordered pair, plus a `are_friends(a,b)` security-definer helper used by every social policy.
- `blocks`: `blocker_id`, `blocked_id`.
- `posts`: `id`, `author_id`, `plant_id` (nullable), `kind` (`watering`,`photo`,`new_plant`,`milestone`,`help`), `body`, `payload jsonb`, `photo_id`, `visibility` (`friends` default, `private`; `public` reserved), `created_at`. Generic `kind` + `payload` so marketplace post types slot in later.
- `post_reactions`: `post_id`, `user_id`, `emoji`, unique per triple.
- `post_comments`: `post_id`, `author_id`, `body`, `parent_id` (nullable, for later threading), soft-delete column.
- `conversations` + `conversation_participants` + `messages`: 2-participant model now, participant table so groups and buyer/seller threads work later. `read_at` per participant for unread counts.
- Extend existing `notifications` with a `kind` and `actor_id` column rather than a new table.

Feed generation: server-side triggers (or server-fn writes alongside existing mutations) create a `posts` row when a `watering_events`, `plant_photos`, or `user_plants` row is inserted. Feed read is a single indexed query over posts whose author is an accepted friend, keyset-paginated on `(created_at, id)` — no offset paging.

Server layer: new `src/lib/social.functions.ts` (friends, search, feed, reactions, comments), `src/lib/chat.functions.ts` (conversations, messages), all behind `requireSupabaseAuth` and explicitly scoped to `context.userId` — consistent with the earlier admin-leak fix. Realtime chat and new-comment updates via Supabase Realtime subscriptions inside `useEffect` with channel cleanup.

Routes: `/feed` (new signed-in home entry alongside dashboard), `/friends` (requests + search), `/u/$username`, `/messages` and `/messages/$conversationId` — all under `_authenticated`, each with its own `head()` metadata.

Marketplace readiness (not built now): `posts.kind`/`payload`, participant-based conversations, and friendship helpers are all designed so `listings`, `orders`, and a commission ledger can attach without altering these tables.

## Build order

1. Migration: profiles username fields + friendships/blocks + helper functions.
2. Username onboarding, search, friend request flow, profile page.
3. Migration: posts, reactions, comments, notification kinds + activity triggers.
4. Feed UI with reactions, comments, help posts, milestones.
5. Migration + UI for conversations/messages, realtime chat and unread badges.
6. Social notifications wired into the existing notification surface.
