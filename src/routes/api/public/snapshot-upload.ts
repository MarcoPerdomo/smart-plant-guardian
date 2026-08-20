import { createFileRoute } from "@tanstack/react-router";

// POST /api/public/snapshot-upload
// Headers: X-Ingest-Secret: <ARDUINO_INGEST_SECRET>
// Body: multipart/form-data with fields:
//   - device_id (string)
//   - snapshot (image file, ideally JPEG)
export const Route = createFileRoute("/api/public/snapshot-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = normalizeSecret(process.env.ARDUINO_INGEST_SECRET);
        if (!secret) return jsonError(500, "Ingestion not configured");
        const provided = normalizeSecret(request.headers.get("x-ingest-secret"));
        if (!provided || provided !== secret) return jsonError(401, "Invalid ingest secret");

        const form = await request.formData();
        const deviceId = form.get("device_id");
        const file = form.get("snapshot");
        if (!deviceId || typeof deviceId !== "string") return jsonError(400, "Missing device_id");
        if (!file || !(file instanceof File)) return jsonError(400, "Missing snapshot file");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: plant, error: pErr } = await supabaseAdmin
          .from("user_plants")
          .select("id, user_id, nickname")
          .eq("device_id", deviceId)
          .maybeSingle();
        if (pErr) return jsonError(500, pErr.message);
        if (!plant) return jsonError(404, `No plant registered for device_id "${deviceId}"`);

        const ext = file.name.split(".").pop() || "jpg";
        const path = `${plant.user_id}/${plant.id}/${Date.now()}.${ext}`;
        const { error: uErr } = await supabaseAdmin.storage
          .from("plant-snapshots")
          .upload(path, file, {
            contentType: file.type || "image/jpeg",
            upsert: false,
          });
        if (uErr) return jsonError(500, uErr.message);

        return Response.json({ ok: true, snapshot_url: path });
      },
      GET: async () =>
        Response.json({
          ok: true,
          usage:
            "POST multipart/form-data with fields: device_id, snapshot. Header: X-Ingest-Secret.",
        }),
    },
  },
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
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
