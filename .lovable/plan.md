# Verdant Marketplace — Phase 1

Buy and sell plants between Verdant users in the Netherlands, Belgium and Germany. Money is **simulated** end to end (no real card charges), but the ledger, commission, escrow and payout flows are built for real so a payment provider can be plugged in later without redesigning anything.

## What the user gets

**New "Marketplace" tab** in the top navigation (desktop dropdown + mobile sheet), with:
- Browse grid of active listings with photo, price, seller handle, size, age and health badge.
- Filters: common name / alias search, species, size (XS–XL), age range, health rating, price range, country, pickup vs shipping.
- Listing detail page: photos from the plant's journal, care species info, price, delivery options, and a **Transparency panel** — a timestamped history of logged issues (disease, pests, brown leaves, repotting), watering consistency and photo timeline.

**Sell from My Garden:** each plant card and plant detail page gets a "List on Marketplace" button that opens a form pre-filled from the plant (species, nickname, photos, size, age). Seller sets price, condition disclosures, and delivery options (local pickup and/or shipped with box size).

**Marketplace-safe profile:** a separate public seller profile showing only display name, @username, country, member-since, plant count, completed sales and rating. Avatar hidden by default with a "show my picture on listings" opt-in for later. Exact city/coordinates are never exposed; pickup address is revealed only to the buyer after an order is confirmed.

**Checkout (simulated):** buyer picks delivery method, sees item price + shipping + **Verdant commission (default 7%, configurable)**, and confirms. A test-mode banner makes clear no real money moves. Funds go into escrow, released to the seller's wallet when the order is marked delivered/received.

**Orders & logistics:** both sides get an order page with a status timeline — placed → accepted → ready → picked up / shipped → delivered → completed. Sellers enter carrier and tracking number manually, pick a box size and a dispatch or pickup slot; buyers see the expected delivery window and confirm receipt. A public webhook endpoint is ready for a carrier partner to push delivery events later.

**Wallet:** per-user balance page with available vs pending (escrowed) funds, full transaction history (sales, commission, refunds, payouts) and a payout request flow. Payout requests land in the existing Admin panel for manual approval and are marked paid there — that's how payouts work until a real provider is connected.

**Admin:** listings moderation (soft-archive via the existing `archived_records` flow), commission rate setting, payout queue, and order dispute flagging.

## Payments: how we get from simulated to real

The database models a real marketplace ledger from day one: orders, escrow holds, double-entry wallet transactions, commission lines and payouts. Nothing calls a provider yet — a `payment_provider = 'simulated'` column marks every record.

When you're ready for real money, the recommended path is **Stripe Connect** (Lovable's built-in Stripe integration, sandbox first): the seller onboards as a connected account, buyers pay a destination charge, Verdant's commission is taken as an application fee, and Stripe handles seller payouts and KYC. That swap touches checkout and payout code only — orders, wallets and logistics stay as built. Paddle isn't an option here: it can't do physical goods or seller payouts.

## Technical plan

**Migration (new tables, all with GRANTs + RLS):**
- `marketplace_listings` — plant_id, seller_id, species_id, title, description, price_cents, currency EUR, size enum, age_months, health_rating, country_code, delivery_pickup/shipping flags, box_size, status enum (draft/active/reserved/sold/archived), timestamps.
- `listing_disclosures` — listing_id, kind (disease/pest/leaf_damage/repot/other), description, occurred_on, resolved_on. Seeded suggestions pulled from the plant's photo/AI-summary history.
- `marketplace_orders` — listing_id, buyer_id, seller_id, amounts (item, shipping, commission, total), status enum, delivery_method, pickup_slot, ship_by/expected dates, carrier, tracking_number, addresses (revealed post-confirm), timestamps per status.
- `order_events` — append-only status audit trail.
- `wallets` (user_id, available_cents, pending_cents) and `wallet_transactions` (order_id, kind, amount, direction, balance_after).
- `payout_requests` — user_id, amount, iban_last4, status, admin_id, processed_at.
- `marketplace_settings` — commission_bps, active countries.
- Add `size` and `acquired_at` overrides to `user_plants` (size defaults from species average).
- Enums for size, listing status, order status, transaction kind.

RLS: listings readable by authenticated users when `status='active'`, plus owner-scoped read for drafts/archived; orders visible only to buyer, seller and admins; wallets and transactions strictly owner + admin; all state transitions go through server functions, never direct client writes.

**Server functions** (`src/lib/marketplace.functions.ts`, `wallet.functions.ts`, plus `marketplace.server.ts` helpers): create/update/publish listing, search listings with filters, get listing detail, place order, seller accept/ship, buyer confirm receipt, cancel/refund, wallet summary, request payout, admin approve payout. Escrow and commission math lives in a single server-only pricing module so the real-provider swap is one file.

**Routes:** `_authenticated/marketplace/index.tsx` (browse + filters), `marketplace/$id.tsx` (listing detail), `marketplace/new.tsx` and `marketplace/$id_.edit.tsx`, `marketplace/orders.tsx` + `orders.$id.tsx`, `wallet.tsx`, admin sub-routes for listings and payouts. Public carrier webhook at `src/routes/api/public/logistics-webhook.ts` with signature verification.

**Notifications:** new order, order accepted, shipped, delivered, payout processed — reuse the existing notifications table, bell and badge system. New feed post kind `listing_sold` (opt-in) so friends see marketplace activity.

Region locked to NL/BE/DE via a country allow-list on listings and checkout; prices in EUR only.

## Not in this phase

Real card charges, Stripe Connect onboarding, automated carrier label purchase, buyer/seller ratings beyond a simple count, offers/bidding, profile pictures.
