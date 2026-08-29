import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// POST /api/public/ingest
// Headers: X-Ingest-Secret: <ARDUINO_INGEST_SECRET>
// Body: { device_id: string, soil_moisture?: number, temperature_c?: number,
//         humidity?: number, light_lux?: number, motion_events?: number, extra?: object }
const ReadingSchema = z.object({
  device_id: z.string().min(1),
  soil_moisture: z.number().optional(),
  temperature_c: z.number().optional(),
  humidity: z.number().optional(),
  light_lux: z.number().optional(),
  motion_events: z.number().int().optional(),
  extra: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
        const secret = normalizeSecret(process.env.ARDUINO_INGEST_SECRET);
        if (!secret) return jsonError(500, "Ingestion not configured");
        const provided = normalizeSecret(request.headers.get("x-ingest-secret"));
        if (!provided || provided !== secret) return jsonError(401, "Invalid ingest secret");

        let payload: unknown;
        try { payload = await request.json(); } catch { return jsonError(400, "Invalid JSON"); }
        const parsed = ReadingSchema.safeParse(payload);
        if (!parsed.success) return jsonError(400, parsed.error.message);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: plant, error: pErr } = await supabaseAdmin
          .from("user_plants").select("id, user_id, user_email, nickname").eq("device_id", parsed.data.device_id).maybeSingle();
        if (pErr) return jsonError(500, pErr.message);
        if (!plant) return jsonError(404, `No plant registered for device_id "${parsed.data.device_id}"`);

        const extra = parsed.data.extra ?? null;
        const snapshot_url =
          extra && typeof extra.snapshot_url === "string" ? extra.snapshot_url : null;
        const cleanedExtra = extra ? { ...extra } : null;
        if (cleanedExtra) delete cleanedExtra.snapshot_url;

        // Grab the previous reading before inserting the new one (moisture-spike detection).
        const { data: prev } = await supabaseAdmin
          .from("sensor_readings")
          .select("soil_moisture, recorded_at")
          .eq("plant_id", plant.id)
          .not("soil_moisture", "is", null)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: insErr } = await supabaseAdmin.from("sensor_readings").insert({
          plant_id: plant.id,
          user_email: plant.user_email,
          soil_moisture: parsed.data.soil_moisture ?? null,
          temperature_c: parsed.data.temperature_c ?? null,
          humidity: parsed.data.humidity ?? null,
          light_lux: parsed.data.light_lux ?? null,
          motion_events: parsed.data.motion_events ?? null,
          extra: (cleanedExtra as never) ?? null,
          snapshot_url,
          source_device: parsed.data.device_id,
        });
        if (insErr) return jsonError(500, insErr.message);

        let auto_watering_logged = false;
        try {
          auto_watering_logged = await maybeAutoLogWatering(plant, parsed.data.soil_moisture ?? null, prev);
        } catch (e) {
          console.error("[ingest] auto-watering check failed", e);
        }

        return Response.json({ ok: true, plant_id: plant.id, auto_watering_logged });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unexpected server error";
          console.error("[ingest] failed", message);
          return jsonError(500, message);
        }
      },
      GET: async () => Response.json({
        ok: true,
        usage: "POST JSON with header X-Ingest-Secret. Fields: device_id (required), soil_moisture, temperature_c, humidity, light_lux, motion_events, extra.",
      }),
    },
  },
});

const MOISTURE_SPIKE_PCT = 10;
const AUTO_LOG_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const PREV_READING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** A sudden soil-moisture jump means the plant was just watered — log it and tell the owner. */
async function maybeAutoLogWatering(
  plant: { id: string; user_id: string; user_email: string | null; nickname: string },
  moisture: number | null,
  prev: { soil_moisture: number | null; recorded_at: string } | null,
): Promise<boolean> {
  if (moisture == null || !prev || prev.soil_moisture == null) return false;
  const delta = moisture - prev.soil_moisture;
  if (delta <= MOISTURE_SPIKE_PCT) return false;

  const now = Date.now();
  if (now - new Date(prev.recorded_at).getTime() > PREV_READING_MAX_AGE_MS) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: lastWatering } = await supabaseAdmin
    .from("watering_events")
    .select("watered_at")
    .eq("plant_id", plant.id)
    .order("watered_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastWatering && now - new Date(lastWatering.watered_at).getTime() < AUTO_LOG_COOLDOWN_MS) return false;

  const wateredAt = new Date(now).toISOString();
  const from = Math.round(prev.soil_moisture);
  const to = Math.round(moisture);

  const { error: wErr } = await supabaseAdmin.from("watering_events").insert({
    plant_id: plant.id,
    user_email: plant.user_email,
    watered_at: wateredAt,
    amount_ml: null,
    notes: `Auto-logged from sensor (moisture +${Math.round(delta)}%)`,
  });
  if (wErr) throw new Error(wErr.message);

  await supabaseAdmin.from("user_plants").update({ last_watered_at: wateredAt }).eq("id", plant.id);

  await supabaseAdmin.from("notifications").insert({
    user_id: plant.user_id,
    plant_id: plant.id,
    kind: "watering_auto",
    title: "Watering logged automatically",
    body: `Soil moisture on ${plant.nickname} jumped from ${from}% to ${to}% — we logged a watering for you.`,
    link: `/plants/${plant.id}`,
  });

  return true;
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status, headers: { "Content-Type": "application/json" },
  });
}

function normalizeSecret(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}
