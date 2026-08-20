import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sizeEnum = z.enum(["xs", "s", "m", "l", "xl"]);
const boxEnum = z.enum(["s", "m", "l", "xl"]);
const countryEnum = z.enum(["NL", "BE", "DE"]);

function commissionOf(itemCents: number, bps: number) {
  return Math.round((itemCents * bps) / 10000);
}

export const getMarketplaceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("marketplace_settings")
      .select("commission_bps, active_countries")
      .maybeSingle();
    return {
      commission_bps: data?.commission_bps ?? 700,
      active_countries: data?.active_countries ?? ["NL", "BE", "DE"],
    };
  });

// ============ Listings ============

async function signCovers(paths: string[]): Promise<Record<string, string>> {
  const clean = Array.from(new Set(paths.filter(Boolean)));
  if (clean.length === 0) return {};
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("plant-images").createSignedUrls(clean, 3600);
  const map: Record<string, string> = {};
  for (const s of data ?? []) if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
  return map;
}

export const searchListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        q: z.string().default(""),
        size: sizeEnum.nullable().default(null),
        country: countryEnum.nullable().default(null),
        min_health: z.number().int().min(1).max(5).nullable().default(null),
        max_price_cents: z.number().int().positive().nullable().default(null),
        max_age_months: z.number().int().positive().nullable().default(null),
        delivery: z.enum(["any", "pickup", "shipping"]).default("any"),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("marketplace_listings")
      .select("*, plant_species(common_name, scientific_name, aliases, image_url)")
      .eq("status", "active")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (data.size) query = query.eq("size", data.size);
    if (data.country) query = query.eq("country_code", data.country);
    if (data.min_health) query = query.gte("health_rating", data.min_health);
    if (data.max_price_cents) query = query.lte("price_cents", data.max_price_cents);
    if (data.max_age_months) query = query.lte("age_months", data.max_age_months);
    if (data.delivery === "pickup") query = query.eq("allow_pickup", true);
    if (data.delivery === "shipping") query = query.eq("allow_shipping", true);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const q = data.q.trim().toLowerCase();
    const filtered = q
      ? (rows ?? []).filter((r) => {
          const sp = r.plant_species as { common_name?: string; scientific_name?: string | null; aliases?: string[] | null } | null;
          const hay = [r.title, r.description, sp?.common_name, sp?.scientific_name, ...(sp?.aliases ?? [])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : (rows ?? []);

    const covers = await signCovers(filtered.map((r) => r.cover_photo_path ?? "").filter(Boolean));
    const sellerIds = filtered.map((r) => r.seller_id);
    const { data: sellers } = await context.supabase.rpc("marketplace_sellers_by_ids", { _ids: Array.from(new Set(sellerIds)) });
    const sellerMap: Record<string, { username: string | null; display_name: string | null; country_code: string | null; created_at: string }> = {};
    for (const s of (sellers ?? []) as { id: string; username: string | null; display_name: string | null; country_code: string | null; created_at: string }[]) {
      sellerMap[s.id] = { username: s.username, display_name: s.display_name, country_code: s.country_code, created_at: s.created_at };
    }

    return filtered.map((r) => ({
      ...r,
      cover_url: r.cover_photo_path ? covers[r.cover_photo_path] ?? null : null,
      seller: sellerMap[r.seller_id] ?? null,
    }));
  });

export const getListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: listing, error } = await context.supabase
      .from("marketplace_listings")
      .select("*, plant_species(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing not found");

    const { data: disclosures } = await context.supabase
      .from("listing_disclosures")
      .select("*")
      .eq("listing_id", data.id)
      .order("occurred_on", { ascending: false });

    const { data: sellers } = await context.supabase.rpc("marketplace_sellers_by_ids", { _ids: [listing.seller_id] });
    const sellerRow = ((sellers ?? []) as { id: string; username: string | null; display_name: string | null; country_code: string | null; created_at: string }[])[0] ?? null;

    // Photo journal of the underlying plant (owner-only table -> admin read, safe: listing is public)
    let photos: { id: string; taken_at: string; caption: string | null; url: string | null }[] = [];
    if (listing.plant_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows } = await supabaseAdmin
        .from("plant_photos")
        .select("id, taken_at, caption, storage_path")
        .eq("plant_id", listing.plant_id)
        .order("taken_at", { ascending: false })
        .limit(12);
      const signed = await signCovers((rows ?? []).map((p) => p.storage_path));
      photos = (rows ?? []).map((p) => ({
        id: p.id,
        taken_at: p.taken_at,
        caption: p.caption,
        url: signed[p.storage_path] ?? null,
      }));
    }

    const covers = await signCovers([listing.cover_photo_path ?? ""].filter(Boolean));
    const { data: settings } = await context.supabase.from("marketplace_settings").select("commission_bps").maybeSingle();

    return {
      listing: { ...listing, cover_url: listing.cover_photo_path ? covers[listing.cover_photo_path] ?? null : null },
      disclosures: disclosures ?? [],
      photos,
      seller: sellerRow
        ? {
            id: sellerRow.id,
            username: sellerRow.username,
            display_name: sellerRow.display_name,
            country_code: sellerRow.country_code,
            member_since: sellerRow.created_at,
          }
        : null,
      commission_bps: settings?.commission_bps ?? 700,
      is_mine: listing.seller_id === context.userId,
    };
  });

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("marketplace_listings")
      .select("*")
      .eq("seller_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const covers = await signCovers((data ?? []).map((r) => r.cover_photo_path ?? "").filter(Boolean));
    return (data ?? []).map((r) => ({ ...r, cover_url: r.cover_photo_path ? covers[r.cover_photo_path] ?? null : null }));
  });

