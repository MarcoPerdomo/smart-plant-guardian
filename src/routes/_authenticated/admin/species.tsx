import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { adminListSpecies, adminUpdateSpecies } from "@/lib/admin.functions";
import { ArchiveDialog } from "@/components/admin-archive-dialog";
import { Search, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/species")({
  component: AdminSpecies,
  head: () => ({
    meta: [
      { title: "Species catalog — Verdant admin" },
      { name: "description", content: "Edit plant species care data and archive bad catalog rows." },
    ],
  }),
});

function AdminSpecies() {
  const [q, setQ] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const { data: species, isLoading } = useQuery({
    queryKey: ["admin", "species", q, includeArchived],
    queryFn: () => adminListSpecies({ data: { q, includeArchived } }),
  });

  async function save() {
    if (!editing) return;
    setBusy(true);
    try {
      await adminUpdateSpecies({
        data: {
          id: editing.id,
          common_name: editing.common_name,
          scientific_name: editing.scientific_name || null,
          light: editing.light || null,
          water_frequency_days:
            editing.water_frequency_days === "" || editing.water_frequency_days === null
              ? null
              : Number(editing.water_frequency_days),
          care_tips: editing.care_tips || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["admin", "species"] });
      toast.success("Species updated");
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search catalog"
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
        <span className="text-sm text-muted-foreground">{species?.length ?? 0} rows</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading catalog…</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border max-h-[70vh] overflow-y-auto">
          {(species ?? []).map((s: any) => (
            <div key={s.id} className="p-3 flex items-center gap-3 justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {s.common_name}
                  {s.archived_at && <span className="ml-2 text-xs text-muted-foreground">(archived)</span>}
                </div>
                <div className="text-sm text-muted-foreground truncate italic">
                  {s.scientific_name ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {s.light ?? "light ?"} · water every {s.water_frequency_days ?? "?"}d ·{" "}
                  {s.image_url ? "has image" : "no image"}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditing({ ...s })}
                  className="px-2.5 py-1.5 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-muted"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                {!s.archived_at && (
                  <button
                    onClick={() => setTarget({ id: s.id, label: s.common_name })}
                    className="px-2.5 py-1.5 rounded-md border border-border text-xs flex items-center gap-1 hover:bg-muted"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 space-y-3">
            <h2 className="font-display text-lg font-semibold">Edit species</h2>
            {[
              ["common_name", "Common name"],
              ["scientific_name", "Scientific name"],
              ["light", "Light"],
              ["water_frequency_days", "Water frequency (days)"],
            ].map(([field, label]) => (
              <label key={field} className="block text-sm">
                <span className="text-muted-foreground">{label}</span>
                <input
                  value={editing[field] ?? ""}
                  onChange={(e) => setEditing({ ...editing, [field]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            ))}
            <label className="block text-sm">
              <span className="text-muted-foreground">Care tips</span>
              <textarea
                rows={4}
                value={editing.care_tips ?? ""}
                onChange={(e) => setEditing({ ...editing, care_tips: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-3 py-2 rounded-md text-sm hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ArchiveDialog
        open={!!target}
        onClose={() => setTarget(null)}
        entityType="species"
        id={target?.id ?? ""}
        label={target?.label ?? ""}
        onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })}
      />
    </div>
  );
}
