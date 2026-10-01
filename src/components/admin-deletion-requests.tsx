import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { listDeletionRequests, processDueDeletions } from "@/lib/admin.functions";

const STATUS_STYLE: Record<string, string> = {
  due: "bg-destructive/10 text-destructive",
  pending: "bg-accent text-accent-foreground",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary",
};

export function AdminDeletionRequests() {
  const [all, setAll] = useState(false);
  const qc = useQueryClient();
  type Row = { id: string; userRef: string; requestedAt: string; scheduledFor: string; status: string };
  const { data: rows, isLoading } = useQuery<Row[]>({
    queryKey: ["admin", "deletions", all],
    queryFn: () => listDeletionRequests({ data: { all } }) as Promise<Row[]>,
  });
  const dueCount = (rows ?? []).filter((r) => r.status === "due").length;

  const run = useMutation({
    mutationFn: () => processDueDeletions(),
    onSuccess: (res) => {
      toast.success(`${res.deleted} account(s) deleted, ${res.files} file(s) removed`, { duration: 8000 });
      for (const f of res.failures) toast.error(`Could not delete ${f.userRef}: ${f.reason}`, { duration: 10000 });
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Account deletions</h2>
          <p className="text-xs text-muted-foreground">
            Accounts are deleted 30 days after the request. Processing also removes their photo files.
          </p>
        </div>
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending || dueCount === 0}
          className="inline-flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {run.isPending ? "Processing…" : `Process due deletions (${dueCount} due)`}
        </button>
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
        Show cancelled and completed
      </label>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (rows?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No deletion requests.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {rows!.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="font-mono text-xs">User {r.userRef}</span>
              <span className="text-xs text-muted-foreground">
                Requested {new Date(r.requestedAt).toLocaleDateString()}, scheduled{" "}
                {new Date(r.scheduledFor).toLocaleDateString()}
              </span>
              <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
