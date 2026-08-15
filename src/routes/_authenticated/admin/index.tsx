import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats } from "@/lib/admin.functions";
import { Users, Leaf, Sprout, Image as ImageIcon, Archive } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
  head: () => ({
    meta: [
      { title: "Admin overview — Verdant" },
      { name: "description", content: "Admin overview of users, plants and catalog data." },
    ],
  }),
});

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function AdminHome() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => getAdminStats(),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Stat icon={<Users className="w-3.5 h-3.5" />} label="Users" value={isLoading ? "…" : data?.users ?? 0} />
        <Stat icon={<Leaf className="w-3.5 h-3.5" />} label="Plants" value={isLoading ? "…" : data?.plants ?? 0} />
        <Stat icon={<Sprout className="w-3.5 h-3.5" />} label="Species" value={isLoading ? "…" : data?.species ?? 0} />
        <Stat icon={<ImageIcon className="w-3.5 h-3.5" />} label="Photos" value={isLoading ? "…" : data?.photos ?? 0} />
        <Stat icon={<Archive className="w-3.5 h-3.5" />} label="Archived" value={isLoading ? "…" : data?.archived ?? 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link to="/admin/users" className="rounded-lg border border-border p-4 hover:bg-muted/50">
          <div className="font-medium">Users &amp; roles</div>
          <p className="text-sm text-muted-foreground">Search accounts and grant or remove roles.</p>
        </Link>
        <Link to="/admin/plants" className="rounded-lg border border-border p-4 hover:bg-muted/50">
          <div className="font-medium">Plants</div>
          <p className="text-sm text-muted-foreground">Browse every user's plants and archive problem entries.</p>
        </Link>
        <Link to="/admin/species" className="rounded-lg border border-border p-4 hover:bg-muted/50">
          <div className="font-medium">Species catalog</div>
          <p className="text-sm text-muted-foreground">Edit care data, spot missing images, archive bad rows.</p>
        </Link>
        <Link to="/admin/archive" className="rounded-lg border border-border p-4 hover:bg-muted/50">
          <div className="font-medium">Archive</div>
          <p className="text-sm text-muted-foreground">Audit trail of archived records, with restore.</p>
        </Link>
      </div>
    </div>
  );
}
