import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateWeatherRules, type SpeciesCare, type WeatherSnapshot } from "@/lib/weather-rules";

export interface PlantWeatherAlert {
  plant_id: string;
  nickname: string;
  rule: string;
  severity: string;
  title: string;
  message: string;
}

export const searchCities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().min(2) }).parse(i))
  .handler(async ({ data }) => {
    const { geocodeCity } = await import("@/lib/weather.server");
    return geocodeCity(data.q.trim());
  });

export const saveLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        city: z.string().nullable(),
        region: z.string().nullable(),
        country_code: z.string().nullable(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        timezone: z.string().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    let timezone = data.timezone;
    if (!timezone) {
      const { fetchWeather } = await import("@/lib/weather.server");
      timezone = (await fetchWeather(data.latitude, data.longitude)).timezone;
    }
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, ...data, timezone });
    if (error) throw new Error(error.message);
    return { ok: true, timezone };
  });

export const clearLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ city: null, region: null, country_code: null, latitude: null, longitude: null, timezone: null })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: plain weather for a coordinate (landing-page visitor chip). */
export const getWeatherAt = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(i),
  )
  .handler(async ({ data }) => {
    const { fetchWeather } = await import("@/lib/weather.server");
    return fetchWeather(data.latitude, data.longitude);
  });

/** Signed-in: weather for the saved location + today's plant alerts. */
export const getWeatherForMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("city, region, country_code, latitude, longitude, timezone, notify_in_app")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.latitude || !profile?.longitude) {
      return { needsLocation: true as const, weather: null, alerts: [] as PlantWeatherAlert[], place: null };
    }

    const { fetchWeather } = await import("@/lib/weather.server");
    const weather: WeatherSnapshot = await fetchWeather(Number(profile.latitude), Number(profile.longitude));

    const { data: plants } = await context.supabase
      .from("user_plants")
      .select("id, nickname, plant_species(light, temperature_min_c, temperature_max_c, humidity_min, humidity_max, water_frequency_days)")
      .is("archived_at", null);

    const alerts: PlantWeatherAlert[] = [];
    for (const p of plants ?? []) {
      const species = (p as unknown as { plant_species: SpeciesCare | null }).plant_species;
      for (const a of evaluateWeatherRules(p.nickname, species, weather)) {
        alerts.push({ plant_id: p.id, nickname: p.nickname, ...a });
      }
    }

    if (alerts.length > 0) {
      const forDate = weather.daily[0]?.date ?? new Date().toISOString().slice(0, 10);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: inserted } = await supabaseAdmin
        .from("plant_weather_alerts")
        .upsert(
          alerts.map((a) => ({
            plant_id: a.plant_id,
            user_id: context.userId,
            rule: a.rule,
            severity: a.severity,
            title: a.title,
            message: a.message,
            for_date: forDate,
          })),
          { onConflict: "plant_id,rule,for_date", ignoreDuplicates: true },
        )
        .select("plant_id, rule, title, message");

      // Only freshly-created alerts become in-app notifications.
      if (profile.notify_in_app && inserted && inserted.length > 0) {
        await supabaseAdmin.from("notifications").insert(
          inserted.map((a) => ({
            user_id: context.userId,
            plant_id: a.plant_id,
            title: a.title,
            body: a.message,
          })),
        );
      }
    }

    return {
      needsLocation: false as const,
      weather,
      alerts,
      place: {
        city: profile.city,
        region: profile.region,
        country_code: profile.country_code,
        timezone: profile.timezone,
      },
    };
  });
