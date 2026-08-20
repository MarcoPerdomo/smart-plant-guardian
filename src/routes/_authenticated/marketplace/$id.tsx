import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getListing, placeOrder, setListingStatus } from "@/lib/marketplace.functions";
import { euros, sizeLabel, ageLabel, healthLabel, quote, DISCLOSURE_KINDS } from "@/lib/marketplace-shared";
import { Leaf, ShieldCheck, Truck, MapPin, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/marketplace/$id")({
  component: ListingDetail,
  head: ({ params }) => ({
    meta: [
      { title: "Plant listing — Verdant Marketplace" },
      { name: "description", content: "Full care history, disclosures and delivery options for this plant." },
      { property: "og:title", content: "Plant listing — Verdant Marketplace" },
      { property: "og:description", content: "Full care history, disclosures and delivery options for this plant." },
      { property: "og:url", content: `https://verdant-nl.app/marketplace/${params.id}` },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `https://verdant-nl.app/marketplace/${params.id}` }],
  }),
});

function ListingDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["listing", id], queryFn: () => getListing({ data: { id } }) });

  const [method, setMethod] = useState<"pickup" | "shipping">("pickup");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const buyMut = useMutation({
    mutationFn: () =>
      placeOrder({
        data: {
          listing_id: id,
          delivery_method: method,
          buyer_address: method === "shipping" ? address : null,
          buyer_note: note || null,
          pickup_slot: null,
        },
      }),
    onSuccess: (order) => {
      toast.success("Order placed — funds held in escrow (test mode)");
      qc.invalidateQueries({ queryKey: ["listing", id] });
      navigate({ to: "/marketplace/orders/$id", params: { id: order.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: (status: "draft" | "active" | "archived") => setListingStatus({ data: { id, status } }),
    onSuccess: () => { toast.success("Listing updated"); qc.invalidateQueries({ queryKey: ["listing", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading listing…</div>;
  if (!data) return <div className="text-muted-foreground text-sm">Listing not found.</div>;

  const { listing, disclosures, photos, seller, commission_bps, is_mine } = data;
  const species = listing.plant_species as { common_name?: string; scientific_name?: string | null; light?: string | null; care_tips?: string | null } | null;
  const shipping = method === "shipping" ? listing.shipping_cents : 0;
  const q = quote({ itemCents: listing.price_cents, shippingCents: shipping, commissionBps: commission_bps });
  const available = listing.status === "active";

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description ?? species?.care_tips ?? "Houseplant listed on the Verdant marketplace.",
    ...(listing.cover_url ? { image: [listing.cover_url] } : {}),
    ...(species?.common_name ? { category: species.common_name } : {}),
    offers: {
      "@type": "Offer",
      url: `https://verdant-nl.app/marketplace/${id}`,
      price: (listing.price_cents / 100).toFixed(2),
      priceCurrency: "EUR",
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <div className="aspect-[16/10] bg-muted flex items-center justify-center">
            {listing.cover_url ? (
              <img src={listing.cover_url} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <Leaf className="w-12 h-12 text-primary/30" />
            )}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-3xl font-semibold">{listing.title}</h1>
                <p className="text-sm text-muted-foreground">{species?.common_name ?? "Unknown species"}{species?.scientific_name ? ` · ${species.scientific_name}` : ""}</p>
              </div>
              <div className="text-2xl font-semibold">{euros(listing.price_cents)}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Chip>{sizeLabel(listing.size)}</Chip>
              <Chip>{ageLabel(listing.age_months)}</Chip>
              <Chip>Health: {healthLabel(listing.health_rating)}</Chip>
              <Chip>{listing.country_code}</Chip>
              {listing.allow_pickup && <Chip><MapPin className="w-3 h-3 inline mr-1" />Pickup</Chip>}
              {listing.allow_shipping && <Chip><Truck className="w-3 h-3 inline mr-1" />Ships {euros(listing.shipping_cents)}</Chip>}
            </div>
            {listing.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>}
          </div>
        </div>

        <section className="rounded-2xl border border-border p-5">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> Transparency
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Every issue the grower logged for this plant.</p>
          {disclosures.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No issues disclosed by the seller.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {disclosures.map((d) => (
                <li key={d.id} className="rounded-lg border border-border p-3 text-sm flex gap-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-warning shrink-0" />
                  <div>
                    <div className="font-medium">
                      {DISCLOSURE_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind}
                      {d.occurred_on ? ` · ${format(new Date(d.occurred_on), "d MMM yyyy")}` : ""}
                      {d.resolved_on ? ` → resolved ${format(new Date(d.resolved_on), "d MMM yyyy")}` : ""}
                    </div>
                    <div className="text-muted-foreground">{d.description}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {photos.length > 0 && (
          <section className="rounded-2xl border border-border p-5">
            <h2 className="font-display text-xl font-semibold">Photo history</h2>
            <div className="mt-4 grid grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((p) => (
                <figure key={p.id} className="space-y-1">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                    {p.url && <img src={p.url} alt={p.caption ?? "Plant photo"} className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <figcaption className="text-[10px] text-muted-foreground">{format(new Date(p.taken_at), "d MMM yyyy")}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {species?.care_tips && (
          <section className="rounded-2xl border border-border p-5">
            <h2 className="font-display text-xl font-semibold">Care profile</h2>
            {species.light && <p className="mt-2 text-sm"><span className="text-muted-foreground">Light:</span> {species.light}</p>}
            <p className="mt-2 text-sm leading-relaxed">{species.care_tips}</p>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border p-5 sticky top-20">
          <div className="text-xs px-2 py-1 rounded-md bg-warning/15 text-warning-foreground inline-block">
            Test mode — no real money moves
          </div>

          {seller && (
            <div className="mt-4 text-sm">
              <div className="text-muted-foreground text-xs">Seller</div>
              <Link to="/u/$username" params={{ username: seller.username ?? "" }} className="font-medium hover:text-primary">
                @{seller.username ?? "grower"}
              </Link>
              <div className="text-xs text-muted-foreground">
                {seller.country_code ?? "—"} · member since {format(new Date(seller.member_since), "MMM yyyy")}
              </div>
            </div>
          )}

          {is_mine ? (
            <div className="mt-5 space-y-2">
              <p className="text-sm text-muted-foreground">This is your listing ({listing.status}).</p>
              {listing.status !== "active" && (
                <button onClick={() => statusMut.mutate("active")} className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm">
                  Publish
                </button>
              )}
              {listing.status === "active" && (
                <button onClick={() => statusMut.mutate("draft")} className="w-full py-2 rounded-md border border-border text-sm">
                  Unpublish
                </button>
              )}
              <button onClick={() => statusMut.mutate("archived")} className="w-full py-2 rounded-md border border-border text-sm text-muted-foreground">
                Archive
              </button>
            </div>
          ) : !available ? (
            <p className="mt-5 text-sm text-muted-foreground">This plant is {listing.status} and not available right now.</p>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="text-xs text-muted-foreground">Delivery</div>
                {listing.allow_pickup && (
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={method === "pickup"} onChange={() => setMethod("pickup")} /> Local pickup (free)
                  </label>
                )}
                {listing.allow_shipping && (
                  <label className="flex items-center gap-2">
                    <input type="radio" checked={method === "shipping"} onChange={() => setMethod("shipping")} /> Shipped · {euros(listing.shipping_cents)}
                  </label>
                )}
              </div>

              {method === "shipping" && (
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Delivery address"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                />
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note to the seller (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              />

              <dl className="text-sm space-y-1 border-t border-border pt-3">
                <Row label="Plant" value={euros(q.itemCents)} />
                <Row label="Shipping" value={euros(q.shippingCents)} />
                <Row label={`Verdant fee (${(commission_bps / 100).toFixed(1)}% seller-side)`} value={`-${euros(q.commissionCents)}`} muted />
                <Row label="You pay" value={euros(q.totalCents)} bold />
              </dl>

              <button
                onClick={() => buyMut.mutate()}
                disabled={buyMut.isPending}
                className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {buyMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Buy now (simulated)
              </button>
              <p className="text-[11px] text-muted-foreground">
                Funds stay in escrow until you confirm the plant arrived.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">{children}</span>;
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
