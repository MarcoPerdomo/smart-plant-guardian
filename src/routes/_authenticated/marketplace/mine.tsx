import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyListings } from "@/lib/marketplace.functions";
import { euros, sizeLabel } from "@/lib/marketplace-shared";
import { Leaf, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace/mine")({
  component: MyListings,
  head: () => ({
    meta: [
      { title: "My listings — Verdant Marketplace" },
      { name: "description", content: "Manage the plants you have listed for sale on Verdant." },
      { property: "og:title", content: "My listings — Verdant Marketplace" },
      { property: "og:description", content: "Manage the plants you have listed for sale on Verdant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const statusStyle: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-success/15 text-success",
  reserved: "bg-warning/20 text-warning-foreground",
  sold: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground",
};

function MyListings() {
  const { data, isLoading } = useQuery({ queryKey: ["my_listings"], queryFn: () => listMyListings() });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">My listings</h1>
          <p className="text-sm text-muted-foreground">Plants you are offering to the community</p>
        </div>
        <Link to="/marketplace/new" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" /> New listing
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Leaf className="w-10 h-10 mx-auto text-primary/40" />
          <h2 className="mt-3 font-display text-xl font-semibold">No listings yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">List a plant from your garden to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map((l) => (
            <Link
              key={l.id}
              to="/marketplace/$id"
              params={{ id: l.id }}
              className="rounded-xl border border-border p-4 flex items-center gap-4 hover:border-primary/50"
            >
              <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {l.cover_url ? <img src={l.cover_url} alt={l.title} className="w-full h-full object-cover" /> : <Leaf className="w-6 h-6 text-primary/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.title}</div>
                <div className="text-xs text-muted-foreground">{sizeLabel(l.size)} · {l.country_code}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{euros(l.price_cents)}</div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusStyle[l.status] ?? "bg-muted"}`}>{l.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