/** Pre-fills the "sell this plant" form from a plant the caller owns. */
export const getListingDraftForPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ plant_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: plant, error } = await context.supabase
      .from("user_plants")
      .select("*, plant_species(*)")
      .eq("id", data.plant_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!plant) throw new Error("Plant not found");

    const { data: photos } = await context.supabase
      .from("plant_photos")
      .select("id, storage_path, taken_at")
      .eq("plant_id", data.plant_id)
      .eq("user_id", context.userId)
      .order("taken_at", { ascending: false })
      .limit(12);
    const signed = await signCovers((photos ?? []).map((p) => p.storage_path));

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("country_code")
      .eq("id", context.userId)
      .maybeSingle();

    const acquired = plant.acquired_at ?? plant.created_at;
    const ageMonths = acquired
      ? Math.max(0, Math.round((Date.now() - new Date(acquired).getTime()) / (1000 * 60 * 60 * 24 * 30.4)))
      : null;

    const { data: existing } = await context.supabase
      .from("marketplace_listings")
      .select("id, status")
      .eq("plant_id", data.plant_id)
      .in("status", ["draft", "active", "reserved"])
      .maybeSingle();

    return {
      plant,
      photos: (photos ?? []).map((p) => ({ ...p, url: signed[p.storage_path] ?? null })),
      suggested: {
        title: plant.nickname,
        species_id: plant.species_id,
        size: plant.size ?? "m",
        age_months: ageMonths,
        country_code: profile?.country_code ?? "NL",
      },
      existing_listing: existing ?? null,
    };
  });

