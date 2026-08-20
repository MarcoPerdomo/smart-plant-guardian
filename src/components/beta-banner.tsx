"use client";

import * as React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const BETA_BANNER_KEY = "verdant-beta-banner-dismissed";

export function BetaBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const dismissed = localStorage.getItem(BETA_BANNER_KEY);
      if (dismissed !== "true") setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(BETA_BANNER_KEY, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
      <div className="mx-auto max-w-6xl flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1">
          Verdant is in beta. Features may change, and plant advice is a helper — not a replacement for your own judgment.
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={dismiss} aria-label="Dismiss beta banner">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function BetaBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground ${className ?? ""}`}
    >
      Beta
    </span>
  );
}
