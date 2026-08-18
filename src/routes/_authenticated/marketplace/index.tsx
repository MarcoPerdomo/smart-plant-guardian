import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { searchListings } from "@/lib/marketplace.functions";
import { MARKETPLACE_COUNTRIES, PLANT_SIZES, euros, sizeLabel, ageLabel, healthLabel } from "@/lib/marketplace-shared";
import { Leaf, Search, Store, Wallet, PackageCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace/")({
  component: MarketplaceBrowse,
  head: () => ({
    meta: [
      { title: "Plant Marketplace — Verdant" },
      { name: "description", content: "Browse plants for sale from fellow growers in the Netherlands, Belgium and Germany." },
      { property: "og:title", content: "Plant Marketplace — Verdant" },
      { property: "og:description", content: "Buy and sell houseplants with full care history transparency." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function MarketplaceBrowse() {
  const [q, setQ] = useState("");
  const [size, setSize] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [delivery, setDelivery] = useState<"any" | "pickup" | "shipping">("any");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minHealth, setMinHealth] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["listings", q, size, country, delivery, maxPrice, minHealth],
    queryFn: () =>
      searchListings({
        data: {
          q,
          size: (size || null) as never,
          country: (country || null) as never,
          delivery,
          max_price_cents: maxPrice ? Math.round(Number(maxPrice) * 100) : null,
          min_health: minHealth ? Number(minHealth) : null,
          max_age_months: null,
        },
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Marketplace</h1>
          <p className="text-sm text-muted-foreground">Plants from fellow growers · NL · BE · DE</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link to="/marketplace/mine" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted">
            <Store className="w-4 h-4" /> My listings
          </Link>
          <Link to="/marketplace/orders" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-muted">
            <PackageCheck className="w-4 h-4" /> Orders
          </Link>
          <Link to="/wallet" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground">
            <Wallet className="w-4 h-4" /> Wallet
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4 grid gap-3 md:grid-cols-6">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Monstera, Calathea, aliases…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          <option value="">Any size</option>
          {PLANT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          <option value="">Any country</option>
          {MARKETPLACE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <select value={delivery} onChange={(e) => setDelivery(e.target.value as "any" | "pickup" | "shipping")} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          <option value="any">Pickup or shipping</option>
          <option value="pickup">Pickup only</option>
          <option value="shipping">Shipping available</option>
        </select>
        <div className="flex gap-2">
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            inputMode="decimal"
            placeholder="Max €"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          />
          <select value={minHealth} onChange={(e) => setMinHealth(e.target.value)} className="px-2 py-2 rounded-md border border-border bg-background text-sm">
            <option value="">Health</option>
            {[3, 4, 5].map((h) => (
              <option key={h} value={h}>{h}+</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground text-sm">Loading the greenhouse…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Leaf className="w-10 h-10 mx-auto text-primary/40" />
          <h2 className="mt-3 font-display text-xl font-semibold">Nothing for sale yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Be the first — list a plant from your garden.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((l) => (
            <Link
              key={l.id}
              to="/marketplace/$id"
              params={{ id: l.id }}
              className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                {l.cover_url ? (
                  <img src={l.cover_url} alt={l.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <Leaf className="w-10 h-10 text-primary/30" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-lg font-semibold">{l.title}</div>
                  <div className="font-semibold">{euros(l.price_cents)}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {(l.plant_species as { common_name?: string } | null)?.common_name ?? "Unknown species"}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <Tag>{sizeLabel(l.size)}</Tag>
                  <Tag>{ageLabel(l.age_months)}</Tag>
                  <Tag>{healthLabel(l.health_rating)}</Tag>
                  <Tag>{l.country_code}</Tag>
                  {l.allow_shipping && <Tag>Ships</Tag>}
                  {l.allow_pickup && <Tag>Pickup</Tag>}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  @{l.seller?.username ?? "grower"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{children}</span>;
}
