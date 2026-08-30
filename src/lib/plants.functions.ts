import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ Plant catalog ============
export const searchSpecies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ q: z.string().default("") }).parse(input))
  .handler(async ({ data, context }) => {
    const q = data.q.trim();
    let query = context.supabase
      .from("plant_species")
      .select("*")
      .is("archived_at", null)
      .order("common_name")
      .limit(1000);
    if (q) query = query.ilike("search_text", `%${q.toLowerCase()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const lookupOrCreateSpecies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().min(2) }).parse(input))
  .handler(async ({ data, context }) => {
    const name = data.name.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data: existing } = await context.supabase
      .from("plant_species").select("*").eq("slug", slug).maybeSingle();
    if (existing) return existing;

    // Ask AI for care profile
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI unavailable");
    const prompt = `You are a botanist. Return ONLY JSON (no markdown) for the houseplant "${name}" with fields:
scientific_name (string), description (1-2 sentences), light (short phrase like "Bright indirect"),
water_frequency_days (integer, typical days between waterings), soil_moisture_min (int 0-100), soil_moisture_max (int 0-100),
temperature_min_c (number), temperature_max_c (number), humidity_min (int 0-100), humidity_max (int 0-100),
soil (short), fertilizer (short), toxicity (short), common_pests (string array of 2-4),
common_diseases (string array of 2-4), care_tips (2-3 sentences),
environment (exactly one of "indoor", "outdoor", "both" — where this plant is normally grown in a temperate Northern-European climate),
environment_notes (1-2 sentences explaining the indoor/outdoor recommendation).
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.from("plant_species").insert({
      common_name: name,
      scientific_name: parsed.scientific_name ?? null,
      slug,
      description: parsed.description ?? null,
      light: parsed.light ?? null,
      water_frequency_days: parsed.water_frequency_days ?? null,
      soil_moisture_min: parsed.soil_moisture_min ?? null,
      soil_moisture_max: parsed.soil_moisture_max ?? null,
      temperature_min_c: parsed.temperature_min_c ?? null,
      temperature_max_c: parsed.temperature_max_c ?? null,
      humidity_min: parsed.humidity_min ?? null,
      humidity_max: parsed.humidity_max ?? null,
      soil: parsed.soil ?? null,
      fertilizer: parsed.fertilizer ?? null,
      toxicity: parsed.toxicity ?? null,
      common_pests: parsed.common_pests ?? [],
      common_diseases: parsed.common_diseases ?? [],
      care_tips: parsed.care_tips ?? null,
      source: "ai",
    }).select().single();
    if (error) throw new Error(error.message);
    return created;
  });

// ============ User plants ============
export const listUserPlants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_plants")
      .select("*, plant_species(*)")
      .eq("user_id", context.userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Attach latest reading per plant
    const ids = (data ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    const { data: readings } = await context.supabase
      .from("sensor_readings")
      .select("*")
      .in("plant_id", ids)
      .order("recorded_at", { ascending: false });
    const latest = new Map<string, typeof readings extends (infer T)[] | null ? T : never>();
    for (const r of readings ?? []) if (!latest.has(r.plant_id)) latest.set(r.plant_id, r);

    return (data ?? []).map((p) => ({ ...p, latest_reading: latest.get(p.id) ?? null }));
  });

export const getPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: plant, error } = await context.supabase
      .from("user_plants").select("*, plant_species(*)").eq("id", data.id).eq("user_id", context.userId).single();
    if (error) throw new Error(error.message);
    const { data: readings } = await context.supabase
      .from("sensor_readings").select("*").eq("plant_id", data.id)
      .order("recorded_at", { ascending: false }).limit(200);
    const { data: waterings } = await context.supabase
      .from("watering_events").select("*").eq("plant_id", data.id)
      .order("watered_at", { ascending: false }).limit(20);
    const { data: summaries } = await context.supabase
      .from("ai_summaries").select("*").eq("plant_id", data.id)
      .order("created_at", { ascending: false }).limit(5);
    return { plant, readings: readings ?? [], waterings: waterings ?? [], summaries: summaries ?? [] };
  });

