import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelAccountDeletion, getMyDeletionStatus } from "@/lib/privacy.functions";

export function DeletionBanner() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-deletion-status"], queryFn: () => getMyDeletionStatus() });
  const keep = useMutation({
    mutationFn: () => cancelAccountDeletion(),
    onSuccess: () => {
      toast.success("Welcome back, your account will not be deleted.");
      qc.invalidateQueries({ queryKey: ["my-deletion-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data?.scheduledFor) return null;
  const date = new Date(data.scheduledFor).toLocaleDateString(undefined, { dateStyle: "long" });

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-foreground">
        Your account is scheduled for deletion on <strong>{date}</strong>. Your data is safe until then.
      </p>
      <button
        onClick={() => keep.mutate()}
        disabled={keep.isPending}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {keep.isPending ? "Saving…" : "Keep my account"}
      </button>
    </div>
  );
}
