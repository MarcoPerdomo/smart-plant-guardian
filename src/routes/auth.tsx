import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Leaf } from "lucide-react";
import { toast } from "sonner";
import { BetaBadge } from "@/components/beta-banner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => {
    const next = typeof s.next === "string" ? s.next : "";
    return next ? { next } : {};
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Verdant (Beta)" },
      { name: "description", content: "Sign in to Verdant to manage your plants." },
      { property: "og:title", content: "Sign in — Verdant (Beta)" },
      { property: "og:description", content: "Sign in to Verdant to manage your plants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const PRIVACY_VERSION = "2026-08-20";
const TERMS_VERSION = "2026-08-20";

function AuthPage() {
  const navigate = useNavigate();
  const { next: rawNext } = Route.useSearch();
  const next = validateNext(rawNext);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) {
      toast.error(oauthError.replaceAll("+", " "));
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        checkLegalAcceptance(data.user.id).then((accepted) => {
          if (accepted) {
            navigate({ href: next || "/dashboard", replace: true });
          } else {
            setNeedsConsent(true);
          }
        });
      }
    });
  }, [navigate, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !consent) {
      toast.error("Please accept the Terms and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    try {
        if (mode === "signup") {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${window.location.origin}/auth?${new URLSearchParams({ next }).toString()}` },
          });
          if (error) throw error;
          toast.success("Check your email to confirm, or sign in if confirmation is off.");
          if (data.user) {
            await recordAcceptance(data.user.id);
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          if (data.user) {
            const accepted = await checkLegalAcceptance(data.user.id);
            if (!accepted) {
              setNeedsConsent(true);
              setLoading(false);
              return;
            }
          }
          navigate({ href: next || "/dashboard", replace: true });
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    async function handleGoogle() {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?${new URLSearchParams({ next }).toString()}` },
      });
      if (error) toast.error(error.message);
    }

  async function submitConsent() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    await recordAcceptance(data.user.id);
    navigate({ href: next || "/dashboard", replace: true });
  }

  if (needsConsent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2 font-display text-xl font-semibold">
            <Leaf className="w-6 h-6 text-primary" /> Verdant <BetaBadge />
          </div>
          <h2 className="font-display text-lg font-semibold">Welcome to the beta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Before you continue, please review and accept our Terms and Privacy Policy.
          </p>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span className="text-sm leading-relaxed">
              I agree to the{" "}
              <Link to="/terms" target="_blank" className="underline hover:text-primary">Terms of Service</Link>{" "}
              and{" "}
              <Link to="/privacy" target="_blank" className="underline hover:text-primary">Privacy Policy</Link>.
            </span>
          </label>
          <button
            onClick={submitConsent}
            disabled={!consent}
            className="mt-4 w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 font-display text-2xl font-semibold">
            <Leaf className="w-6 h-6 text-primary" /> Verdant <BetaBadge />
          </div>
          <h1 className="mt-3 font-display text-xl font-semibold">Sign in to Verdant</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to tend to your plants.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium"
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.5 2.2 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.5 13.4 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.6-4.9 7.3l7.7 6c4.5-4.1 7-10.2 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.7 0 20.2 0 24s.9 7.3 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.2-2 15-5.5l-7.7-6c-2.1 1.4-4.8 2.3-7.3 2.3-6.2 0-11.5-3.9-13.5-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-border flex-1" /> OR <div className="h-px bg-border flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" required placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
            />
            <input
              type="password" required minLength={6} placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm"
            />

            {mode === "signup" && (
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  I agree to the{" "}
                  <Link to="/terms" target="_blank" className="underline hover:text-foreground">Terms of Service</Link>{" "}
                  and{" "}
                  <Link to="/privacy" target="_blank" className="underline hover:text-foreground">Privacy Policy</Link>.
                </span>
              </label>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Verdant is in beta. By signing in you accept our{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

async function checkLegalAcceptance(userId: string) {
  const { data, error } = await supabase
    .from("legal_acceptances")
    .select("id")
    .eq("user_id", userId)
    .eq("document", "privacy_policy")
    .eq("version", PRIVACY_VERSION)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

async function recordAcceptance(userId: string) {
  await supabase.from("legal_acceptances").upsert(
    [
      { user_id: userId, document: "privacy_policy", version: PRIVACY_VERSION, accepted_at: new Date().toISOString() },
      { user_id: userId, document: "terms_of_service", version: TERMS_VERSION, accepted_at: new Date().toISOString() },
    ],
    { onConflict: "user_id,document,version" },
  );
}

function validateNext(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "";
    return url.pathname + url.search;
  } catch {
    return "";
  }
}
