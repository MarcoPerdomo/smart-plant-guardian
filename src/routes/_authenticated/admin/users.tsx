import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { searchUsers, grantRole, revokeRole, amIAdmin } from "@/lib/admin.functions";
import { Search, Shield, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
  head: () => ({
    meta: [
      { title: "Users & roles — Verdant admin" },
      { name: "description", content: "Search accounts and manage admin, moderator and user roles." },
    ],
  }),
});

const ROLES = ["admin", "moderator", "user"] as const;
type Role = (typeof ROLES)[number];

function AdminUsers() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();

  const me = useQuery({ queryKey: ["admin", "me"], queryFn: () => amIAdmin() });
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users", q],
    queryFn: () => searchUsers({ data: { q } }),
  });

  async function toggle(userId: string, role: Role, has: boolean) {
    const key = `${userId}:${role}`;
    setBusy(key);
    try {
      if (has) await revokeRole({ data: { user_id: userId, role } });
      else await grantRole({ data: { user_id: userId, role } });
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(has ? `Removed ${role}` : `Granted ${role}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email or name"
          className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : (users?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {users!.map((u: any) => (
            <div key={u.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">{u.display_name ?? "—"}</div>
                <div className="text-sm text-muted-foreground truncate">{u.email ?? u.id}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Joined {new Date(u.created_at).toLocaleDateString()} · {u.plant_count} plant
                  {u.plant_count === 1 ? "" : "s"} · {u.roles.length ? u.roles.join(", ") : "no roles"}
                </div>
              </div>
              <div className="flex gap-1.5">
                {ROLES.map((role) => {
                  const has = u.roles.includes(role);
                  const self = me.data?.userId === u.id && role === "admin";
                  const key = `${u.id}:${role}`;
                  return (
                    <button
                      key={role}
                      disabled={busy === key || (has && self)}
                      onClick={() => toggle(u.id, role, has)}
                      title={has && self ? "You cannot remove your own admin role" : undefined}
                      className={`px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1 border disabled:opacity-50 ${
                        has
                          ? "border-primary text-primary bg-primary/10"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {has ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
