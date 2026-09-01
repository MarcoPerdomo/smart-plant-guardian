import { createFileRoute, Link } from "@tanstack/react-router";
import { SimpleHeader, SimpleFooter } from "@/components/simple-layout";

const CANONICAL = "https://verdant-nl.app/subprocessors";

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
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Subprocessors — Verdant (Beta)" },
      { name: "twitter:description", content: "Third parties that process data on behalf of Verdant." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
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
