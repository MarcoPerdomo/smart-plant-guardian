import { createFileRoute, Link } from "@tanstack/react-router";
import { BetaBadge } from "@/components/beta-banner";

const CANONICAL = "https://leaf-buddy-system.lovable.app/terms";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Verdant (Beta)" },
      { name: "description", content: "Terms for using the Verdant beta plant care platform." },
      { property: "og:title", content: "Terms of Service — Verdant (Beta)" },
      { property: "og:description", content: "Terms for using the Verdant beta plant care platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 20 August 2026 · Verdant is in beta.</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold">1. Beta software</h2>
            <p className="mt-2 text-muted-foreground">
              Verdant is currently in beta. Features, data and availability may change without notice.
              Do not rely on Verdant as the sole source of plant care advice. Always use your own judgment
              and consult a local expert when in doubt.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">2. Accounts</h2>
            <p className="mt-2 text-muted-foreground">
              You must be at least 16 years old to use Verdant. Keep your login credentials safe.
              You are responsible for everything that happens under your account.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">3. Acceptable use</h2>
            <p className="mt-2 text-muted-foreground">
              Be kind and plant-focused. Do not harass other users, post illegal content, abuse the sensor
              ingestion endpoints, attempt to access other users' accounts, or use Verdant to send spam.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">4. Marketplace (beta)</h2>
            <p className="mt-2 text-muted-foreground">
              The marketplace connects individual buyers and sellers of plants. Verdant charges a 7% commission
              on completed sales. During the beta, payments may be simulated or processed through a test provider.
              Sellers are responsible for accurately describing plants, including any past diseases, pests or damage,
              and for complying with local plant shipping laws.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">5. Intellectual property</h2>
            <p className="mt-2 text-muted-foreground">
              You keep ownership of your photos and content. By posting them, you grant Verdant a limited licence
              to host and display them within the service.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">6. Termination</h2>
            <p className="mt-2 text-muted-foreground">
              We may suspend or terminate accounts that violate these terms. You can delete your account at any
              time from Settings → Privacy.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">7. Liability</h2>
            <p className="mt-2 text-muted-foreground">
              Verdant is provided "as is" without warranties. We are not liable for plant loss, sensor misreadings,
              marketplace disputes or any damages arising from your use of the beta.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">8. Governing law</h2>
            <p className="mt-2 text-muted-foreground">
              These terms are governed by the laws of the Netherlands. Any disputes will be handled in the courts
              of the Netherlands.
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
