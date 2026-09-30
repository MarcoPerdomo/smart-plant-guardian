import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPlant, generateSummary, logPlantEvent, deletePlantEvent, archivePlant, addManualReading, deletePlant, updatePlantEnvironment, updatePlantSensorEnabled } from "@/lib/plants.functions";
import { computeStatus, predictNextWatering } from "@/lib/plant-status";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Droplets, Sparkles, Trash2, Sun, Thermometer, Camera, CloudSun, RefreshCw, Cpu, Copy, Check, Plus, Scissors, Flower2, PackageOpen, Sprout, Leaf, Radio, BookOpen, History, ChevronDown, ChevronUp } from "lucide-react";
import { SensorHint, SENSOR_HINTS } from "@/components/sensor-hint";
import { EnvironmentBadge } from "@/components/environment-badge";
import { getWeatherForMe } from "@/lib/weather.functions";
import { formatDistanceToNow, format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { LatestPhotoCard } from "@/components/plant-photos";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/_authenticated/plants/$id")({
  component: PlantDetail,
  head: ({ params }) => ({
    meta: [
      { title: "Plant, Sentia" },
      { name: "description", content: "Detailed sensor history and AI care guidance for your plant." },
      { property: "og:title", content: "Plant, Sentia" },
      { property: "og:description", content: "Detailed sensor history and AI care guidance for your plant." },
      { property: "og:url", content: `https://sentia-plants.com/plants/${params.id}` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `https://sentia-plants.com/plants/${params.id}` }],
  }),
});

function PlantDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["plant", id],
    queryFn: () => getPlant({ data: { id } }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  // Live push: a new sensor reading for this plant refreshes the page instantly.
  useEffect(() => {
    if (!data?.plant.sensor_enabled) return;
    const channel = supabase
      .channel(`sensor_readings:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings", filter: `plant_id=eq.${id}` },
        () => { qc.invalidateQueries({ queryKey: ["plant", id] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [data?.plant.sensor_enabled, id, qc]);

  const { data: weather } = useQuery({
    queryKey: ["weather", "me"],
    queryFn: () => getWeatherForMe(),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const plantAlerts = (weather?.alerts ?? []).filter((a) => a.plant_id === id);
  const [showManual, setShowManual] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showAllSummaries, setShowAllSummaries] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["plant", id] });

  const summaryMut = useMutation({
    mutationFn: () => generateSummary({ data: { plant_id: id } }),
    onSuccess: () => { toast.success("New AI summary"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: () => deletePlant({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/dashboard" }); },
  });
  const archiveMut = useMutation({
    mutationFn: () => archivePlant({ data: { id } }),
    onSuccess: () => { toast.success("Plant archived"); navigate({ to: "/dashboard" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const sensorMut = useMutation({
    mutationFn: (sensor_enabled: boolean) => updatePlantSensorEnabled({ data: { plant_id: id, sensor_enabled } }),
    onSuccess: (_row, enabled) => { toast.success(enabled ? "Sensor journal enabled" : "Sensor journal hidden"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const waterMut = useMutation({
    mutationFn: () => logPlantEvent({ data: { plant_id: id, event_type: "watering", amount_ml: null, notes: null, metadata: {} } }),
    onSuccess: () => { toast.success("Watering logged"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteEventMut = useMutation({
    mutationFn: (eventId: string) => deletePlantEvent({ data: { id: eventId } }),
    onSuccess: () => { toast.success("Care activity deleted"); setEventToDelete(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  const { plant, readings, events, summaries } = data;
  const species = plant.plant_species;
  const latest = readings[0];
  const status = computeStatus({
    soil_moisture: latest?.soil_moisture ?? null,
    species_moisture_min: species?.soil_moisture_min ?? null,
    species_moisture_max: species?.soil_moisture_max ?? null,
    last_reading_at: latest?.recorded_at ?? null,
    last_watered_at: plant.last_watered_at,
    water_frequency_days: species?.water_frequency_days ?? null,
  });
  const nextWater = predictNextWatering(plant.last_watered_at, species?.water_frequency_days ?? null, latest?.soil_moisture ?? null, species?.soil_moisture_min ?? null);

  const chartData = [...readings].reverse().map((r) => ({
    time: format(new Date(r.recorded_at), "MMM d HH:mm"),
    moisture: r.soil_moisture,
    temp: r.temperature_c,
    light: r.light_lux,
  }));

  const maintenanceEvents = events.filter((event) => event.source !== "sensor").slice(0, 3);
  const visibleSummaries = showAllSummaries ? summaries : summaries.slice(0, 3);
  const visibleEvents = showAllEvents ? events : events.slice(0, 5);

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-4xl font-semibold">{plant.nickname}</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {species?.common_name ?? "Unknown species"}
            {species?.scientific_name && <span className="italic"> · {species.scientific_name}</span>}
            {plant.location && <span> · {plant.location}</span>}
          </p>
          <EnvironmentControl
            plantId={plant.id}
            value={plant.environment}
            speciesEnvironment={species?.environment ?? null}
            speciesNotes={species?.environment_notes ?? null}
            onChanged={invalidate}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending}>
            <Sparkles className="w-4 h-4" /> {summaryMut.isPending ? "Thinking…" : "AI check"}
          </Button>
        </div>
      </header>

      <section className="mt-6 rounded-lg border border-border bg-card p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
          <div className="font-display text-2xl font-semibold">{status.label}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Next watering</div>
          <div className="font-display text-2xl font-semibold">{nextWater.label}</div>
        </div>
      </section>

      {plantAlerts.length > 0 && (
        <section className="mt-4 rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-primary" /> Weather watch today
          </h2>
          <ul className="mt-3 space-y-2">
            {plantAlerts.map((a) => (
              <li
                key={a.rule}
                className={`text-sm px-3 py-2 rounded-lg ${a.severity === "warning" ? "bg-warning/15 text-warning-foreground" : "bg-muted text-muted-foreground"}`}
              >
                <span className="font-medium">{a.title}</span>
                <p className="mt-0.5">{a.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {species && (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Care profile</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            {species.description && <p className="md:col-span-2 text-muted-foreground">{species.description}</p>}
            <InfoRow label="Light" value={species.light} />
            <InfoRow label="Watering" value={species.water_frequency_days ? `Every ~${species.water_frequency_days} days` : null} />
            <InfoRow label="Soil" value={species.soil} />
            <InfoRow label="Fertilizer" value={species.fertilizer} />
            <InfoRow label="Toxicity" value={species.toxicity} />
            <InfoRow label="Common pests" value={species.common_pests?.join(", ")} />
            {species.care_tips && <p className="md:col-span-2 text-muted-foreground">{species.care_tips}</p>}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Maintenance journal</h2><p className="text-sm text-muted-foreground">Record the care that keeps {plant.nickname} thriving.</p></div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => waterMut.mutate()} disabled={waterMut.isPending}><Droplets className="h-4 w-4" /> {waterMut.isPending ? "Logging…" : "Log watering"}</Button>
            <Button variant="outline" onClick={() => setShowActivity((open) => !open)}><Plus className="h-4 w-4" /> Log other care</Button>
          </div>
        </div>
        {showActivity && <ActivityForm plantId={id} onCancel={() => setShowActivity(false)} onDone={(eventType) => { setShowActivity(false); invalidate(); if (eventType === "deceased") setConfirmArchive(true); }} />}
        {maintenanceEvents.length > 0 && <ul className="mt-4 space-y-1">{maintenanceEvents.map((event) => <PlantEventRow key={event.id} event={event} onDelete={() => setEventToDelete(event.id)} />)}</ul>}
      </section>

      <LatestPhotoCard plantId={plant.id} plantName={plant.nickname} />

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-lg font-semibold">AI summaries</h2>
          <Button variant="ghost" size="sm" onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending}>Regenerate</Button>
        </div>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No summaries yet. Tap AI check to generate one.</p>
        ) : (
          <div className="space-y-3">
            {visibleSummaries.map((s) => (
              <div key={s.id} className="border-l-2 border-primary/30 pl-3">
                <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.created_at), { addSuffix: true })} · {s.status}</div>
                <p className="text-sm mt-1">{s.summary}</p>
                {Array.isArray(s.recommendations) && s.recommendations.length > 0 && (
                  <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                    {(s.recommendations as string[]).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {summaries.length > 3 && <Button variant="ghost" size="sm" onClick={() => setShowAllSummaries((show) => !show)}>{showAllSummaries ? <ChevronUp /> : <ChevronDown />}{showAllSummaries ? "Show less" : "Show all here"}</Button>}
            <Button variant="link" size="sm" asChild><Link to="/plants/$id/summaries" params={{ id }}><History /> Full summary history</Link></Button>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold flex items-center gap-2"><Radio className="h-5 w-5 text-primary" /> Sensor journal</h2><p className="text-sm text-muted-foreground">Optional live conditions and history from connected sensors.</p></div>
          <Button variant={plant.sensor_enabled ? "outline" : "default"} onClick={() => sensorMut.mutate(!plant.sensor_enabled)} disabled={sensorMut.isPending}>{plant.sensor_enabled ? "Hide sensors" : "Enable sensors"}</Button>
        </div>
        {!plant.sensor_enabled ? <div className="mt-5 rounded-md border border-dashed border-border p-6 text-center"><Cpu className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Sensors are not enabled for this plant</p><p className="mt-1 text-xs text-muted-foreground">You can turn them on whenever you are ready to connect a device or add readings.</p></div> : <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground"><span className="flex flex-wrap items-center gap-2">{latest?.recorded_at ? `Last reading ${formatDistanceToNow(new Date(latest.recorded_at), { addSuffix: true })}` : "No sensor readings yet"}<span className="opacity-60">Updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}</span>{plant.device_id && <DeviceIdChip deviceId={plant.device_id} />}</span><Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} title="Refresh sensor data"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</Button></div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Metric icon={Droplets} label="Moisture" hint={SENSOR_HINTS.moisture} value={latest?.soil_moisture != null ? `${Math.round(latest.soil_moisture)}%` : "Not available"} sub={species?.soil_moisture_min != null ? `Target ${species.soil_moisture_min}-${species.soil_moisture_max}%` : ""} />
            <Metric icon={Thermometer} label="Temp" hint={SENSOR_HINTS.temp} value={latest?.temperature_c != null ? `${latest.temperature_c.toFixed(1)}°C` : "Not available"} sub={species?.temperature_min_c != null ? `${species.temperature_min_c}-${species.temperature_max_c}°C` : ""} />
            <Metric icon={Sun} label="Light" hint={SENSOR_HINTS.light} value={latest?.light_lux != null ? `${Math.round(latest.light_lux)}%` : "Not available"} sub={species?.light ?? ""} />
          </div>
          {readings.length > 0 && <div className="mt-5 h-64"><ResponsiveContainer><LineChart data={chartData}><XAxis dataKey="time" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /><Line type="monotone" dataKey="moisture" stroke="var(--primary)" strokeWidth={2} dot={false} name="Moisture %" /><Line type="monotone" dataKey="temp" stroke="var(--warning)" strokeWidth={2} dot={false} name="Temp °C" /><Line type="monotone" dataKey="light" stroke="var(--accent)" strokeWidth={2} dot={false} name="Light %" /></LineChart></ResponsiveContainer></div>}
          <Snapshot path={latest?.snapshot_url ?? null} alt={`Snapshot of ${plant.nickname}`} embedded />
          <div className="mt-5 border-t border-border pt-4"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">Manual reading</h3><Button variant="ghost" size="sm" onClick={() => setShowManual(!showManual)}>{showManual ? "Hide" : "Add reading"}</Button></div>{showManual && <ManualReadingForm plantId={id} onDone={() => { setShowManual(false); invalidate(); }} />}</div>
        </>}
      </section>

      {events.length > 0 && (
        <section className="mt-6 rounded-lg border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Care journal</h2><Button variant="link" size="sm" asChild><Link to="/plants/$id/care" params={{ id }}><History /> Full care history</Link></Button></div>
          <ul className="space-y-2 text-sm">
            {visibleEvents.map((event) => (
              <PlantEventRow key={event.id} event={event} />
            ))}
          </ul>
          {events.length > 5 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShowAllEvents((show) => !show)}>{showAllEvents ? <ChevronUp /> : <ChevronDown />}{showAllEvents ? "Show less" : "Show all here"}</Button>}
        </section>
      )}

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {plant.nickname}?</AlertDialogTitle>
            <AlertDialogDescription>
              The deceased event is saved. You can now archive this plant from your active garden, or keep it visible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep in garden</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveMut.mutate()} disabled={archiveMut.isPending}>
              Archive plant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={eventToDelete !== null} onOpenChange={(open) => { if (!open) setEventToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this care activity?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from the plant journal and social feed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep activity</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (eventToDelete) deleteEventMut.mutate(eventToDelete); }}
              disabled={deleteEventMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete activity
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-10">
        <button onClick={() => confirm("Delete this plant and all its data?") && deleteMut.mutate()} className="text-xs text-destructive flex items-center gap-1 hover:underline">
          <Trash2 className="w-3.5 h-3.5" /> Delete plant
        </button>
      </div>
    </div>
  );
}

type EventType = "watering" | "fertilizing" | "pruning" | "repotting" | "flowering" | "deceased";

const EVENT_OPTIONS: { value: EventType; label: string; icon: React.ElementType }[] = [
  { value: "watering", label: "Watering", icon: Droplets },
  { value: "fertilizing", label: "Fertilizing", icon: Sprout },
  { value: "pruning", label: "Pruning", icon: Scissors },
  { value: "repotting", label: "Repotting", icon: PackageOpen },
  { value: "flowering", label: "Flowering", icon: Flower2 },
  { value: "deceased", label: "Deceased", icon: Leaf },
];

function ActivityForm({ plantId, onCancel, onDone }: { plantId: string; onCancel: () => void; onDone: (eventType: EventType) => void }) {
  const [eventType, setEventType] = useState<EventType>("watering");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [product, setProduct] = useState("");
  const [details, setDetails] = useState("");
  const mutation = useMutation({
    mutationFn: () => logPlantEvent({ data: {
      plant_id: plantId,
      event_type: eventType,
      amount_ml: eventType === "watering" && amount ? Number(amount) : null,
      notes: notes || null,
      metadata: eventType === "fertilizing"
        ? { product: product || null, amount: details || null }
        : eventType === "repotting"
          ? { pot_or_soil: details || null }
          : {},
    } }),
    onSuccess: () => { toast.success("Care activity saved"); onDone(eventType); },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-4 rounded-lg border border-border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-display text-lg font-semibold">Log care activity</h2><p className="text-sm text-muted-foreground">Add this moment to the plant’s journal.</p></div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Activity</span>
          <Select value={eventType} onValueChange={(value) => setEventType(value as EventType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EVENT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </label>
        {eventType === "watering" && <TextInput label="Amount (ml), optional" value={amount} onChange={setAmount} type="number" />}
        {eventType === "fertilizing" && <TextInput label="Fertilizer product, optional" value={product} onChange={setProduct} />}
        {eventType === "fertilizing" && <TextInput label="Amount, optional" value={details} onChange={setDetails} />}
        {eventType === "repotting" && <TextInput label="Pot or soil details, optional" value={details} onChange={setDetails} />}
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Notes, optional</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={1000} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
      </div>
      {eventType === "deceased" && <p className="mt-3 text-xs text-muted-foreground">After saving, Sentia will ask whether you also want to archive this plant.</p>}
      <Button className="mt-4" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save activity"}</Button>
    </section>
  );
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span><input type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" /></label>;
}

function PlantEventRow({ event, onDelete }: { event: { event_type: string; occurred_at: string; amount_ml: number | null; notes: string | null; source: string; metadata: unknown }; onDelete?: () => void }) {
  const option = EVENT_OPTIONS.find((item) => item.value === event.event_type);
  const Icon = option?.icon ?? Leaf;
  const metadata = (event.metadata ?? {}) as { product?: string | null; amount?: string | null; pot_or_soil?: string | null };
  const detail = event.event_type === "watering" && event.amount_ml
    ? `${event.amount_ml} ml`
    : event.event_type === "fertilizing"
      ? [metadata.product, metadata.amount].filter(Boolean).join(" · ")
      : event.event_type === "repotting"
        ? metadata.pot_or_soil
        : null;

  return (
    <li className="flex items-start gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">{option?.label ?? event.event_type}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {format(new Date(event.occurred_at), "MMM d, yyyy · HH:mm")}
            {onDelete && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label={`Delete ${option?.label ?? event.event_type} activity`} title="Delete activity"><Trash2 className="h-3.5 w-3.5" /></Button>}
          </span>
        </div>
        {(detail || event.notes) && <p className="mt-0.5 text-xs text-muted-foreground">{[detail, event.notes].filter(Boolean).join(" · ")}</p>}
        {event.source === "sensor" && <span className="mt-1 inline-block text-[10px] uppercase text-muted-foreground">Automatic</span>}
      </div>
    </li>
  );
}

function EnvironmentControl({
  plantId,
  value,
  speciesEnvironment,
  speciesNotes,
  onChanged,
}: {
  plantId: string;
  value: unknown;
  speciesEnvironment: string | null;
  speciesNotes: string | null;
  onChanged: () => void;
}) {
  const current = value === "outdoor" ? "outdoor" : "indoor";
  const mut = useMutation({
    mutationFn: (environment: "indoor" | "outdoor") =>
      updatePlantEnvironment({ data: { plant_id: plantId, environment } }),
    onSuccess: (_r, environment) => { toast.success(`Marked as ${environment}`); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full border border-border overflow-hidden">
        {(["indoor", "outdoor"] as const).map((env) => (
          <button
            key={env}
            onClick={() => current !== env && mut.mutate(env)}
            disabled={mut.isPending}
            className={`px-3 py-1 text-xs capitalize ${current === env ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {env}
          </button>
        ))}
      </div>
      {speciesEnvironment && speciesEnvironment !== "unknown" && (
        <span
          title={speciesNotes ?? undefined}
          className="text-xs text-muted-foreground inline-flex items-center gap-1"
        >
          Typically <EnvironmentBadge value={speciesEnvironment} />
        </span>
      )}
    </div>
  );
}

