import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMySubscription, subscribeNewsletter } from "@/lib/newsletter.functions";

type AuthState = "loading" | "signed-out" | "signed-in";

function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>("loading");
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setState(data.session ? "signed-in" : "signed-out");
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Footer-sized link: sends signed-out visitors to sign-up, signed-in users to Settings. */
export function NewsletterCtaLink({ className }: { className?: string }) {
  const auth = useAuthState();
  if (auth === "loading") return null;
  return auth === "signed-out" ? (
    <a href="/auth?next=%2Fsettings" className={className}>
      Newsletter
    </a>
  ) : (
    <Link to="/settings" hash="newsletter" className={className}>
      Newsletter
    </Link>
  );
}

/** Full card: shows the right action depending on subscription state. */
export function NewsletterCta() {
  const qc = useQueryClient();
  const auth = useAuthState();
  const signedIn = auth === "signed-in";

  const { data: sub, isLoading } = useQuery({
    queryKey: ["newsletter_sub"],
    queryFn: () => getMySubscription(),
    enabled: signedIn,
  });

  const subscribe = useMutation({
    mutationFn: () => subscribeNewsletter({ data: {} }),
    onSuccess: (r) => {
      toast.success(r.emailed ? "Check your inbox to confirm" : "Subscribed, confirmation email could not be sent");
      qc.invalidateQueries({ queryKey: ["newsletter_sub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (auth === "loading") return null;
  if (signedIn && isLoading) return null;

  const status = sub?.status ?? "none";

  return (
    <section className="rounded-2xl border border-border bg-card p-6 max-w-2xl">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-primary" /> Stay in the loop
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Excited about what we're building?{"\u00a0"}
        <br />
        Sign up to email updates about our product, new features and platform updates.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {auth === "signed-out" ? (
          <>
            <a
              href="/auth?next=%2Fsettings"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Get product news
            </a>
            <span className="text-xs text-muted-foreground">Create a free account first, then subscribe from Settings.</span>
          </>
        ) : (
          <>
            {(status === "none" || status === "unsubscribed") && (
              <button
                onClick={() => subscribe.mutate()}
                disabled={subscribe.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {subscribe.isPending ? "Sending…" : "Sign me up"}
              </button>
            )}
            {status === "pending" && (
              <>
                <button
                  onClick={() => subscribe.mutate()}
                  disabled={subscribe.isPending}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50"
                >
                  Resend confirmation
                </button>
                <span className="text-xs text-muted-foreground">Check your email for the confirmation link.</span>
              </>
            )}
            {status === "confirmed" && (
              <>
                <span className="text-sm font-medium text-primary inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4" /> You're subscribed
                </span>
                <Link to="/settings" hash="newsletter" className="text-sm text-muted-foreground underline hover:text-foreground">
                  Manage
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
