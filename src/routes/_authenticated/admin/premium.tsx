import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Crown, X } from "lucide-react";
import { searchUsers } from "@/lib/admin.functions";
import { listPremiumMembers, grantPremium, revokePremium } from "@/lib/premium.functions";

export const Route = createFileRoute("/_authenticated/admin/premium")({
  component: AdminPremium,
  head: () => ({
    meta: [
      { title: "Premium members — Verdant admin" },
      {
        name: "description",
        content: "Grant, review and revoke Verdant Premium access for members.",
      },
    ],
  }),
});

function fmt(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

function daysSince(d: string | null | undefined) {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

function AdminPremium() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ["admin", "premium"],
    queryFn: () => listPremiumMembers(),
  });
  const users = useQuery({
    queryKey: ["admin", "premium", "users", q],
    queryFn: () => searchUsers({ data: { q } }),
    enabled: q.trim().length > 0,
  });

  const rows = (members.data ?? []) as any[];
  const activeIds = useMemo(
    () => new Set(rows.filter((r) => r.state === "active").map((r) => r.user_id)),
    [rows],
  );
  const counts = useMemo(
    () => ({
      active: rows.filter((r) => r.state === "active").length,
      expired: rows.filter((r) => r.state === "expired").length,
      revoked: rows.filter((r) => r.state === "revoked").length,
    }),
    [rows],
  );

  async function grant(userId: string) {
    setBusy(userId);
    try {
      await grantPremium({
        data: { user_id: userId, expires_at: expiresAt || null, note: note || null },
      });
      await qc.invalidateQueries({ queryKey: ["admin", "premium"] });
      toast.success("Premium granted");
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  async function revoke(userId: string, grantId?: string) {
    setBusy(userId);
    try {
      await revokePremium({ data: { user_id: userId, grant_id: grantId } });
      await qc.invalidateQueries({ queryKey: ["admin", "premium"] });
      toast.success("Premium revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active members", value: counts.active },
          { label: "Expired grants", value: counts.expired },
          { label: "Revoked grants", value: counts.revoked },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-4">
            <div className="text-2xl font-semibold">{c.value}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Grant Premium</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email or name"
              className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            title="Optional end date — leave empty for open-ended Premium"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        {q.trim() && (
          <div className="rounded-lg border border-border divide-y divide-border">
            {users.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Searching…</p>
            ) : (users.data?.length ?? 0) === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No users found.</p>
            ) : (
              (users.data as any[]).map((u) => {
                const isActive = activeIds.has(u.id);
                return (
                  <div key={u.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{u.display_name ?? "—"}</div>
                      <div className="text-sm text-muted-foreground truncate">{u.email ?? u.id}</div>
                    </div>
                    {isActive ? (
                      <button
                        disabled={busy === u.id}
                        onClick={() => revoke(u.id)}
                        className="px-2.5 py-1.5 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-muted disabled:opacity-50"
                      >
                        <X className="w-3 h-3" /> Revoke
                      </button>
                    ) : (
                      <button
                        disabled={busy === u.id}
                        onClick={() => grant(u.id)}
                        className="px-2.5 py-1.5 rounded-md border border-primary text-primary bg-primary/10 text-xs flex items-center gap-1 disabled:opacity-50"
                      >
                        <Crown className="w-3 h-3" /> Grant Premium
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Premium history</h2>
        {members.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Premium grants yet.</p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {rows.map((g) => (
              <div key={g.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {g.user?.display_name ?? g.user?.email ?? g.user_id}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Granted {fmt(g.granted_at)} ({daysSince(g.granted_at)} days ago) · ends{" "}
                    {g.expires_at ? fmt(g.expires_at) : "no end date"}
                    {g.revoked_at ? ` · revoked ${fmt(g.revoked_at)}` : ""}
                    {g.granted_by_user
                      ? ` · by ${g.granted_by_user.display_name ?? g.granted_by_user.email}`
                      : ""}
                  </div>
                  {g.note && <div className="text-xs text-muted-foreground mt-0.5">{g.note}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs border ${
                      g.state === "active"
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {g.state}
                  </span>
                  {g.state === "active" && (
                    <button
                      disabled={busy === g.user_id}
                      onClick={() => revoke(g.user_id, g.id)}
                      className="px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
