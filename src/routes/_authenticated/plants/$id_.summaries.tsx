import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getPlant, listPlantSummaryHistory } from "@/lib/plants.functions";

export const Route = createFileRoute("/_authenticated/plants/$id_/summaries")({
  component: SummaryHistoryPage,
  head: () => ({ meta: [
    { title: "AI summary history, Sentia" },
    { name: "description", content: "Complete AI care summary history for your plant." },
    { property: "og:title", content: "AI summary history, Sentia" },
    { property: "og:description", content: "Complete AI care summary history for your plant." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

function SummaryHistoryPage() {
  const { id } = Route.useParams();
  const plant = useQuery({ queryKey: ["plant", id], queryFn: () => getPlant({ data: { id } }) });
  const history = useQuery({ queryKey: ["plant-summary-history", id], queryFn: () => listPlantSummaryHistory({ data: { plant_id: id } }) });
  const name = plant.data?.plant.nickname ?? "Plant";
  return <div className="max-w-3xl">
    <Link to="/plants/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {name}</Link>
    <header className="mt-2 mb-6"><h1 className="font-display text-3xl font-semibold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI summary history</h1><p className="text-sm text-muted-foreground">Every AI care check for {name}, newest first.</p></header>
    {history.isLoading ? <p className="text-sm text-muted-foreground">Loading summaries…</p> : history.data?.length ? <div className="space-y-4">{history.data.map((summary) => <article key={summary.id} className="rounded-lg border border-border bg-card p-5"><div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(summary.created_at), { addSuffix: true })}, {summary.status}</div><p className="mt-2 text-sm">{summary.summary}</p>{Array.isArray(summary.recommendations) && summary.recommendations.length > 0 && <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-muted-foreground">{(summary.recommendations as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>}</article>)}</div> : <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No AI summaries yet.</p>}
  </div>;
}