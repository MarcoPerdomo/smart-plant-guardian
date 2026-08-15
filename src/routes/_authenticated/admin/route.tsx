import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { amIAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      const { isAdmin } = await amIAdmin();
      if (!isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as any)) throw e;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/users", label: "Users & roles" },
  { to: "/admin/plants", label: "Plants" },
  { to: "/admin/species", label: "Species" },
  { to: "/admin/plants/import", label: "Import" },
  { to: "/admin/archive", label: "Archive" },
] as const;

function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Restricted area — admin role required.</p>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-border pb-2 text-sm">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: (t as any).exact ?? false }}
            className="px-3 py-1.5 rounded-md hover:bg-muted"
            activeProps={{ className: "px-3 py-1.5 rounded-md bg-muted text-primary" }}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