const listingInput = z.object({
  plant_id: z.string().uuid().nullable(),
  species_id: z.string().uuid().nullable(),
  title: z.string().min(3).max(120),
  description: z.string().max(4000).nullable(),
  price_cents: z.number().int().min(0).max(5_000_00),
  size: sizeEnum.nullable(),
  age_months: z.number().int().min(0).max(1200).nullable(),
  health_rating: z.number().int().min(1).max(5).nullable(),
  country_code: countryEnum,
  allow_pickup: z.boolean(),
  allow_shipping: z.boolean(),
  shipping_cents: z.number().int().min(0).max(200_00),
  box_size: boxEnum.nullable(),
  cover_photo_path: z.string().nullable(),
  publish: z.boolean().default(false),
  disclosures: z
    .array(
      z.object({
        kind: z.enum(["disease", "pest", "leaf_damage", "repot", "other"]),
        description: z.string().min(2).max(500),
        occurred_on: z.string().nullable(),
        resolved_on: z.string().nullable(),
      }),
    )
    .max(20)
    .default([]),
});

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listingInput.parse(i))
  .handler(async ({ data, context }) => {
    if (!data.allow_pickup && !data.allow_shipping) throw new Error("Pick at least one delivery option");
    if (data.plant_id) {
      const { data: plant } = await context.supabase
        .from("user_plants")
        .select("id")
        .eq("id", data.plant_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!plant) throw new Error("Plant not found");
    }

    const { disclosures, publish, ...fields } = data;
    const { data: row, error } = await context.supabase
      .from("marketplace_listings")
      .insert({
        ...fields,
        seller_id: context.userId,
        status: publish ? "active" : "draft",
        published_at: publish ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (disclosures.length > 0) {
      await context.supabase
        .from("listing_disclosures")
        .insert(disclosures.map((d) => ({ ...d, listing_id: row.id })));
    }
    return row;
  });

export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listingInput.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { id, disclosures, publish, ...fields } = data;
    const { error } = await context.supabase
      .from("marketplace_listings")
      .update({
        ...fields,
        status: publish ? "active" : "draft",
        published_at: publish ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .eq("seller_id", context.userId);
    if (error) throw new Error(error.message);

    await context.supabase.from("listing_disclosures").delete().eq("listing_id", id);
    if (disclosures.length > 0) {
      await context.supabase.from("listing_disclosures").insert(disclosures.map((d) => ({ ...d, listing_id: id })));
    }
    return { ok: true };
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "active", "archived"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      status: data.status,
      published_at: data.status === "active" ? new Date().toISOString() : null,
      archived_at: data.status === "archived" ? new Date().toISOString() : null,
    };
    const { error } = await context.supabase
      .from("marketplace_listings")
      .update(patch)
      .eq("id", data.id)
      .eq("seller_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Orders ============

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        delivery_method: z.enum(["pickup", "shipping"]),
        buyer_note: z.string().max(500).nullable().default(null),
        buyer_address: z.string().max(500).nullable().default(null),
        pickup_slot: z.string().nullable().default(null),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: listing, error } = await context.supabase
      .from("marketplace_listings")
      .select("*")
      .eq("id", data.listing_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing || listing.status !== "active") throw new Error("This listing is no longer available");
    if (listing.seller_id === context.userId) throw new Error("You cannot buy your own listing");
    if (data.delivery_method === "pickup" && !listing.allow_pickup) throw new Error("Pickup not offered");
    if (data.delivery_method === "shipping" && !listing.allow_shipping) throw new Error("Shipping not offered");
    if (data.delivery_method === "shipping" && !data.buyer_address) throw new Error("Delivery address required");

    const { data: settings } = await context.supabase.from("marketplace_settings").select("commission_bps").maybeSingle();
    const bps = settings?.commission_bps ?? 700;
    const shipping = data.delivery_method === "shipping" ? listing.shipping_cents : 0;
    const commission = commissionOf(listing.price_cents, bps);
    const total = listing.price_cents + shipping;
    const sellerNet = listing.price_cents - commission + shipping;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const expected = new Date(now.getTime() + (data.delivery_method === "shipping" ? 5 : 3) * 86400000);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("marketplace_orders")
      .insert({
        listing_id: listing.id,
        buyer_id: context.userId,
        seller_id: listing.seller_id,
        item_cents: listing.price_cents,
        shipping_cents: shipping,
        commission_cents: commission,
        total_cents: total,
        delivery_method: data.delivery_method,
        box_size: listing.box_size,
        buyer_note: data.buyer_note,
        buyer_address: data.buyer_address,
        pickup_slot: data.pickup_slot,
        ship_by: new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10),
        expected_delivery: expected.toISOString().slice(0, 10),
        status: "placed",
      })
      .select()
      .single();
    if (oErr) throw new Error(oErr.message);

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      status: "placed",
      actor_id: context.userId,
      note: "Simulated payment authorised — funds held in escrow",
    });
    await supabaseAdmin.from("marketplace_listings").update({ status: "reserved" }).eq("id", listing.id);

    // escrow: seller pending balance
    await adjustWallet(supabaseAdmin, listing.seller_id, { pending: sellerNet });
    await supabaseAdmin.from("wallet_transactions").insert([
      {
        user_id: listing.seller_id,
        order_id: order.id,
        kind: "sale",
        amount_cents: listing.price_cents + shipping,
        description: "Sale held in escrow",
      },
      {
        user_id: listing.seller_id,
        order_id: order.id,
        kind: "commission",
        amount_cents: -commission,
        description: `Verdant commission (${(bps / 100).toFixed(1)}%)`,
      },
    ]);

    await supabaseAdmin.from("notifications").insert({
      user_id: listing.seller_id,
      kind: "order_placed",
      actor_id: context.userId,
      title: "New order",
      body: `Someone bought "${listing.title}"`,
      link: `/marketplace/orders/${order.id}`,
    });

    return order;
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function adjustWallet(admin: any, userId: string, delta: { available?: number; pending?: number }) {
  const { data: wallet } = await admin.from("wallets").select("*").eq("user_id", userId).maybeSingle();
  const available = (wallet?.available_cents ?? 0) + (delta.available ?? 0);
  const pending = (wallet?.pending_cents ?? 0) + (delta.pending ?? 0);
  if (wallet) {
    await admin.from("wallets").update({ available_cents: available, pending_cents: pending }).eq("user_id", userId);
  } else {
    await admin.from("wallets").insert({ user_id: userId, available_cents: available, pending_cents: pending });
  }
  return { available, pending };
}

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("marketplace_orders")
      .select("*, marketplace_listings(title, cover_photo_path)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((o) => ({ ...o, role: o.buyer_id === context.userId ? "buyer" : "seller" }));
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("marketplace_orders")
      .select("*, marketplace_listings(title, cover_photo_path, size, country_code)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const { data: events } = await context.supabase
      .from("order_events")
      .select("*")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true });

    const { data: profiles } = await context.supabase.rpc("marketplace_sellers_by_ids", {
      _ids: [order.buyer_id, order.seller_id],
    });
    const map: Record<string, { username: string | null; display_name: string | null }> = {};
    for (const p of (profiles ?? []) as { id: string; username: string | null; display_name: string | null }[]) {
      map[p.id] = { username: p.username, display_name: p.display_name };
    }

    return {
      order,
      events: events ?? [],
      buyer: map[order.buyer_id] ?? null,
      seller: map[order.seller_id] ?? null,
      role: order.buyer_id === context.userId ? ("buyer" as const) : ("seller" as const),
    };
  });

