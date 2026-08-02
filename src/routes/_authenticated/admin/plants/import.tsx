import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { batchImportSpecies } from "@/lib/plants.functions";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/plants/import")({
  component: ImportPlants,
  head: () => ({
    meta: [
      { title: "Import plants — Verdant" },
      { name: "description", content: "Batch import new plant species into the catalog." },
    ],
  }),
});

function ImportPlants() {
  const [names, setNames] = useState("");
  const importMut = useMutation({
    mutationFn: () => {
      const list = names
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
      return batchImportSpecies({ data: { names: list } });
    },
    onSuccess: (res) => {
      toast.success(`Imported ${res.created} plants, skipped ${res.skipped}, failed ${res.failed}`);
      if (res.failed > 0) console.log(res.details);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold mt-2">Batch import plants</h1>
      <p className="text-muted-foreground mt-2">
        Paste one plant name per line. The AI will fill in care profiles, aliases, and generate images.
      </p>

      <div className="mt-6 space-y-4">
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder="Monstera deliciosa&#10;Pothos&#10;Peace lily"
          rows={12}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm font-mono"
        />
        <button
          onClick={() => importMut.mutate()}
          disabled={!names.trim() || importMut.isPending}
          className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {importMut.isPending ? "Importing…" : "Import plants"}
        </button>
      </div>

      {importMut.isSuccess && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium mb-3">Results</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="font-display text-2xl font-semibold text-primary">{importMut.data.created}</div>
              <div className="text-muted-foreground">Created</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="font-display text-2xl font-semibold">{importMut.data.skipped}</div>
              <div className="text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="font-display text-2xl font-semibold text-destructive">{importMut.data.failed}</div>
              <div className="text-muted-foreground">Failed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
