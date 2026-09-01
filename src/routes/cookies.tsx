import { createFileRoute, Link } from "@tanstack/react-router";
import { SimpleHeader, SimpleFooter } from "@/components/simple-layout";
import { BetaBadge } from "@/components/beta-banner";

const CANONICAL = "https://verdant-nl.app/cookies";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
  head: () => ({
    meta: [
      { title: "Cookie Policy — Verdant (Beta)" },
      { name: "description", content: "What cookies and local storage Verdant uses during the beta." },
      { property: "og:title", content: "Cookie Policy — Verdant (Beta)" },
      { property: "og:description", content: "What cookies and local storage Verdant uses during the beta." },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Cookie Policy — Verdant (Beta)" },
      { name: "twitter:description", content: "What cookies and local storage Verdant uses during the beta." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold">Cookie Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 20 August 2026 · Verdant is in beta.</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold">What we store</h2>
            <p className="mt-2 text-muted-foreground">
              During the beta, Verdant only stores what is strictly necessary to keep you signed in and remember
              your cookie preference:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                <strong>Supabase auth session</strong> — stored in your browser's localStorage by the Supabase client
                so you stay signed in across page loads.
              </li>
              <li>
                <strong>Cookie consent choice</strong> — stored in localStorage so the consent banner does not
                reappear on every visit.
              </li>
              <li>
                <strong>Beta banner dismissal</strong> — stored per user so the beta notice stays hidden once you
                close it.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">What we do not use</h2>
            <p className="mt-2 text-muted-foreground">
              We do not use advertising cookies, tracking pixels, Google Analytics, Facebook pixels or any other
              third-party analytics during the beta. If we add analytics later, we will ask for your consent first
              and update this policy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Managing cookies</h2>
            <p className="mt-2 text-muted-foreground">
              You can clear localStorage and cookies from your browser settings at any time. If you do, you will be
              signed out and the consent banner will reappear.
            </p>
          </section>
        </div>
      </main>
      <SimpleFooter />
    </div>
  );
}
