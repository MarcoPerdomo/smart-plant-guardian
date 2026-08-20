"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const CONSENT_KEY = "verdant-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (saved === null) setVisible(true);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "true");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm p-4 shadow-lg">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <p className="text-sm text-muted-foreground">
          Verdant uses essential cookies and local storage to keep you signed in and remember this choice.
          We do not use advertising or analytics cookies during the beta.{" "}
          <Link to="/cookies" className="underline hover:text-foreground">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" onClick={accept}>
            Accept essential
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useCookieConsent() {
  const [consent, setConsent] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "true");
    } catch {
      setConsent(false);
    }
  }, []);

  return consent;
}
