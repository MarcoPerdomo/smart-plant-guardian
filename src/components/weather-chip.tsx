import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Snowflake,
  Droplets,
  MapPin,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { getWeatherForMe, getWeatherAt } from "@/lib/weather.functions";
import { weatherCodeLabel, weatherIconKey, type WeatherSnapshot } from "@/lib/weather-rules";

const ICONS = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-fog": CloudFog,
  snowflake: Snowflake,
} as const;

function WeatherIcon({ code, isDay, className }: { code: number | null; isDay?: boolean; className?: string }) {
  const Icon = ICONS[weatherIconKey(code, isDay ?? true)];
  return <Icon className={className} />;
}

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, close]);
  return ref;
}

/** Header chip for signed-in users: current weather + today's plant alerts. */
export function WeatherChip() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const { data, isLoading } = useQuery({
    queryKey: ["weather", "me"],
    queryFn: () => getWeatherForMe(),
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const today = data?.weather?.daily?.[0];
  const alerts = data?.alerts ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2.5 py-1.5 rounded-md hover:bg-muted flex items-center gap-1.5 text-sm"
        aria-label="Weather and plant alerts"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : data?.needsLocation ? (
          <MapPin className="w-4 h-4 text-muted-foreground" />
        ) : (
          <WeatherIcon code={data?.weather?.current.weather_code ?? null} isDay={data?.weather?.current.is_day} className="w-4 h-4 text-primary" />
        )}
        <span className="hidden sm:inline font-medium">
          {data?.needsLocation
            ? "Set location"
            : data?.weather?.current.temperature != null
              ? `${Math.round(data.weather.current.temperature)}°`
              : "—"}
        </span>
        {alerts.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/20 text-warning-foreground">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-lg p-4 z-50 text-left">
          {data?.needsLocation ? (
            <div className="text-sm">
              <p className="font-medium">No location set</p>
              <p className="text-muted-foreground text-xs mt-1">
                Add your city in Settings to get weather-aware care alerts.
              </p>
              <Link to="/settings" onClick={() => setOpen(false)} className="mt-3 inline-block text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
                Open settings
              </Link>
            </div>
          ) : data?.weather ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display text-lg font-semibold">
                    {Math.round(data.weather.current.temperature ?? 0)}°C
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {weatherCodeLabel(data.weather.current.weather_code)}
                    {data.place?.city ? ` · ${data.place.city}` : ""}
                  </div>
                </div>
                <WeatherIcon code={data.weather.current.weather_code} isDay={data.weather.current.is_day} className="w-8 h-8 text-primary" />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                <Metric label="High" value={today?.temp_max != null ? `${Math.round(today.temp_max)}°` : "—"} />
                <Metric label="Low" value={today?.temp_min != null ? `${Math.round(today.temp_min)}°` : "—"} />
                <Metric label="Humidity" value={today?.humidity_mean != null ? `${today.humidity_mean}%` : "—"} />
                <Metric label="UV" value={today?.uv_index_max != null ? `${Math.round(today.uv_index_max)}` : "—"} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                <Droplets className="w-3 h-3" /> {today?.precipitation_probability_max ?? 0}% chance of rain today
              </div>

              <div className="mt-4 border-t border-border pt-3">
                {alerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No weather warnings for your plants today.</p>
                ) : (
                  <ul className="space-y-2 max-h-56 overflow-y-auto">
                    {alerts.map((a) => (
                      <li key={`${a.plant_id}-${a.rule}`} className="text-xs">
                        <Link
                          to="/plants/$id"
                          params={{ id: a.plant_id }}
                          onClick={() => setOpen(false)}
                          className="font-medium hover:text-primary flex items-center gap-1"
                        >
                          <AlertTriangle className={`w-3.5 h-3.5 ${a.severity === "warning" ? "text-warning" : "text-muted-foreground"}`} />
                          {a.title}
                        </Link>
                        <p className="text-muted-foreground mt-0.5">{a.message}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Weather unavailable right now.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 py-1.5">
      <div className="font-semibold text-xs">{value}</div>
      <div className="uppercase tracking-wide text-muted-foreground text-[9px]">{label}</div>
    </div>
  );
}

/** Landing-page variant: asks for browser location only on click. */
export function VisitorWeatherChip() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [state, setState] = useState<"idle" | "asking" | "denied">("idle");
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);

  async function request() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return setState("denied");
    setState("asking");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setCoords(c);
        try {
          const snap = await getWeatherAt({ data: { latitude: c.lat, longitude: c.lon } });
          setSnapshot(snap);
          setState("idle");
        } catch {
          setState("denied");
        }
      },
      () => setState("denied"),
      { timeout: 8000 },
    );
  }

  if (!coords || !snapshot) {
    return (
      <button
        onClick={request}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/70 backdrop-blur text-xs text-muted-foreground hover:bg-muted"
      >
        {state === "asking" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudSun className="w-3.5 h-3.5 text-primary" />}
        {state === "denied" ? "Weather unavailable" : "Show local weather"}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/70 backdrop-blur text-xs">
      <WeatherIcon code={snapshot.current.weather_code} isDay={snapshot.current.is_day} className="w-3.5 h-3.5 text-primary" />
      <span className="font-medium">{Math.round(snapshot.current.temperature ?? 0)}°C</span>
      <span className="text-muted-foreground">{weatherCodeLabel(snapshot.current.weather_code)}</span>
      <span className="text-muted-foreground">· Sign in to get plant alerts</span>
    </div>
  );
}