function DeviceIdChip({ deviceId }: { deviceId: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      toast.success("Device ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <button
      onClick={handleCopy}
      title={`Sensor device ID: ${deviceId} (click to copy)`}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
    >
      <Cpu className="w-3 h-3" />
      <span className="max-w-[140px] truncate font-mono">{deviceId}</span>
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function Metric({ icon: Icon, label, value, sub, hint }: { icon: React.ElementType; label: string; value: string; sub?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="w-3.5 h-3.5" /> {label}
        {hint && <SensorHint text={hint} />}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function ManualReadingForm({ plantId, onDone }: { plantId: string; onDone: () => void }) {
  const [moisture, setMoisture] = useState("");
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");
  const [light, setLight] = useState("");
  const mut = useMutation({
    mutationFn: () => addManualReading({ data: {
      plant_id: plantId,
      soil_moisture: moisture ? Number(moisture) : null,
      temperature_c: temp ? Number(temp) : null,
      humidity: humidity ? Number(humidity) : null,
      light_lux: light ? Number(light) : null,
    } }),
    onSuccess: () => { toast.success("Reading saved"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <input placeholder="Moisture %" value={moisture} onChange={(e) => setMoisture(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm" />
      <input placeholder="Temp °C" value={temp} onChange={(e) => setTemp(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm" />
      <input placeholder="Humidity %" value={humidity} onChange={(e) => setHumidity(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm" />
      <input placeholder="Light lx" value={light} onChange={(e) => setLight(e.target.value)} className="px-3 py-2 rounded-md border border-input bg-background text-sm" />
      <button onClick={() => mut.mutate()} disabled={mut.isPending} className="col-span-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">Save reading</button>
    </div>
  );
}

function Snapshot({ path, alt, embedded = false }: { path: string | null; alt: string; embedded?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    supabase.storage
      .from("plant-snapshots")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast.error(`Snapshot error: ${error.message}`);
        } else if (data?.signedUrl) {
          setUrl(data.signedUrl);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [path]);

  if (!path) return null;
  const content = (
    <>
      <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
        <Camera className="w-5 h-5 text-primary" /> Latest snapshot
      </h2>
      {loading || url ? (
        <img
          src={url || undefined}
          alt={alt}
          className="rounded-xl w-full max-h-96 object-contain bg-black/5"
          loading="lazy"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Loading snapshot…</p>
      )}
    </>
  );
  if (embedded) return <div className="mt-5 border-t border-border pt-5">{content}</div>;
  return <section className="mt-6 rounded-lg border border-border bg-card p-5">{content}</section>;
}
