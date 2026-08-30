import { Home, Sun, Repeat, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type Environment = "indoor" | "outdoor" | "both" | "unknown";

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  both: "Indoor or outdoor",
  unknown: "Not classified",
};

const ICONS = { indoor: Home, outdoor: Sun, both: Repeat, unknown: HelpCircle } as const;

const STYLES: Record<Environment, string> = {
  indoor: "bg-primary/10 text-primary border-primary/20",
  outdoor: "bg-accent/10 text-accent border-accent/20",
  both: "bg-muted text-foreground border-border",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function normalizeEnvironment(value: unknown): Environment {
  const v = typeof value === "string" ? value.toLowerCase() : "";
  return v === "indoor" || v === "outdoor" || v === "both" ? v : "unknown";
}

export function EnvironmentBadge({
  value,
  className,
  showUnknown = false,
}: {
  value: unknown;
  className?: string;
  showUnknown?: boolean;
}) {
  const env = normalizeEnvironment(value);
  if (env === "unknown" && !showUnknown) return null;
  const Icon = ICONS[env];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        STYLES[env],
        className,
      )}
    >
      <Icon className="w-3 h-3" />
      {ENVIRONMENT_LABELS[env]}
    </span>
  );
}
