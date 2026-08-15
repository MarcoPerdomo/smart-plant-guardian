import { createFileRoute } from "@tanstack/react-router";
import { evaluateWeatherRules, weatherCodeLabel, type SpeciesCare } from "@/lib/weather-rules";

/**
 * Daily weather digest sender.
 *
 * Called once a day by a scheduler with header `x-digest-secret: <WEATHER_DIGEST_SECRET>`.
 * Sends one email per user who has a saved location and the email toggle on.
 */
export const Route = createFileRoute("/api/public/weather-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WEATHER_DIGEST_SECRET"];
        if (!secret || request.headers.get("x-digest-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { fetchWeather } = await import("@/lib/weather.server");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id, email, display_name, city, region, country_code, latitude, longitude, timezone")
          .eq("notify_email", true)
          .not("latitude", "is", null)
          .not("longitude", "is", null);
        if (error) return new Response(error.message, { status: 500 });

        const appUrl = process.env["APP_URL"] ?? "https://verdant-nl.app";
        let sent = 0;
        let skipped = 0;
        const failures: string[] = [];

        for (const p of profiles ?? []) {
          if (!p.email) {
            skipped++;
            continue;
          }
          try {
            const weather = await fetchWeather(Number(p.latitude), Number(p.longitude));
            const today = weather.daily[0];
            const forDate = today?.date ?? new Date().toISOString().slice(0, 10);

            const { data: plants } = await supabaseAdmin
              .from("user_plants")
              .select(
                "id, nickname, plant_species(light, temperature_min_c, temperature_max_c, humidity_min, humidity_max, water_frequency_days)",
              )
              .eq("user_id", p.id)
              .is("archived_at", null);

            const alerts: Array<{
              plant_id: string;
              nickname: string;
              rule: string;
              severity: string;
              title: string;
              message: string;
            }> = [];
            for (const plant of plants ?? []) {
              const species = (plant as unknown as { plant_species: SpeciesCare | null }).plant_species;
              for (const a of evaluateWeatherRules(plant.nickname, species, weather)) {
                alerts.push({ plant_id: plant.id, nickname: plant.nickname, ...a });
              }
            }

            if (alerts.length === 0) {
              skipped++;
              continue;
            }

            await supabaseAdmin.from("plant_weather_alerts").upsert(
              alerts.map((a) => ({
                plant_id: a.plant_id,
                user_id: p.id,
                rule: a.rule,
                severity: a.severity,
                title: a.title,
                message: a.message,
                for_date: forDate,
              })),
              { onConflict: "plant_id,rule,for_date", ignoreDuplicates: true },
            );

            const place = [p.city, p.region ?? null, p.country_code ?? null].filter(Boolean).join(", ");
            const result = await sendTemplateEmail("weather-digest", p.email, {
              idempotencyKey: `weather-digest-${p.id}-${forDate}`,
              templateData: {
                displayName: p.display_name ?? null,
                place: place || null,
                dateLabel: new Date(`${forDate}T12:00:00Z`).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }),
                high: today?.temp_max ?? null,
                low: today?.temp_min ?? null,
                condition: weatherCodeLabel(today?.weather_code ?? null),
                alerts: alerts.map((a) => ({
                  nickname: a.nickname,
                  title: a.title,
                  message: a.message,
                  severity: a.severity,
                })),
                appUrl,
              },
            });

            if (result.sent) sent++;
            else skipped++;
          } catch (e) {
            failures.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }

        return Response.json({ ok: true, sent, skipped, failures });
      },
    },
  },
});
