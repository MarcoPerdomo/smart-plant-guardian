import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  component: CookiesPage,
  head: () => ({
    meta: [
      { title: "Cookie Policy — Verdant (Beta)" },
      { name: "description", content: "What cookies and local storage Verdant uses during the beta." },
      { property: "og:title", content: "Cookie Policy — Verdant (Beta)" },
      { property: "og:description", content: "What cookies and local storage Verdant uses during the beta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
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

function SimpleHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="text-primary">Verdant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">Beta</span>
        </Link>
        <Link to="/auth" className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
          Sign in
        </Link>
      </div>
    </header>
  );
}

function SimpleFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-wrap gap-4 justify-between">
        <span>© 2026 Verdant (Beta)</span>
        <div className="flex gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
