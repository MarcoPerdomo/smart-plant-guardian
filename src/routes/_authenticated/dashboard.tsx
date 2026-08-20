import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listUserPlants, generateSummary, logWatering } from "@/lib/plants.functions";
import { getWeatherForMe } from "@/lib/weather.functions";
import { computeStatus, predictNextWatering } from "@/lib/plant-status";
import { Droplets, Sparkles, Sun, Leaf, Plus, Thermometer, CloudSun, Store } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — Verdant" }, { name: "description", content: "Overview of all your plants and their current status." }] }),
});

function Dashboard() {
  const qc = useQueryClient();
  const { data: plants, isLoading } = useQuery({
    queryKey: ["user_plants"],
    queryFn: () => listUserPlants(),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const { data: weather } = useQuery({
    queryKey: ["weather", "me"],
    queryFn: () => getWeatherForMe(),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const summaryMut = useMutation({
    mutationFn: (plant_id: string) => generateSummary({ data: { plant_id } }),
    onSuccess: () => { toast.success("AI summary generated"); qc.invalidateQueries({ queryKey: ["user_plants"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const waterMut = useMutation({
    mutationFn: (plant_id: string) => logWatering({ data: { plant_id, amount_ml: null } }),
    onSuccess: () => { toast.success("Watered!"); qc.invalidateQueries({ queryKey: ["user_plants"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading your garden…</div>;

  if (!plants || plants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <Leaf className="w-12 h-12 mx-auto text-primary/40" />
        <h2 className="mt-4 font-display text-2xl font-semibold">No plants yet</h2>
        <p className="mt-2 text-muted-foreground text-sm">Add your first plant to start tracking.</p>
        <Link to="/plants/new" className="mt-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" /> Add plant
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Your garden</h1>
          <p className="text-sm text-muted-foreground">{plants.length} plant{plants.length === 1 ? "" : "s"}</p>
        </div>
        <Link to="/plants/new" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" /> Add plant
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plants.map((p) => {
          const species = p.plant_species;
          const latest = p.latest_reading;
          const status = computeStatus({
            soil_moisture: latest?.soil_moisture ?? null,
            species_moisture_min: species?.soil_moisture_min ?? null,
            species_moisture_max: species?.soil_moisture_max ?? null,
            last_reading_at: latest?.recorded_at ?? null,
            last_watered_at: p.last_watered_at,
            water_frequency_days: species?.water_frequency_days ?? null,
          });
          const nextWater = predictNextWatering(
            p.last_watered_at,
            species?.water_frequency_days ?? null,
            latest?.soil_moisture ?? null,
            species?.soil_moisture_min ?? null,
          );
          const statusColor = {
            healthy: "bg-success/15 text-success",
            attention: "bg-warning/20 text-warning-foreground",
            thirsty: "bg-accent/20 text-accent",
            unknown: "bg-muted text-muted-foreground",
          }[status.status];
          const plantAlerts = (weather?.alerts ?? []).filter((a) => a.plant_id === p.id);

          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <Link to="/plants/$id" params={{ id: p.id }} className="font-display text-xl font-semibold hover:text-primary">
                    {p.nickname}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {species?.common_name ?? "Unknown species"}
                    {p.location ? ` · ${p.location}` : ""}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>{status.label}</span>
              </div>

              {plantAlerts.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {plantAlerts.map((a) => (
                    <li
                      key={a.rule}
                      title={a.message}
                      className={`text-[11px] px-2 py-1.5 rounded-md flex items-start gap-1.5 ${a.severity === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      <CloudSun className="w-3.5 h-3.5 mt-px shrink-0" />
                      <span>{a.message}</span>
                    </li>
                  ))}
                </ul>
              )}


              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Stat icon={Droplets} label="Moisture" value={latest?.soil_moisture != null ? `${Math.round(latest.soil_moisture)}%` : "—"} />
                <Stat icon={Thermometer} label="Temp" value={latest?.temperature_c != null ? `${latest.temperature_c.toFixed(1)}°` : "—"} />
                <Stat icon={Sun} label="Light" value={latest?.light_lux != null ? `${Math.round(latest.light_lux)}lx` : "—"} />
              </div>

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Next water</span>
                <span className="font-medium">{nextWater.label}</span>
              </div>
              {latest?.recorded_at && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Last reading {formatDistanceToNow(new Date(latest.recorded_at), { addSuffix: true })}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => waterMut.mutate(p.id)}
                  disabled={waterMut.isPending}
                  className="flex-1 text-xs px-3 py-2 rounded-md border border-border hover:bg-muted flex items-center justify-center gap-1"
                >
                  <Droplets className="w-3.5 h-3.5" /> Watered
                </button>
                <Link
                  to="/marketplace/new"
                  search={{ plant: p.id }}
                  className="flex-1 text-xs px-3 py-2 rounded-md border border-border hover:bg-muted flex items-center justify-center gap-1"
                >
                  <Store className="w-3.5 h-3.5" /> Sell
                </Link>
                <button
                  onClick={() => summaryMut.mutate(p.id)}
                  disabled={summaryMut.isPending}
                  className="flex-1 text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {summaryMut.isPending && summaryMut.variables === p.id ? "Thinking…" : "AI check"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <Icon className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
      <div className="text-sm font-semibold mt-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
