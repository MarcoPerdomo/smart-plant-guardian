import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPlant, generateSummary, logWatering, addManualReading, deletePlant } from "@/lib/plants.functions";
import { computeStatus, predictNextWatering } from "@/lib/plant-status";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Droplets, Sparkles, Trash2, Sun, Thermometer, Camera, CloudSun, RefreshCw, Cpu, Copy, Check } from "lucide-react";
import { SensorHint, SENSOR_HINTS } from "@/components/sensor-hint";
import { getWeatherForMe } from "@/lib/weather.functions";
import { formatDistanceToNow, format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { LatestPhotoCard } from "@/components/plant-photos";


export const Route = createFileRoute("/_authenticated/plants/$id")({
  component: PlantDetail,
  head: ({ params }) => ({
    meta: [
      { title: "Plant — Verdant" },
      { name: "description", content: "Detailed sensor history and AI care guidance for your plant." },
      { property: "og:title", content: "Plant — Verdant" },
      { property: "og:description", content: "Detailed sensor history and AI care guidance for your plant." },
      { property: "og:url", content: `https://verdant-nl.app/plants/${params.id}` },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `https://verdant-nl.app/plants/${params.id}` }],
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
    const channel = supabase
      .channel(`sensor_readings:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sensor_readings", filter: `plant_id=eq.${id}` },
        () => { qc.invalidateQueries({ queryKey: ["plant", id] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  const { data: weather } = useQuery({
    queryKey: ["weather", "me"],
    queryFn: () => getWeatherForMe(),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const plantAlerts = (weather?.alerts ?? []).filter((a) => a.plant_id === id);
  const [showManual, setShowManual] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["plant", id] });

  const summaryMut = useMutation({
    mutationFn: () => generateSummary({ data: { plant_id: id } }),
    onSuccess: () => { toast.success("New AI summary"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const waterMut = useMutation({
    mutationFn: () => logWatering({ data: { plant_id: id, amount_ml: null } }),
    onSuccess: () => { toast.success("Watered!"); invalidate(); },
  });
  const deleteMut = useMutation({
    mutationFn: () => deletePlant({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); navigate({ to: "/dashboard" }); },
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  const { plant, readings, waterings, summaries } = data;
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
    humidity: r.humidity,
    temp: r.temperature_c,
  }));

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-4xl font-semibold">{plant.nickname}</h1>
            {plant.device_id && <DeviceIdChip deviceId={plant.device_id} />}
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
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {latest?.recorded_at
              ? `Last reading ${formatDistanceToNow(new Date(latest.recorded_at), { addSuffix: true })}`
              : "No sensor readings yet"}
            <span className="opacity-60">· updated {formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh sensor data"
            className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => waterMut.mutate()} className="px-3 py-2 rounded-lg border border-border text-sm flex items-center gap-1.5 hover:bg-muted">
            <Droplets className="w-4 h-4" /> Log watering
          </button>
          <button onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-1.5 disabled:opacity-50">
            <Sparkles className="w-4 h-4" /> {summaryMut.isPending ? "Thinking…" : "AI check"}
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Metric icon={Droplets} label="Moisture" hint={SENSOR_HINTS.moisture} value={latest?.soil_moisture != null ? `${Math.round(latest.soil_moisture)}%` : "—"} sub={species?.soil_moisture_min != null ? `Target ${species.soil_moisture_min}-${species.soil_moisture_max}%` : ""} />
        <Metric icon={Thermometer} label="Temp" hint={SENSOR_HINTS.temp} value={latest?.temperature_c != null ? `${latest.temperature_c.toFixed(1)}°C` : "—"} sub={species?.temperature_min_c != null ? `${species.temperature_min_c}-${species.temperature_max_c}°C` : ""} />
        <Metric icon={Sun} label="Light" hint={SENSOR_HINTS.light} value={latest?.light_lux != null ? `${Math.round(latest.light_lux)}%` : "—"} sub={species?.light ?? ""} />
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Status</div>
          <div className="font-display text-2xl font-semibold">{status.label}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Next watering</div>
          <div className="font-display text-2xl font-semibold">{nextWater.label}</div>
        </div>
      </div>

      {plantAlerts.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-5">
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

      <LatestPhotoCard plantId={plant.id} plantName={plant.nickname} />

      <Snapshot path={latest?.snapshot_url ?? null} alt={`Snapshot of ${plant.nickname}`} />


      {readings.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Sensor history</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="moisture" stroke="var(--primary)" strokeWidth={2} dot={false} name="Moisture %" />
                <Line type="monotone" dataKey="humidity" stroke="var(--accent)" strokeWidth={2} dot={false} name="Humidity %" />
                <Line type="monotone" dataKey="temp" stroke="var(--warning)" strokeWidth={2} dot={false} name="Temp °C" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-lg font-semibold">AI summaries</h2>
          <button onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending} className="text-xs text-primary">Regenerate</button>
        </div>
        {summaries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No summaries yet. Tap AI check to generate one.</p>
        ) : (
          <div className="space-y-3">
            {summaries.map((s) => (
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
          </div>
        )}
      </section>

      {species && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
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

      <section className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-lg font-semibold">Manual reading</h2>
          <button onClick={() => setShowManual(!showManual)} className="text-xs text-primary">{showManual ? "Hide" : "Add"}</button>
        </div>
        {showManual && <ManualReadingForm plantId={id} onDone={() => { setShowManual(false); invalidate(); }} />}
      </section>

      {waterings.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Watering log</h2>
          <ul className="space-y-1 text-sm">
            {waterings.map((w) => (
              <li key={w.id} className="flex justify-between border-b border-border/60 py-1.5">
                <span>{format(new Date(w.watered_at), "MMM d, yyyy · HH:mm")}</span>
                <span className="text-muted-foreground">{w.amount_ml ? `${w.amount_ml} ml` : "watered"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <button onClick={() => confirm("Delete this plant and all its data?") && deleteMut.mutate()} className="text-xs text-destructive flex items-center gap-1 hover:underline">
          <Trash2 className="w-3.5 h-3.5" /> Delete plant
        </button>
      </div>
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

function Snapshot({ path, alt }: { path: string | null; alt: string }) {
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
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
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
    </section>
  );
}
