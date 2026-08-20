import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Verdant (Beta)" },
      { name: "description", content: "How Verdant handles your personal data during the beta." },
      { property: "og:title", content: "Privacy Policy — Verdant (Beta)" },
      { property: "og:description", content: "How Verdant handles your personal data during the beta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 20 August 2026 · Verdant is in beta.</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold">Who is responsible for your data?</h2>
            <p className="mt-2">
              Verdant is run by Marco, an individual data controller based in the Netherlands.
              For privacy questions, reach out through the feedback form once you are signed in.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">What we collect</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Account data:</strong> email address, password hash, and optional profile details (display name, username, phone, bio, avatar).</li>
              <li><strong>Location data:</strong> optional city, region, country, timezone and approximate latitude/longitude for weather-based plant alerts.</li>
              <li><strong>Plant data:</strong> nicknames, species, locations, notes, sensor readings, watering logs, photos and AI-generated care summaries.</li>
              <li><strong>Social data:</strong> friend connections, posts, comments, reactions and messages.</li>
              <li><strong>Marketplace data:</strong> listings, orders, wallet transactions and payout requests if you use the marketplace.</li>
              <li><strong>Technical data:</strong> browser user-agent and page path when you submit feedback.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Why we process it</h2>
            <p className="mt-2 text-muted-foreground">
              We process your data to provide the Verdant service: tracking your plants, generating care advice,
              sending you notifications, connecting you with other plant lovers and operating the marketplace.
              The legal basis is performance of the contract with you and, where applicable, your consent.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Who else sees your data</h2>
            <p className="mt-2 text-muted-foreground">
              We use trusted processors: Supabase (database, auth, storage and email), Google (OAuth sign-in),
              Open-Meteo (weather data) and Lovable's AI gateway (plant care summaries). See the{" "}
              <Link to="/subprocessors" className="underline">subprocessors</Link> page for details.
            </p>
            <p className="mt-2 text-muted-foreground">
              Other users can only see what you explicitly share: public plant care pages, your profile page
              (username, bio, country, plant count and join date), your social posts and marketplace listings.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Cookies and local storage</h2>
            <p className="mt-2 text-muted-foreground">
              We store your Supabase auth session and your cookie-consent choice. We do not use advertising or
              third-party analytics cookies during the beta. See{" "}
              <Link to="/cookies" className="underline">Cookie Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Your rights</h2>
            <p className="mt-2 text-muted-foreground">
              Under the GDPR you can access, correct, export and delete your data. Use Settings → Privacy
              while signed in, or contact us through the feedback form.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Retention</h2>
            <p className="mt-2 text-muted-foreground">
              We keep your data while your account is active. If you delete your account, plant and personal data
              are soft-archived for 30 days and then permanently removed, except where we must keep records for
              legal obligations (for example marketplace tax records).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Changes</h2>
            <p className="mt-2 text-muted-foreground">
              This policy may change as Verdant grows. We will notify you of material changes via email or the
              in-app notification bell.
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
