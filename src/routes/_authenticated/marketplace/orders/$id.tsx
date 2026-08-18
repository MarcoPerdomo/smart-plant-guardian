import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getOrder, advanceOrder } from "@/lib/marketplace.functions";
import { euros, statusLabel, ORDER_STEPS } from "@/lib/marketplace-shared";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, Truck, MapPin, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/marketplace/orders/$id")({
  component: OrderDetail,
  head: () => ({
    meta: [
      { title: "Order — Verdant Marketplace" },
      { name: "description", content: "Order status, escrow state and delivery timeline for your marketplace purchase." },
      { property: "og:title", content: "Order — Verdant Marketplace" },
      { property: "og:description", content: "Order status, escrow state and delivery timeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function OrderDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => getOrder({ data: { id } }) });

  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupSlot, setPickupSlot] = useState("");

  const act = useMutation({
    mutationFn: (action: "accept" | "ready" | "ship" | "deliver" | "complete" | "cancel") =>
      advanceOrder({
        data: {
          id,
          action,
          carrier: carrier || null,
          tracking_number: tracking || null,
          pickup_address: pickupAddress || null,
          pickup_slot: pickupSlot || null,
          note: null,
        },
      }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["my_orders"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading order…</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Order not found.</div>;

  const { order, events, role, buyer, seller } = data;
  const listing = order.marketplace_listings as { title?: string } | null;
  const stepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
  const isSeller = role === "seller";
  const isBuyer = role === "buyer";
  const shipping = order.delivery_method === "shipping";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">{listing?.title ?? "Order"}</h1>
        <p className="text-sm text-muted-foreground">
          {isBuyer ? `From @${seller?.username ?? "grower"}` : `To @${buyer?.username ?? "buyer"}`} ·{" "}
          {format(new Date(order.created_at), "d MMM yyyy")}
        </p>
      </div>

      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="w-4 h-4 text-primary" />
          {statusLabel(order.status)}
          <span className="ml-auto text-xs px-2 py-1 rounded-md bg-warning/15 text-warning-foreground">Test mode escrow</span>
        </div>
        <ol className="mt-4 grid grid-cols-6 gap-1 text-[10px] text-center">
          {ORDER_STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? "text-primary" : "text-muted-foreground"}>
              <div className={`h-1.5 rounded-full mb-1 ${i <= stepIndex ? "bg-primary" : "bg-muted"}`} />
              {statusLabel(s)}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-border p-5 space-y-2 text-sm">
        <Row label="Plant" value={euros(order.item_cents)} />
        <Row label="Shipping" value={euros(order.shipping_cents)} />
        <Row label="Verdant commission" value={`-${euros(order.commission_cents)}`} muted />
        <Row label={isBuyer ? "You paid" : "Buyer paid"} value={euros(order.total_cents)} bold />
        {isSeller && (
          <Row
            label="Your net (released on completion)"
            value={euros(order.item_cents - order.commission_cents + order.shipping_cents)}
            bold
          />
        )}
        <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
          {shipping ? <Truck className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
          {shipping ? "Shipping" : "Local pickup"}
          {order.expected_delivery ? ` · expected ${format(new Date(order.expected_delivery), "d MMM")}` : ""}
        </div>
        {order.tracking_number && (
          <div className="text-xs text-muted-foreground">Tracking: {order.carrier} {order.tracking_number}</div>
        )}
        {order.pickup_address && <div className="text-xs text-muted-foreground">Pickup: {order.pickup_address}</div>}
        {order.buyer_note && <div className="text-xs text-muted-foreground">Buyer note: {order.buyer_note}</div>}
      </div>

      <div className="rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold">Next step</h2>

        {isSeller && order.status === "placed" && (
          <div className="space-y-2">
            {!shipping && (
              <>
                <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} placeholder="Pickup address" className={input} />
                <input value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)} placeholder="Pickup window, e.g. Sat 10:00–14:00" className={input} />
              </>
            )}
            <Action onClick={() => act.mutate("accept")} disabled={act.isPending}>Accept order</Action>
          </div>
        )}

        {isSeller && order.status === "accepted" && (
          <Action onClick={() => act.mutate("ready")} disabled={act.isPending}>Mark ready</Action>
        )}

        {isSeller && order.status === "ready" && shipping && (
          <div className="space-y-2">
            <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (PostNL, DHL, bpost…)" className={input} />
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className={input} />
            <Action onClick={() => act.mutate("ship")} disabled={act.isPending}>Mark shipped</Action>
          </div>
        )}

        {order.status === "ready" && !shipping && (
          <Action onClick={() => act.mutate("deliver")} disabled={act.isPending}>Mark handed over</Action>
        )}

        {order.status === "in_transit" && (
          <Action onClick={() => act.mutate("deliver")} disabled={act.isPending}>Mark delivered</Action>
        )}

        {isBuyer && order.status === "delivered" && (
          <Action onClick={() => act.mutate("complete")} disabled={act.isPending}>
            <Check className="w-4 h-4" /> Confirm received & release funds
          </Action>
        )}

        {["completed", "cancelled"].includes(order.status) ? (
          <p className="text-sm text-muted-foreground">This order is {order.status}.</p>
        ) : (
          <button onClick={() => act.mutate("cancel")} disabled={act.isPending} className="text-xs text-muted-foreground hover:text-destructive">
            Cancel order
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border p-5">
        <h2 className="font-display text-lg font-semibold">Timeline</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between gap-3">
              <span>{statusLabel(e.status)}{e.note ? ` — ${e.note}` : ""}</span>
              <span className="text-xs text-muted-foreground shrink-0">{format(new Date(e.created_at), "d MMM HH:mm")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const input = "w-full px-3 py-2 rounded-md border border-border bg-background text-sm";

function Action({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
