// Pure weather + care rule engine. No server imports — safe on client and server.

export type LightNeed = "low" | "medium" | "bright" | "direct";

export interface DailyWeather {
  date: string; // YYYY-MM-DD
  temp_max: number | null;
  temp_min: number | null;
  humidity_mean: number | null;
  uv_index_max: number | null;
  precipitation_probability_max: number | null;
  sunshine_hours: number | null;
  weather_code: number | null;
}

export interface WeatherSnapshot {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    temperature: number | null;
    humidity: number | null;
    weather_code: number | null;
    is_day: boolean;
  };
  daily: DailyWeather[];
}

export interface SpeciesCare {
  light: string | null;
  temperature_min_c: number | null;
  temperature_max_c: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
  water_frequency_days: number | null;
}

export type AlertRule =
  | "heat_stress"
  | "cold_stress"
  | "dry_air"
  | "strong_sun"
  | "fast_drying"
  | "dull_spell";

export interface WeatherAlert {
  rule: AlertRule;
  severity: "info" | "warning";
  title: string;
  message: string;
}

/** Species `light` is free text, so classify it by keywords. */
export function classifyLight(light: string | null | undefined): LightNeed {
  const t = (light ?? "").toLowerCase();
  if (!t) return "medium";
  if (t.includes("full sun") || t.includes("direct sun") || t.includes("full direct")) return "direct";
  if (t.includes("low light") || t.startsWith("low") || t.includes("shade")) return "low";
  if (t.includes("bright")) return "bright";
  if (t.includes("indirect") || t.includes("medium") || t.includes("partial")) return "medium";
  return "medium";
}

export function weatherCodeLabel(code: number | null | undefined): string {
  const c = code ?? -1;
  if (c === 0) return "Clear";
  if (c <= 2) return "Partly cloudy";
  if (c === 3) return "Overcast";
  if (c === 45 || c === 48) return "Fog";
  if (c >= 51 && c <= 57) return "Drizzle";
  if (c >= 61 && c <= 67) return "Rain";
  if (c >= 71 && c <= 77) return "Snow";
  if (c >= 80 && c <= 82) return "Showers";
  if (c >= 95) return "Thunderstorm";
  return "—";
}

/** Emoji-free icon key so callers can map to their own icon set. */
export function weatherIconKey(code: number | null | undefined, isDay = true): "sun" | "cloud-sun" | "cloud" | "cloud-rain" | "snowflake" | "cloud-lightning" | "cloud-fog" {
  const c = code ?? -1;
  if (c === 0) return isDay ? "sun" : "cloud-sun";
  if (c <= 2) return "cloud-sun";
  if (c === 3) return "cloud";
  if (c === 45 || c === 48) return "cloud-fog";
  if (c >= 95) return "cloud-lightning";
  if (c >= 71 && c <= 77) return "snowflake";
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return "cloud-rain";
  return "cloud";
}

export function evaluateWeatherRules(
  nickname: string,
  species: SpeciesCare | null,
  weather: WeatherSnapshot,
): WeatherAlert[] {
  const today = weather.daily[0];
  if (!today || !species) return [];
  const alerts: WeatherAlert[] = [];
  const lightNeed = classifyLight(species.light);

  const hot = species.temperature_max_c != null && today.temp_max != null && today.temp_max > species.temperature_max_c;
  const cold = species.temperature_min_c != null && today.temp_min != null && today.temp_min < species.temperature_min_c;
  const dryToday = species.humidity_min != null && today.humidity_mean != null && today.humidity_mean < species.humidity_min - 10;
  const sunny = (today.uv_index_max ?? 0) >= 6 || (today.sunshine_hours ?? 0) >= 8;

  if (hot) {
    alerts.push({
      rule: "heat_stress",
      severity: "warning",
      title: `${nickname}: hot day ahead`,
      message: `It reaches ${Math.round(today.temp_max as number)}°C today, above this plant's comfort ceiling of ${species.temperature_max_c}°C. Check the soil and move it away from hot glass.`,
    });
  }

  if (cold) {
    alerts.push({
      rule: "cold_stress",
      severity: "warning",
      title: `${nickname}: cold night`,
      message: `Lows of ${Math.round(today.temp_min as number)}°C are below its ${species.temperature_min_c}°C minimum. Keep it off cold windowsills and away from draughts.`,
    });
  }

  // Dry air needs two consecutive days below the species minimum.
  const second = weather.daily[1];
  const drySecond = species.humidity_min != null && second?.humidity_mean != null && second.humidity_mean < species.humidity_min - 10;
  if (dryToday && drySecond) {
    alerts.push({
      rule: "dry_air",
      severity: "info",
      title: `${nickname}: dry air spell`,
      message: `Humidity sits near ${Math.round(today.humidity_mean as number)}% for a second day, under its ${species.humidity_min}% preference. Mist it or group plants together — soil will dry faster too.`,
    });
  }

  if (sunny && (lightNeed === "low" || lightNeed === "medium")) {
    alerts.push({
      rule: "strong_sun",
      severity: "info",
      title: `${nickname}: strong sun today`,
      message: `UV peaks around ${Math.round(today.uv_index_max ?? 0)}. This one prefers ${lightNeed === "low" ? "low" : "indirect"} light — pull it back from the window this afternoon.`,
    });
  }

  if (hot && dryToday && sunny) {
    alerts.push({
      rule: "fast_drying",
      severity: "warning",
      title: `${nickname}: soil will dry fast`,
      message: "Hot, dry and sunny all at once. Bring your next watering forward by about a day and check the top 2 cm of soil today.",
    });
  }

  // Long dull spell: 3+ days of overcast/low sunshine for a bright-light plant.
  const dullDays = weather.daily.slice(0, 3).filter((d) => (d.sunshine_hours ?? 0) < 2 || (d.weather_code ?? 0) === 3).length;
  if (dullDays >= 3 && (lightNeed === "bright" || lightNeed === "direct")) {
    alerts.push({
      rule: "dull_spell",
      severity: "info",
      title: `${nickname}: dull stretch coming`,
      message: "Three overcast days in a row and this plant likes bright light. Consider a brighter spot and hold off on extra water.",
    });
  }

  return alerts;
}
