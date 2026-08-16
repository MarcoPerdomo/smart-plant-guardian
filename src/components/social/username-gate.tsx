import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AtSign, Leaf } from "lucide-react";
import { checkUsername, getMyUsername, setUsername } from "@/lib/social.functions";

export function UsernameGate() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ["my_username"], queryFn: () => getMyUsername() });
  const [value, setValue] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<{ available: boolean; reason: string | null } | null>(null);

  useEffect(() => {
    const v = value.trim().toLowerCase();
    if (v.length < 3) {
      setStatus(null);
      return;
    }
    const t = setTimeout(() => {
      checkUsername({ data: { username: v } })
        .then(setStatus)
        .catch(() => setStatus(null));
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  const save = useMutation({
    mutationFn: () => setUsername({ data: { username: value.trim().toLowerCase(), bio: bio.trim() || null } }),
    onSuccess: () => {
      toast.success("Welcome to Verdant Social");
      qc.invalidateQueries({ queryKey: ["my_username"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !profile || profile.username) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 font-display text-xl font-semibold">
          <Leaf className="w-5 h-5 text-primary" /> Pick your @username
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Friends find you by username. Choose one to unlock the feed, friends and chat.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-input bg-background">
            <AtSign className="w-4 h-4 text-muted-foreground" />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\s/g, "").toLowerCase())}
              placeholder="fern_friend"
              maxLength={24}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {status && (
            <p className={`text-xs ${status.available ? "text-primary" : "text-destructive"}`}>
              {status.available ? "Available" : status.reason}
            </p>
          )}
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="Short bio (optional) — 12 plants, one very dramatic calathea"
            className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
          />
          <button
            onClick={() => save.mutate()}
            disabled={!status?.available || save.isPending}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {save.isPending ? "Saving…" : "Claim username"}
          </button>
        </div>
      </div>
    </div>
  );
}
