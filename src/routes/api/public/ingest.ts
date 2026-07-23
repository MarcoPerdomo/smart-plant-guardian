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
        const secret = process.env.ARDUINO_INGEST_SECRET;
        if (!secret) return jsonError(500, "Ingestion not configured");
        const provided = request.headers.get("x-ingest-secret");
        if (!provided || provided !== secret) return jsonError(401, "Invalid ingest secret");

        let payload: unknown;
        try { payload = await request.json(); } catch { return jsonError(400, "Invalid JSON"); }
        const parsed = ReadingSchema.safeParse(payload);
        if (!parsed.success) return jsonError(400, parsed.error.message);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: plant, error: pErr } = await supabaseAdmin
          .from("user_plants").select("id, user_id, nickname").eq("device_id", parsed.data.device_id).maybeSingle();
        if (pErr) return jsonError(500, pErr.message);
        if (!plant) return jsonError(404, `No plant registered for device_id "${parsed.data.device_id}"`);

        const { error: insErr } = await supabaseAdmin.from("sensor_readings").insert({
          plant_id: plant.id,
          soil_moisture: parsed.data.soil_moisture ?? null,
          temperature_c: parsed.data.temperature_c ?? null,
          humidity: parsed.data.humidity ?? null,
          light_lux: parsed.data.light_lux ?? null,
          motion_events: parsed.data.motion_events ?? null,
          extra: (parsed.data.extra as never) ?? null,
          source_device: parsed.data.device_id,
        });
        if (insErr) return jsonError(500, insErr.message);

        return Response.json({ ok: true, plant_id: plant.id });
      },
      GET: async () => Response.json({
        ok: true,
        usage: "POST JSON with header X-Ingest-Secret. Fields: device_id (required), soil_moisture, temperature_c, humidity, light_lux, motion_events, extra.",
      }),
    },
  },
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status, headers: { "Content-Type": "application/json" },
  });
}
