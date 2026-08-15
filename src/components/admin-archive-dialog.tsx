import { useState } from "react";
import { toast } from "sonner";
import { archiveRecord } from "@/lib/admin.functions";

export function ArchiveDialog({
  open,
  onClose,
  entityType,
  id,
  label,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  entityType: "plant" | "species";
  id: string;
  label: string;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function confirm() {
    setBusy(true);
    try {
      await archiveRecord({ data: { entity_type: entityType, id, reason: reason || null } });
      toast.success("Archived — restorable from the Archive tab");
      onDone();
      onClose();
      setTyped("");
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold">Archive “{label}”?</h2>
        <p className="text-sm text-muted-foreground">
          This is a soft delete. The record is hidden from users but a full snapshot is kept in the
          archive for audit and can be restored later. Type <span className="font-mono">delete</span> to
          confirm.
        </p>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="delete"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-2 rounded-md text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            disabled={typed !== "delete" || busy}
            onClick={confirm}
            className="px-3 py-2 rounded-md text-sm bg-destructive text-destructive-foreground disabled:opacity-50"
          >
            {busy ? "Archiving…" : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
