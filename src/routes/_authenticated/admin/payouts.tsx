import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListPayouts, adminProcessPayout } from "@/lib/wallet.functions";
import { euros } from "@/lib/marketplace-shared";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  component: AdminPayouts,
  head: () => ({
    meta: [
      { title: "Payouts — Verdant Admin" },
      { name: "description", content: "Review and process marketplace payout requests." },
      { property: "og:title", content: "Payouts — Verdant Admin" },
      { property: "og:description", content: "Review and process marketplace payout requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AdminPayouts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin_payouts"], queryFn: () => adminListPayouts() });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "paid" | "rejected" }) =>
      adminProcessPayout({ data: { id: v.id, status: v.status, admin_note: null } }),
    onSuccess: () => { toast.success("Payout updated"); qc.invalidateQueries({ queryKey: ["admin_payouts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading payouts…</div>;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold">Payout requests</h2>
      {!data || data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No payout requests.</p>
      ) : (
        <div className="grid gap-3">
          {data.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{euros(p.amount_cents)} · IBAN ••••{p.iban_last4}</div>
                <div className="text-xs text-muted-foreground">
                  @{p.user?.username ?? "user"} · {format(new Date(p.created_at), "d MMM yyyy")} · {p.status}
                </div>
              </div>
              {p.status === "requested" && (
                <div className="flex gap-2 text-sm">
                  <button onClick={() => mut.mutate({ id: p.id, status: "approved" })} className="px-3 py-1.5 rounded-md border border-border hover:bg-muted">Approve</button>
                  <button onClick={() => mut.mutate({ id: p.id, status: "paid" })} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground">Mark paid</button>
                  <button onClick={() => mut.mutate({ id: p.id, status: "rejected" })} className="px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive">Reject</button>
                </div>
              )}
              {p.status === "approved" && (
                <button onClick={() => mut.mutate({ id: p.id, status: "paid" })} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm">Mark paid</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
