import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Leaf, CheckCircle2, XCircle } from "lucide-react";
import { confirmNewsletter } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/newsletter/confirm")({
  component: ConfirmPage,
  head: () => ({
    meta: [
      { title: "Confirm your Verdant updates" },
      { name: "description", content: "Confirm your subscription to Verdant product news and platform updates." },
      { property: "og:title", content: "Confirm your Verdant updates" },
      { property: "og:description", content: "Confirm your subscription to Verdant product news and platform updates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ConfirmPage() {
  const [state, setState] = useState<"working" | "ok" | "already" | "invalid" | "error">("working");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    if (!token) { setState("invalid"); return; }
    confirmNewsletter({ data: { token } })
      .then((r) => setState(r.ok ? (r.reason === "already" ? "already" : "ok") : "invalid"))
      .catch(() => setState("error"));
  }, []);

  const copy: Record<typeof state, { title: string; body: string }> = {
    working: { title: "Confirming…", body: "One moment while we check your link." },
    ok: { title: "You're subscribed", body: "You'll get Verdant product news, new features and platform updates." },
    already: { title: "Already confirmed", body: "This subscription was confirmed earlier — nothing more to do." },
    invalid: { title: "Link not valid", body: "This confirmation link is unknown or has been replaced. Request a new one from Settings." },
    error: { title: "Something went wrong", body: "We couldn't confirm right now. Try the link again in a minute." },
  };

  const Icon = state === "ok" || state === "already" ? CheckCircle2 : state === "working" ? Leaf : XCircle;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center">
        <Icon className="w-10 h-10 mx-auto text-primary" />
        <h1 className="font-display text-2xl font-semibold mt-4">{copy[state].title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{copy[state].body}</p>
        <Link to="/settings" className="inline-block mt-6 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          Back to Verdant
        </Link>
      </div>
    </main>
  );
}
