import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Droplets, Flower2, Leaf, PackageOpen, Scissors, Sprout } from "lucide-react";
import { format } from "date-fns";
import { getPlant, listPlantCareHistory } from "@/lib/plants.functions";

export const Route = createFileRoute("/_authenticated/plants/$id_/care")({
  component: CareHistoryPage,
  head: () => ({ meta: [
    { title: "Care journal, Sentia" },
    { name: "description", content: "Complete care history for your plant." },
    { property: "og:title", content: "Care journal, Sentia" },
    { property: "og:description", content: "Complete care history for your plant." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

const icons: Record<string, React.ElementType> = { watering: Droplets, fertilizing: Sprout, pruning: Scissors, repotting: PackageOpen, flowering: Flower2, deceased: Leaf };

function CareHistoryPage() {
  const { id } = Route.useParams();
  const plant = useQuery({ queryKey: ["plant", id], queryFn: () => getPlant({ data: { id } }) });
  const history = useQuery({ queryKey: ["plant-care-history", id], queryFn: () => listPlantCareHistory({ data: { plant_id: id } }) });
  const name = plant.data?.plant.nickname ?? "Plant";
  return <div className="max-w-3xl">
    <Link to="/plants/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {name}</Link>
    <header className="mt-2 mb-6"><h1 className="font-display text-3xl font-semibold">Care journal</h1><p className="text-sm text-muted-foreground">Complete care history for {name}, newest first.</p></header>
    {history.isLoading ? <p className="text-sm text-muted-foreground">Loading care history…</p> : history.data?.length ? <ul className="divide-y divide-border rounded-lg border border-border bg-card px-5">{history.data.map((event) => {
      const Icon = icons[event.event_type] ?? Leaf;
      return <li key={event.id} className="flex gap-3 py-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><span className="font-medium capitalize">{event.event_type}</span><time className="text-xs text-muted-foreground">{format(new Date(event.occurred_at), "MMM d, yyyy, HH:mm")}</time></div>{event.notes && <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>}<span className="mt-1 block text-[10px] uppercase text-muted-foreground">{event.source === "sensor" ? "Automatic" : "Manual"}</span></div></li>;
    })}</ul> : <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No care activities yet.</p>}
  </div>;
}