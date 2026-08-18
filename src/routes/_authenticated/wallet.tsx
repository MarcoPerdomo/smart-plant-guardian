import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getWallet, requestPayout } from "@/lib/wallet.functions";
import { euros } from "@/lib/marketplace-shared";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wallet as WalletIcon, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
  head: () => ({
    meta: [
      { title: "Wallet — Verdant" },
      { name: "description", content: "Your marketplace balance, escrow funds, transactions and payout requests." },
      { property: "og:title", content: "Wallet — Verdant" },
      { property: "og:description", content: "Your marketplace balance, escrow funds and payouts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function WalletPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["wallet"], queryFn: () => getWallet() });
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");

  const payoutMut = useMutation({
    mutationFn: () => requestPayout({ data: { amount_cents: Math.round(Number(amount || 0) * 100), iban_last4: iban } }),
    onSuccess: () => {
      toast.success("Payout requested");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading wallet…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Wallet</h1>
        <p className="text-sm text-muted-foreground">Simulated funds — no real money moves in test mode.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Available</div>
          <div className="mt-1 font-display text-3xl font-semibold">{euros(data?.available_cents ?? 0)}</div>
        </div>
        <div className="rounded-2xl border border-border p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">In escrow</div>
          <div className="mt-1 font-display text-3xl font-semibold text-muted-foreground">{euros(data?.pending_cents ?? 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">Released when the buyer confirms delivery.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <WalletIcon className="w-4 h-4 text-primary" /> Request a payout
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="Amount €" className={input} />
          <input value={iban} onChange={(e) => setIban(e.target.value)} inputMode="numeric" maxLength={4} placeholder="IBAN last 4" className={input} />
          <button
            onClick={() => payoutMut.mutate()}
            disabled={payoutMut.isPending || !amount || iban.length !== 4}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {payoutMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Request
          </button>
        </div>
        {(data?.payouts.length ?? 0) > 0 && (
          <ul className="text-sm divide-y divide-border">
            {data!.payouts.map((p) => (
              <li key={p.id} className="py-2 flex justify-between">
                <span>{euros(p.amount_cents)} · IBAN ••••{p.iban_last4}</span>
                <span className="text-xs text-muted-foreground">{p.status} · {format(new Date(p.created_at), "d MMM")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border p-5">
        <h2 className="font-display text-lg font-semibold">Transactions</h2>
        {(data?.transactions.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data!.transactions.map((t) => (
              <li key={t.id} className="py-2 flex justify-between gap-3">
                <div>
                  <div>{t.description ?? t.kind}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(t.created_at), "d MMM yyyy HH:mm")}</div>
                </div>
                <div className={t.amount_cents < 0 ? "text-muted-foreground" : "text-success font-medium"}>
                  {t.amount_cents < 0 ? "-" : "+"}{euros(Math.abs(t.amount_cents))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const input = "w-full px-3 py-2 rounded-md border border-border bg-background text-sm";
