import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  importOneSpecies,
  listSpeciesMissingImages,
  generateSpeciesImageFor,
} from "@/lib/plants.functions";
import { toast } from "sonner";
import { ArrowLeft, Upload, Image as ImageIcon, X, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/plants/import")({
  component: ImportPlants,
  head: () => ({
    meta: [
      { title: "Import plants — Verdant" },
      { name: "description", content: "Batch import new plant species into the catalog." },
    ],
  }),
});

type Status = "pending" | "running" | "created" | "skipped" | "failed";
type Item = { name: string; status: Status; error?: string };

const CONCURRENCY = 3;

async function runQueue<T>(items: T[], worker: (item: T) => Promise<void>, cancelled: () => boolean) {
  let cursor = 0;
  const lanes = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      if (cancelled()) return;
      const item = items[cursor++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">
        {done} / {total} processed
      </div>
    </div>
  );
}

const statusClass: Record<Status, string> = {
  pending: "text-muted-foreground",
  running: "text-primary",
  created: "text-primary",
  skipped: "text-muted-foreground",
  failed: "text-destructive",
};

function ImportPlants() {
  const [names, setNames] = useState("");
  const [withImage, setWithImage] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const update = (name: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.name === name ? { ...i, ...patch } : i)));

  async function importName(name: string) {
    update(name, { status: "running", error: undefined });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await importOneSpecies({ data: { name, withImage } });
        update(name, { status: res.status });
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const rateLimited = /429|rate limit/i.test(msg);
        if (rateLimited && attempt === 0) {
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
        update(name, { status: "failed", error: msg });
        return;
      }
    }
  }

  async function start(list: string[]) {
    if (list.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setItems(list.map((name) => ({ name, status: "pending" })));
    await runQueue(list, importName, () => cancelRef.current);
    setRunning(false);
    if (cancelRef.current) toast.info("Import cancelled — already-imported plants were kept.");
    else toast.success("Import finished");
  }

  async function retryFailed() {
    const failed = items.filter((i) => i.status === "failed").map((i) => i.name);
    if (failed.length === 0) return;
    cancelRef.current = false;
    setRunning(true);
    setItems((prev) =>
      prev.map((i) => (i.status === "failed" ? { ...i, status: "pending", error: undefined } : i)),
    );
    await runQueue(failed, importName, () => cancelRef.current);
    setRunning(false);
  }

  async function fillMissingImages() {
    cancelRef.current = false;
    setRunning(true);
    try {
      const rows = await listSpeciesMissingImages({ data: { limit: 200 } });
      if (rows.length === 0) {
        toast.info("Every plant already has an image");
        setRunning(false);
        return;
      }
      setItems(rows.map((r) => ({ name: r.common_name, status: "pending" as Status })));
      await runQueue(
        rows,
        async (row) => {
          update(row.common_name, { status: "running" });
          try {
            const res = await generateSpeciesImageFor({ data: { id: row.id } });
            update(row.common_name, { status: res.status });
          } catch (e) {
            update(row.common_name, {
              status: "failed",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        },
        () => cancelRef.current,
      );
      toast.success("Image pass finished");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setRunning(false);
  }

  const parsed = names.split("\n").map((n) => n.trim()).filter(Boolean);
  const done = items.filter((i) => i.status !== "pending" && i.status !== "running").length;
  const created = items.filter((i) => i.status === "created").length;
  const skipped = items.filter((i) => i.status === "skipped").length;
  const failed = items.filter((i) => i.status === "failed").length;

  return (
    <div className="max-w-2xl">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold mt-2">Batch import plants</h1>
      <p className="text-muted-foreground mt-2">
        Paste one plant name per line. Each plant is imported as its own request, so progress shows live
        and nothing is lost if you stop midway.
      </p>

      <div className="mt-6 space-y-4">
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder="Monstera deliciosa&#10;Pothos&#10;Peace lily"
          rows={12}
          className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm font-mono"
        />

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={withImage}
            onChange={(e) => setWithImage(e.target.checked)}
            className="mt-0.5 accent-[hsl(var(--primary))]"
          />
          <span>
            Generate catalog images during import
            <span className="block text-xs text-muted-foreground">
              Much slower (roughly 20–40s per plant). Leave off for a fast import and fill images in
              afterwards.
            </span>
          </span>
        </label>

        <div className="flex gap-3">
          <button
            onClick={() => start(parsed)}
            disabled={parsed.length === 0 || running}
            className="flex-1 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {running ? "Importing…" : `Import ${parsed.length || ""} plants`}
          </button>
          {running ? (
            <button
              onClick={() => {
                cancelRef.current = true;
              }}
              className="px-4 py-3 rounded-lg border border-border font-medium inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          ) : (
            <button
              onClick={fillMissingImages}
              className="px-4 py-3 rounded-lg border border-border font-medium inline-flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" /> Missing images
            </button>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
          <ProgressBar done={done} total={items.length} />

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="font-display text-2xl font-semibold text-primary">{created}</div>
              <div className="text-muted-foreground">Created</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="font-display text-2xl font-semibold">{skipped}</div>
              <div className="text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <div className="font-display text-2xl font-semibold text-destructive">{failed}</div>
              <div className="text-muted-foreground">Failed</div>
            </div>
          </div>

          {failed > 0 && !running && (
            <button
              onClick={retryFailed}
              className="w-full px-4 py-2.5 rounded-lg border border-border text-sm font-medium inline-flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retry {failed} failed
            </button>
          )}

          <ul className="max-h-72 overflow-y-auto divide-y divide-border text-sm">
            {items.map((i) => (
              <li key={i.name} className="py-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="truncate">{i.name}</span>
                  <span className={`shrink-0 text-xs ${statusClass[i.status]}`}>
                    {i.status === "running" ? "working…" : i.status}
                  </span>
                </div>
                {i.error && (
                  <p className="mt-1 text-xs text-destructive break-words whitespace-pre-wrap">
                    {i.error}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {failed > 0 && (
            <button
              onClick={() => {
                const text = items
                  .filter((i) => i.status === "failed")
                  .map((i) => `${i.name}: ${i.error ?? "unknown error"}`)
                  .join("\n");
                void navigator.clipboard.writeText(text);
                toast.success("Error details copied");
              }}
              className="text-xs text-muted-foreground underline"
            >
              Copy all error details
            </button>
          )}
        </div>
      )}
    </div>
  );
}
