import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listMyOrders } from "@/lib/marketplace.functions";
import { euros, statusLabel } from "@/lib/marketplace-shared";
import { PackageCheck } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/marketplace/orders/")({
  component: Orders,
  head: () => ({
    meta: [
      { title: "Orders — Verdant Marketplace" },
      { name: "description", content: "Track the plants you have bought and sold on Verdant." },
      { property: "og:title", content: "Orders — Verdant Marketplace" },
      { property: "og:description", content: "Track the plants you have bought and sold on Verdant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Orders() {
  const { data, isLoading } = useQuery({ queryKey: ["my_orders"], queryFn: () => listMyOrders() });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">Everything you have bought and sold</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <PackageCheck className="w-10 h-10 mx-auto text-primary/40" />
          <h2 className="mt-3 font-display text-xl font-semibold">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your marketplace activity will show up here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {data.map((o) => (
            <Link
              key={o.id}
              to="/marketplace/orders/$id"
              params={{ id: o.id }}
              className="rounded-xl border border-border p-4 flex items-center justify-between gap-4 hover:border-primary/50"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {(o.marketplace_listings as { title?: string } | null)?.title ?? "Listing"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {o.role === "buyer" ? "Bought" : "Sold"} · {format(new Date(o.created_at), "d MMM yyyy")} · {o.delivery_method}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold">{euros(o.total_cents)}</div>
                <div className="text-xs text-muted-foreground">{statusLabel(o.status)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
