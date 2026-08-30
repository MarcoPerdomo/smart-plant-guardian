export type SpeciesProfile = {
  common_aliases?: string[];
  scientific_name?: string | null;
  description?: string | null;
  light?: string | null;
  water_frequency_days?: number | null;
  soil_moisture_min?: number | null;
  soil_moisture_max?: number | null;
  temperature_min_c?: number | null;
  temperature_max_c?: number | null;
  humidity_min?: number | null;
  humidity_max?: number | null;
  soil?: string | null;
  fertilizer?: string | null;
  toxicity?: string | null;
  common_pests?: string[];
  common_diseases?: string[];
  care_tips?: string | null;
  environment?: "indoor" | "outdoor" | "both" | "unknown";
  environment_notes?: string | null;
};

const ENVIRONMENTS = ["indoor", "outdoor", "both", "unknown"] as const;

export function normalizeEnvironment(value: unknown): "indoor" | "outdoor" | "both" | "unknown" {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (ENVIRONMENTS as readonly string[]).includes(v)
    ? (v as "indoor" | "outdoor" | "both" | "unknown")
    : "unknown";
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // Handle ranges like "7-14" by averaging, or plain numbers
    const rangeMatch = value.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      return Math.round((min + max) / 2);
    }
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) return value.join(" ").trim() || null;
  return null;
}

export async function generateSpeciesProfile(name: string, apiKey: string): Promise<SpeciesProfile> {
  const prompt = `You are a botanist. Return ONLY JSON (no markdown) for the houseplant "${name}" with fields:
common_aliases (string array of 3-8 common nicknames/aliases),
scientific_name (string), description (1-2 sentences), light (short phrase like "Bright indirect"),
water_frequency_days (single integer, average days between waterings), soil_moisture_min (int 0-100), soil_moisture_max (int 0-100),
temperature_min_c (number), temperature_max_c (number), humidity_min (int 0-100), humidity_max (int 0-100),
soil (short), fertilizer (short), toxicity (short), common_pests (string array of 2-4),
common_diseases (string array of 2-4), care_tips (single string, 2-3 sentences),
environment (exactly one of "indoor", "outdoor", "both" — where this plant is normally grown in a temperate Northern-European climate),
environment_notes (single string, 1-2 sentences explaining the indoor/outdoor recommendation, e.g. minimum outdoor temperature or whether it can summer outside).
If the plant name is unknown, still return your best general guess.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI error ${resp.status}: ${txt}`);
  }
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  return {
    common_aliases: Array.isArray(parsed.common_aliases) ? parsed.common_aliases.map((s: unknown) => String(s)) : [],
    scientific_name: normalizeString(parsed.scientific_name),
    description: normalizeString(parsed.description),
    light: normalizeString(parsed.light),
    water_frequency_days: normalizeNumber(parsed.water_frequency_days),
    soil_moisture_min: normalizeNumber(parsed.soil_moisture_min),
    soil_moisture_max: normalizeNumber(parsed.soil_moisture_max),
    temperature_min_c: normalizeNumber(parsed.temperature_min_c),
    temperature_max_c: normalizeNumber(parsed.temperature_max_c),
    humidity_min: normalizeNumber(parsed.humidity_min),
    humidity_max: normalizeNumber(parsed.humidity_max),
    soil: normalizeString(parsed.soil),
    fertilizer: normalizeString(parsed.fertilizer),
    toxicity: normalizeString(parsed.toxicity),
    common_pests: Array.isArray(parsed.common_pests) ? parsed.common_pests.map((s: unknown) => String(s)) : [],
    common_diseases: Array.isArray(parsed.common_diseases) ? parsed.common_diseases.map((s: unknown) => String(s)) : [],
    care_tips: normalizeString(parsed.care_tips),
    environment: normalizeEnvironment(parsed.environment),
    environment_notes: normalizeString(parsed.environment_notes),
  };
}

export async function generateSpeciesImage(
  name: string,
  apiKey: string,
): Promise<{ buffer: Uint8Array; contentType: string } | null> {
  const prompt = `A clean, well-lit product-style photo of a healthy potted ${name} houseplant on a simple neutral background. No text, no labels.`;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      stream: false,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Image generation error ${resp.status}: ${txt}`);
  }
  const json = await resp.json();
  const item = json.data?.[0];
  if (!item) return null;

  if (item.url) {
    const imgResp = await fetch(item.url);
    if (!imgResp.ok) return null;
    const buffer = new Uint8Array(await imgResp.arrayBuffer());
    const contentType = imgResp.headers.get("content-type") || "image/png";
    return { buffer, contentType };
  }

  if (item.b64_json) {
    const binary = atob(item.b64_json);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
    return { buffer, contentType: "image/png" };
  }

  return null;
}

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        body: Uint8Array,
        options?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ error: unknown }>;
      createSignedUrl: (
        path: string,
        expiresIn: number,
      ) => Promise<{ data: { signedUrl: string } | null }>;
    };
  };
};

export async function uploadCatalogImage(
  slug: string,
  buffer: Uint8Array,
  contentType: string,
  client?: StorageClient,
): Promise<string | null> {
  const supabase =
    client ?? (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const path = `catalog/${slug}.png`;
  const { error: uploadError } = await supabase.storage
    .from("plant-images")
    .upload(path, buffer, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data: signed } = await supabase.storage
    .from("plant-images")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  return signed?.signedUrl || null;
}
