// Client-safe shared constants and helpers for the marketplace.

export const MARKETPLACE_COUNTRIES = [
  { code: "NL", label: "Netherlands" },
  { code: "BE", label: "Belgium" },
  { code: "DE", label: "Germany" },
] as const;

export const PLANT_SIZES = [
  { value: "xs", label: "XS · under 15cm" },
  { value: "s", label: "S · 15–30cm" },
  { value: "m", label: "M · 30–60cm" },
  { value: "l", label: "L · 60–120cm" },
  { value: "xl", label: "XL · over 120cm" },
] as const;

export const BOX_SIZES = [
  { value: "s", label: "Small box (≤ 30cm)" },
  { value: "m", label: "Medium box (≤ 60cm)" },
  { value: "l", label: "Large box (≤ 100cm)" },
  { value: "xl", label: "XL box (over 100cm)" },
] as const;

export const DISCLOSURE_KINDS = [
  { value: "disease", label: "Disease" },
  { value: "pest", label: "Pest" },
  { value: "leaf_damage", label: "Leaf damage" },
  { value: "repot", label: "Repotted" },
  { value: "other", label: "Other" },
] as const;

export const ORDER_STEPS = [
  "placed",
  "accepted",
  "ready",
  "in_transit",
  "delivered",
  "completed",
] as const;

export type PlantSize = (typeof PLANT_SIZES)[number]["value"];

export function euros(cents: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

export function sizeLabel(size: string | null | undefined): string {
  if (!size) return "—";
  return PLANT_SIZES.find((s) => s.value === size)?.label.split(" · ")[0] ?? size.toUpperCase();
}

export function ageLabel(months: number | null | undefined): string {
  if (months == null) return "Unknown age";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years}y ${rest}m` : `${years}y`;
}

export function healthLabel(rating: number | null | undefined): string {
  if (!rating) return "Not rated";
  return ["Poor", "Fair", "Good", "Great", "Excellent"][rating - 1] ?? "Not rated";
}

/** Commission + totals. Mirrors the server-side pricing module. */
export function quote(opts: {
  itemCents: number;
  shippingCents: number;
  commissionBps: number;
}): { itemCents: number; shippingCents: number; commissionCents: number; totalCents: number; sellerNetCents: number } {
  const commissionCents = Math.round((opts.itemCents * opts.commissionBps) / 10000);
  const totalCents = opts.itemCents + opts.shippingCents;
  return {
    itemCents: opts.itemCents,
    shippingCents: opts.shippingCents,
    commissionCents,
    totalCents,
    sellerNetCents: opts.itemCents - commissionCents + opts.shippingCents,
  };
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    placed: "Order placed",
    accepted: "Accepted by seller",
    ready: "Ready for pickup / dispatch",
    in_transit: "In transit",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    refunded: "Refunded",
    disputed: "Disputed",
  };
  return map[status] ?? status;
}