export const advanceOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["accept", "ready", "ship", "deliver", "complete", "cancel"]),
        carrier: z.string().max(80).nullable().default(null),
        tracking_number: z.string().max(120).nullable().default(null),
        pickup_address: z.string().max(300).nullable().default(null),
        pickup_slot: z.string().nullable().default(null),
        note: z.string().max(300).nullable().default(null),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("marketplace_orders")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const isSeller = order.seller_id === context.userId;
    const isBuyer = order.buyer_id === context.userId;
    if (!isSeller && !isBuyer) throw new Error("Not your order");

    const now = new Date().toISOString();
    type OrderPatch = {
      status?: "placed" | "accepted" | "ready" | "in_transit" | "delivered" | "completed" | "cancelled";
      accepted_at?: string;
      ready_at?: string;
      shipped_at?: string;
      delivered_at?: string;
      completed_at?: string;
      cancelled_at?: string;
      carrier?: string | null;
      tracking_number?: string | null;
      pickup_address?: string;
      pickup_slot?: string;
    };
    const patch: OrderPatch = {};
    let nextStatus: NonNullable<OrderPatch["status"]>;

    switch (data.action) {
      case "accept":
        if (!isSeller) throw new Error("Only the seller can accept");
        nextStatus = "accepted";
        patch.accepted_at = now;
        if (data.pickup_address) patch.pickup_address = data.pickup_address;
        if (data.pickup_slot) patch.pickup_slot = data.pickup_slot;
        break;
      case "ready":
        if (!isSeller) throw new Error("Only the seller can update this");
        nextStatus = "ready";
        patch.ready_at = now;
        if (data.pickup_slot) patch.pickup_slot = data.pickup_slot;
        break;
      case "ship":
        if (!isSeller) throw new Error("Only the seller can update this");
        nextStatus = "in_transit";
        patch.shipped_at = now;
        patch.carrier = data.carrier;
        patch.tracking_number = data.tracking_number;
        break;
      case "deliver":
        nextStatus = "delivered";
        patch.delivered_at = now;
        break;
      case "complete":
        if (!isBuyer) throw new Error("Only the buyer confirms receipt");
        nextStatus = "completed";
        patch.completed_at = now;
        break;
      case "cancel":
        if (["completed", "refunded"].includes(order.status)) throw new Error("Order already finished");
        nextStatus = "cancelled";
        patch.cancelled_at = now;
        break;
    }
    patch.status = nextStatus;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uErr } = await supabaseAdmin.from("marketplace_orders").update(patch).eq("id", order.id);
    if (uErr) throw new Error(uErr.message);
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      status: nextStatus,
      actor_id: context.userId,
      note: data.note,
    });

    const sellerNet = order.item_cents - order.commission_cents + order.shipping_cents;

    if (nextStatus === "completed") {
      await adjustWallet(supabaseAdmin, order.seller_id, { pending: -sellerNet, available: sellerNet });
      await supabaseAdmin.from("marketplace_listings").update({ status: "sold", sold_at: now }).eq("id", order.listing_id);
    }
    if (nextStatus === "cancelled") {
      await adjustWallet(supabaseAdmin, order.seller_id, { pending: -sellerNet });
      await supabaseAdmin.from("wallet_transactions").insert({
        user_id: order.seller_id,
        order_id: order.id,
        kind: "refund",
        amount_cents: -sellerNet,
        description: "Order cancelled — escrow released back to buyer",
      });
      await supabaseAdmin.from("marketplace_listings").update({ status: "active" }).eq("id", order.listing_id);
    }

    const notifyUser = context.userId === order.buyer_id ? order.seller_id : order.buyer_id;
    await supabaseAdmin.from("notifications").insert({
      user_id: notifyUser,
      kind: "order_update",
      actor_id: context.userId,
      title: "Order update",
      body: `Order is now: ${nextStatus.replace("_", " ")}`,
      link: `/marketplace/orders/${order.id}`,
    });

    return { ok: true, status: nextStatus };
  });
