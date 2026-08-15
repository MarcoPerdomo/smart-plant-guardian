// Server-only Open-Meteo access with a shared database cache.
import type { WeatherSnapshot, DailyWeather } from "./weather-rules";

const CACHE_TTL_MINUTES = 45;

export interface CityResult {
  name: string;
  region: string | null;
  country_code: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

export async function geocodeCity(q: string): Promise<CityResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const json = (await resp.json()) as { results?: Array<Record<string, unknown>> };
  return (json.results ?? []).map((r) => ({
    name: String(r["name"] ?? ""),
    region: (r["admin1"] as string | undefined) ?? null,
    country_code: (r["country_code"] as string | undefined) ?? null,
    latitude: Number(r["latitude"]),
    longitude: Number(r["longitude"]),
    timezone: (r["timezone"] as string | undefined) ?? null,
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<CityResult | null> {
  // Open-Meteo has no reverse endpoint; fall back to the forecast timezone only.
  const snap = await fetchWeather(lat, lon);
  return {
    name: "",
    region: null,
    country_code: null,
    latitude: lat,
    longitude: lon,
    timezone: snap.timezone,
  };
}

function roundCoord(v: number): number {
  return Math.round(v * 100) / 100;
}

function mapForecast(json: Record<string, any>): WeatherSnapshot {
  const daily = json["daily"] ?? {};
  const hourly = json["hourly"] ?? {};
  const times: string[] = daily["time"] ?? [];

  // Mean relative humidity per day, computed from the hourly series.
  const hTimes: string[] = hourly["time"] ?? [];
  const hHum: Array<number | null> = hourly["relative_humidity_2m"] ?? [];
  const humByDay = new Map<string, { sum: number; n: number }>();
  hTimes.forEach((t, i) => {
    const day = t.slice(0, 10);
    const v = hHum[i];
    if (v == null) return;
    const cur = humByDay.get(day) ?? { sum: 0, n: 0 };
    cur.sum += v;
    cur.n += 1;
    humByDay.set(day, cur);
  });

  const days: DailyWeather[] = times.map((t, i) => {
    const hum = humByDay.get(t);
    return {
      date: t,
      temp_max: daily["temperature_2m_max"]?.[i] ?? null,
      temp_min: daily["temperature_2m_min"]?.[i] ?? null,
      humidity_mean: hum && hum.n > 0 ? Math.round(hum.sum / hum.n) : null,
      uv_index_max: daily["uv_index_max"]?.[i] ?? null,
      precipitation_probability_max: daily["precipitation_probability_max"]?.[i] ?? null,
      sunshine_hours: daily["sunshine_duration"]?.[i] != null ? Number(daily["sunshine_duration"][i]) / 3600 : null,
      weather_code: daily["weather_code"]?.[i] ?? null,
    };
  });

  const current = json["current"] ?? {};
  return {
    latitude: Number(json["latitude"]),
    longitude: Number(json["longitude"]),
    timezone: String(json["timezone"] ?? "UTC"),
    current: {
      temperature: current["temperature_2m"] ?? null,
      humidity: current["relative_humidity_2m"] ?? null,
      weather_code: current["weather_code"] ?? null,
      is_day: current["is_day"] === 1 || current["is_day"] === true,
    },
    daily: days,
  };
}

/** Fetch live weather for a coordinate, using the shared weather_cache table. */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const rLat = roundCoord(lat);
  const rLon = roundCoord(lon);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: cached } = await supabaseAdmin
    .from("weather_cache")
    .select("payload, fetched_at")
    .eq("lat", rLat)
    .eq("lon", rLon)
    .maybeSingle();

  if (cached?.fetched_at) {
    const ageMin = (Date.now() - new Date(cached.fetched_at).getTime()) / 60000;
    if (ageMin < CACHE_TTL_MINUTES) return cached.payload as unknown as WeatherSnapshot;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${rLat}&longitude=${rLon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,is_day` +
    `&hourly=relative_humidity_2m` +
    `&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunshine_duration,weather_code` +
    `&forecast_days=4&timezone=auto`;

  const resp = await fetch(url);
  if (!resp.ok) {
    if (cached?.payload) return cached.payload as unknown as WeatherSnapshot;
    throw new Error("Weather service unavailable");
  }
  const snapshot = mapForecast(await resp.json());

  await supabaseAdmin
    .from("weather_cache")
    .upsert(
      { lat: rLat, lon: rLon, payload: JSON.parse(JSON.stringify(snapshot)), fetched_at: new Date().toISOString() },
      { onConflict: "lat,lon" },
    );

  return snapshot;
}
