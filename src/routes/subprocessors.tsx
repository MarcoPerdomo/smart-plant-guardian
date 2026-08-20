import { createFileRoute, Link } from "@tanstack/react-router";

const processors = [
  { name: "Supabase", role: "Cloud database, authentication, file storage and transactional email", region: "EU (Frankfurt) / US depending on project settings", website: "https://supabase.com" },
  { name: "Lovable", role: "Hosting, AI gateway for plant care summaries and managed email sending", region: "EU / US", website: "https://lovable.dev" },
  { name: "Google", role: "OAuth sign-in provider", region: "Global", website: "https://google.com" },
  { name: "Open-Meteo", role: "Weather data for plant alerts", region: "EU", website: "https://open-meteo.com" },
];

export const Route = createFileRoute("/subprocessors")({
  component: SubprocessorsPage,
  head: () => ({
    meta: [
      { title: "Subprocessors — Verdant (Beta)" },
      { name: "description", content: "Third parties that process data on behalf of Verdant." },
      { property: "og:title", content: "Subprocessors — Verdant (Beta)" },
      { property: "og:description", content: "Third parties that process data on behalf of Verdant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
  }),
});

function SubprocessorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-semibold">Subprocessors</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          These third parties process personal data on behalf of Verdant. The list is current as of 20 August 2026.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Provider</th>
                <th className="px-4 py-3 text-left font-medium">Purpose</th>
                <th className="px-4 py-3 text-left font-medium">Region</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processors.map((p) => (
                <tr key={p.name}>
                  <td className="px-4 py-3">
                    <a href={p.website} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">
                      {p.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.role}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          If you have questions about how a specific provider handles your data, please reach out through the
          feedback form once you are signed in.
        </p>
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
