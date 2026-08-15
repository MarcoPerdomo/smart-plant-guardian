import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListPlants } from "@/lib/admin.functions";
import { ArchiveDialog } from "@/components/admin-archive-dialog";
import { Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/plants/")({
  component: AdminPlants,
  head: () => ({
    meta: [
      { title: "Plants — Verdant admin" },
      { name: "description", content: "Browse every user's plants and archive entries with an audit trail." },
    ],
  }),
});

function AdminPlants() {
  const [q, setQ] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null);
  const qc = useQueryClient();

  const { data: plants, isLoading } = useQuery({
    queryKey: ["admin", "plants", q, includeArchived],
    queryFn: () => adminListPlants({ data: { q, includeArchived } }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by nickname"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plants…</p>
      ) : (plants?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No plants found.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {plants!.map((p: any) => (
            <div key={p.id} className="p-4 flex items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {p.nickname}
                  {p.archived_at && (
                    <span className="ml-2 text-xs text-muted-foreground">(archived)</span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate">
                  {p.plant_species?.common_name ?? "Unknown species"}
                  {p.location ? ` · ${p.location}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {p.owner_email ?? p.owner_name ?? p.user_id}
                </div>
              </div>
              {!p.archived_at && (
                <button
                  onClick={() => setTarget({ id: p.id, label: p.nickname })}
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-muted"
                >
                  <Trash2 className="w-3 h-3" /> Archive
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ArchiveDialog
        open={!!target}
        onClose={() => setTarget(null)}
        entityType="plant"
        id={target?.id ?? ""}
        label={target?.label ?? ""}
        onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })}
      />
    </div>
  );
}