export const createPlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    nickname: z.string().min(1),
    species_id: z.string().uuid().nullable(),
    location: z.string().nullable(),
    device_id: z.string().nullable(),
    notes: z.string().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("user_plants").insert({ ...data, user_id: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const logWatering = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ plant_id: z.string().uuid(), amount_ml: z.number().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: owned } = await context.supabase
      .from("user_plants").select("id").eq("id", data.plant_id).eq("user_id", context.userId).maybeSingle();
    if (!owned) throw new Error("Plant not found");
    const { error } = await context.supabase.from("watering_events").insert(data);
    if (error) throw new Error(error.message);
    await context.supabase.from("user_plants").update({ last_watered_at: new Date().toISOString() })
      .eq("id", data.plant_id).eq("user_id", context.userId);
    return { ok: true };
  });

export const addManualReading = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    plant_id: z.string().uuid(),
    soil_moisture: z.number().nullable(),
    temperature_c: z.number().nullable(),
    humidity: z.number().nullable(),
    light_lux: z.number().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    // Verify ownership explicitly (admins can read other users' rows via RLS)
    const { data: owned } = await context.supabase
      .from("user_plants").select("id").eq("id", data.plant_id).eq("user_id", context.userId).maybeSingle();
    if (!owned) throw new Error("Not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sensor_readings").insert({ ...data, source_device: "manual" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_plants").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Profile / notification prefs ============
export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    display_name: z.string().nullable(),
    phone: z.string().nullable(),
    notify_in_app: z.boolean(),
    notify_email: z.boolean(),
    notify_sms: z.boolean(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({ id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Notifications feed ============
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ AI summary ============
export const generateSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ plant_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: plant } = await context.supabase
      .from("user_plants").select("*, plant_species(*)").eq("id", data.plant_id).eq("user_id", context.userId).maybeSingle();
    if (!plant) throw new Error("Plant not found");
    const { data: readings } = await context.supabase
      .from("sensor_readings").select("*").eq("plant_id", data.plant_id)
      .order("recorded_at", { ascending: false }).limit(50);

    const species = (plant as { plant_species: Record<string, unknown> | null }).plant_species;
    const context_str = JSON.stringify({
      nickname: plant.nickname,
      species,
      last_watered_at: plant.last_watered_at,
      recent_readings: (readings ?? []).slice(0, 20),
    }, null, 2);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI unavailable");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: "You are a warm, expert houseplant care assistant. Return ONLY JSON with keys: status ('healthy'|'attention'|'thirsty'|'unknown'), summary (2-3 friendly sentences addressed to the owner), recommendations (array of 2-5 short action items)." },
          { role: "user", content: `Plant context:\n${context_str}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) throw new Error(`AI error ${resp.status}`);
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const plantEmail = (plant as { user_email?: string | null }).user_email;
    const { data: saved, error } = await supabaseAdmin.from("ai_summaries").insert({
      plant_id: data.plant_id,
      user_email: plantEmail,
      status: parsed.status ?? "unknown",
      summary: parsed.summary ?? "No summary available.",
      recommendations: parsed.recommendations ?? [],
    }).select().single();
    if (error) throw new Error(error.message);

    // Also drop a notification if user has in-app notifications on
    await supabaseAdmin.from("notifications").insert({
      user_id: context.userId,
      plant_id: data.plant_id,
      title: `${plant.nickname}: ${parsed.status ?? "update"}`,
      body: parsed.summary ?? "",
    });

    return saved;
  });

// ============ Catalog import (one species per request) ============
export const importOneSpecies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ name: z.string().min(1), withImage: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI unavailable");

    const name = data.name.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: existing } = await context.supabase
      .from("plant_species")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) return { name, status: "skipped" as const };

    const helpers = await import("@/lib/plants.server");
    const parsed = await helpers.generateSpeciesProfile(name, apiKey);

    let imageUrl: string | null = null;
    if (data.withImage) {
      try {
        const img = await helpers.generateSpeciesImage(name, apiKey);
        if (img)
          imageUrl = await helpers.uploadCatalogImage(
            slug,
            img.buffer,
            img.contentType,
            context.supabase,
          );
      } catch (e) {
        console.warn("Image generation failed for", name, e);
      }
    }

    const { error } = await context.supabase.from("plant_species").insert({
      common_name: name,
      scientific_name: parsed.scientific_name ?? null,
      slug,
      aliases: parsed.common_aliases ?? [],
      description: parsed.description ?? null,
      light: parsed.light ?? null,
      water_frequency_days: parsed.water_frequency_days ?? null,
      soil_moisture_min: parsed.soil_moisture_min ?? null,
      soil_moisture_max: parsed.soil_moisture_max ?? null,
      temperature_min_c: parsed.temperature_min_c ?? null,
      temperature_max_c: parsed.temperature_max_c ?? null,
      humidity_min: parsed.humidity_min ?? null,
      humidity_max: parsed.humidity_max ?? null,
      soil: parsed.soil ?? null,
      fertilizer: parsed.fertilizer ?? null,
      toxicity: parsed.toxicity ?? null,
      common_pests: parsed.common_pests ?? [],
      common_diseases: parsed.common_diseases ?? [],
      care_tips: parsed.care_tips ?? null,
      image_url: imageUrl,
      source: "batch",
    });
    if (error) throw new Error(error.message);

    return { name, status: "created" as const };
  });

// Fill in catalog images for rows imported without one, a few at a time.
export const listSpeciesMissingImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ limit: z.number().min(1).max(200).default(100) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");
    const { data: rows, error } = await context.supabase
      .from("plant_species")
      .select("id, common_name, slug")
      .is("image_url", null)
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const generateSpeciesImageFor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI unavailable");

    const { data: row, error: rowError } = await context.supabase
      .from("plant_species")
      .select("id, common_name, slug, image_url")
      .eq("id", data.id)
      .single();
    if (rowError) throw new Error(rowError.message);
    if (row.image_url) return { name: row.common_name, status: "skipped" as const };

    const helpers = await import("@/lib/plants.server");
    const img = await helpers.generateSpeciesImage(row.common_name, apiKey);
    if (!img) throw new Error("No image returned");
    const imageUrl = await helpers.uploadCatalogImage(
      row.slug,
      img.buffer,
      img.contentType,
      context.supabase,
    );

    const { error } = await context.supabase
      .from("plant_species")
      .update({ image_url: imageUrl })
      .eq("id", row.id);
    if (error) throw new Error(error.message);

    return { name: row.common_name, status: "created" as const };
  });


// ============ Plant photo journal ============
export const listPlantPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ plant_id: z.string().uuid(), limit: z.number().int().positive().max(500).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("plant_photos")
      .select("*")
      .eq("plant_id", data.plant_id)
      .eq("user_id", context.userId)
      .order("taken_at", { ascending: false });
    if (data.limit) query = query.limit(data.limit);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPlantPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        plant_id: z.string().uuid(),
        storage_path: z.string().min(1),
        caption: z.string().max(500).nullable().optional(),
        taken_at: z.string().nullable().optional(),
        width: z.number().int().nullable().optional(),
        height: z.number().int().nullable().optional(),
        bytes: z.number().int().nullable().optional(),
        content_type: z.string().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: plant, error: pErr } = await context.supabase
      .from("user_plants")
      .select("id")
      .eq("id", data.plant_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!plant) throw new Error("Plant not found");

    const { data: row, error } = await context.supabase
      .from("plant_photos")
      .insert({
        plant_id: data.plant_id,
        user_id: context.userId,
        storage_path: data.storage_path,
        caption: data.caption ?? null,
        taken_at: data.taken_at ?? new Date().toISOString(),
        width: data.width ?? null,
        height: data.height ?? null,
        bytes: data.bytes ?? null,
        content_type: data.content_type ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePlantPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), caption: z.string().max(500).nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("plant_photos")
      .update({ caption: data.caption })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlantPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error: sErr } = await context.supabase
      .from("plant_photos")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!row) throw new Error("Photo not found");

    await context.supabase.storage.from("plant-images").remove([row.storage_path]);
    const { error } = await context.supabase.from("plant_photos").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPhotoSignedUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paths: z.array(z.string()).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.paths.length === 0) return {} as Record<string, string>;
    const { data: signed, error } = await context.supabase.storage
      .from("plant-images")
      .createSignedUrls(data.paths, 3600);
    if (error) throw new Error(error.message);
    const map: Record<string, string> = {};
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
    }
    return map;
  });
