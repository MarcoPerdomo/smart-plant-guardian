import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listArchive, restoreRecord } from "@/lib/admin.functions";
import { RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/archive")({
  component: AdminArchive,
  head: () => ({
    meta: [
      { title: "Archive — Verdant admin" },
      { name: "description", content: "Audit trail of archived plants and species, with restore." },
    ],
  }),
});

function AdminArchive() {
  const [includeRestored, setIncludeRestored] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin", "archive", includeRestored],
    queryFn: () => listArchive({ data: { includeRestored } }),
  });

  async function restore(id: string) {
    setBusy(id);
    try {
      await restoreRecord({ data: { archive_id: id } });
      await qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Restored");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeRestored}
          onChange={(e) => setIncludeRestored(e.target.checked)}
        />
        Include already restored
      </label>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading archive…</p>
      ) : (rows?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing archived yet.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {rows!.map((r: any) => (
            <div key={r.id} className="p-4 flex items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {r.label}{" "}
                  <span className="text-xs text-muted-foreground">({r.entity_type})</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Archived {new Date(r.archived_at).toLocaleString()}
                  {r.reason ? ` · ${r.reason}` : ""}
                  {r.restored_at ? ` · restored ${new Date(r.restored_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              {!r.restored_at && (
                <button
                  onClick={() => restore(r.id)}
                  disabled={busy === r.id}
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-muted disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" /> {busy === r.id ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
