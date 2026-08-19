import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Megaphone } from "lucide-react";
import { listPublishedAnnouncements } from "@/lib/newsletter.functions";

export const Route = createFileRoute("/_authenticated/whats-new")({
  component: WhatsNew,
  head: () => ({
    meta: [
      { title: "What's new — Verdant" },
      { name: "description", content: "Product announcements: new features, upgrades and platform news from Verdant." },
      { property: "og:title", content: "What's new — Verdant" },
      { property: "og:description", content: "Product announcements: new features, upgrades and platform news from Verdant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function WhatsNew() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["announcements", "published"],
    queryFn: () => listPublishedAnnouncements(),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" /> What's new
        </h1>
        <p className="text-sm text-muted-foreground mt-1">New features, upgrades and platform news.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet — the greenhouse is quiet.</p>
      ) : (
        <div className="space-y-4">
          {data.map((a) => (
            <article key={a.id} className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">{a.title}</h2>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">
                {a.published_at ? formatDistanceToNow(new Date(a.published_at), { addSuffix: true }) : "Draft"}
              </div>
              {a.summary && <p className="text-sm text-muted-foreground mt-2">{a.summary}</p>}
              {a.body && <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{a.body}</p>}
              {a.link_url && (
                <a
                  href={a.link_url}
                  className="inline-block mt-4 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
                  target="_blank"
                  rel="noreferrer"
                >
                  {a.cta_label || "Learn more"}
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
