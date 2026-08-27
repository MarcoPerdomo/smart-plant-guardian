import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AuthenticatedSupabase = SupabaseClient<Database>;

function getUserEmailFromClaims(claims: Record<string, unknown>): string | null {
  const email = claims?.email;
  if (typeof email === "string" && email) return email.toLowerCase();
  return null;
}

async function resolveUserId(email: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error || !data?.id) throw new Error("User account not found");
  return data.id;
}

async function findPlantByNicknameOrId(
  supabase: AuthenticatedSupabase,
  userEmail: string,
  identifier: string,
) {
  const { data: byId } = await supabase
    .from("user_plants")
    .select("*, plant_species(*)")
    .eq("id", identifier)
    .eq("user_email", userEmail)
    .is("archived_at", null)
    .maybeSingle();
  if (byId) return byId;

  const { data: byNickname } = await supabase
    .from("user_plants")
    .select("*, plant_species(*)")
    .ilike("nickname", identifier)
    .eq("user_email", userEmail)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .maybeSingle();
  return byNickname;
}

export async function listUserPlants(
  supabase: AuthenticatedSupabase,
  userEmail: string,
  claims?: Record<string, unknown>,
) {
  const email = userEmail || getUserEmailFromClaims(claims ?? {}) || "";
  if (!email) throw new Error("User email is required");

  const { data, error } = await supabase
    .from("user_plants")
    .select("*, plant_species(*)")
    .eq("user_email", email)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const plants = data ?? [];
  const ids = plants.map((p) => p.id);
  let latest = new Map<string, Database["public"]["Tables"]["sensor_readings"]["Row"]>();
  if (ids.length > 0) {
    const { data: readings } = await supabase
      .from("sensor_readings")
      .select("*")
      .in("plant_id", ids)
      .order("recorded_at", { ascending: false });
    for (const r of readings ?? []) {
      if (!latest.has(r.plant_id)) latest.set(r.plant_id, r);
    }
  }

  return plants.map((p) => ({
    id: p.id,
    nickname: p.nickname,
    location: p.location,
    last_watered_at: p.last_watered_at,
    created_at: p.created_at,
    species_common_name: (p.plant_species as { common_name?: string } | null)?.common_name ?? null,
    latest_reading: latest.get(p.id) ?? null,
  }));
}

export async function getPlantInsights(
  supabase: AuthenticatedSupabase,
  userEmail: string,
  identifier: string,
  claims?: Record<string, unknown>,
) {
  const email = userEmail || getUserEmailFromClaims(claims ?? {}) || "";
  if (!email) throw new Error("User email is required");

  const plant = await findPlantByNicknameOrId(supabase, email, identifier);
  if (!plant) throw new Error(`Plant "${identifier}" not found`);

  const [{ data: readings }, { data: summaries }, { data: waterings }] = await Promise.all([
    supabase
      .from("sensor_readings")
      .select("*")
      .eq("plant_id", plant.id)
      .order("recorded_at", { ascending: false })
      .limit(20),
    supabase
      .from("ai_summaries")
      .select("*")
      .eq("plant_id", plant.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("watering_events")
      .select("*")
      .eq("plant_id", plant.id)
      .order("watered_at", { ascending: false })
      .limit(5),
  ]);

  return {
    plant: {
      id: plant.id,
      nickname: plant.nickname,
      location: plant.location,
      species_common_name: (plant.plant_species as { common_name?: string } | null)?.common_name ?? null,
      last_watered_at: plant.last_watered_at,
    },
    recent_readings: readings ?? [],
    recent_summaries: summaries ?? [],
    recent_waterings: waterings ?? [],
  };
}

export async function logWatering(
  supabase: AuthenticatedSupabase,
  userEmail: string,
  identifier: string,
  amountMl: number | null,
  claims?: Record<string, unknown>,
) {
  const email = userEmail || getUserEmailFromClaims(claims ?? {}) || "";
  if (!email) throw new Error("User email is required");

  const plant = await findPlantByNicknameOrId(supabase, email, identifier);
  if (!plant) throw new Error(`Plant "${identifier}" not found`);

  const { error } = await supabase.from("watering_events").insert({
    plant_id: plant.id,
    user_email: email,
    watered_at: new Date().toISOString(),
    amount_ml: amountMl,
  });
  if (error) throw new Error(error.message);

  const { error: updateError } = await supabase
    .from("user_plants")
    .update({ last_watered_at: new Date().toISOString() })
    .eq("id", plant.id)
    .eq("user_email", email);
  if (updateError) throw new Error(updateError.message);

  return { ok: true, plant: { id: plant.id, nickname: plant.nickname } };
}

export async function addUserPlant(
  supabase: AuthenticatedSupabase,
  userEmail: string,
  nickname: string,
  speciesName: string,
  claims?: Record<string, unknown>,
) {
  const email = userEmail || getUserEmailFromClaims(claims ?? {}) || "";
  if (!email) throw new Error("User email is required");
  const userId = await resolveUserId(email);

  const { data: existingSpecies } = await supabase
    .from("plant_species")
    .select("*")
    .ilike("common_name", speciesName)
    .is("archived_at", null)
    .order("common_name")
    .limit(1)
    .maybeSingle();

  let speciesId: string | null = existingSpecies?.id ?? null;
  let speciesCommonName = existingSpecies?.common_name ?? null;

  if (!speciesId) {
    const helpers = await import("@/lib/plants.server");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI unavailable");
    const parsed = await helpers.generateSpeciesProfile(speciesName, apiKey);
    const slug = speciesName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const { data: created, error: createError } = await supabase
      .from("plant_species")
      .insert({
        common_name: speciesName,
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
        source: "ai",
      })
      .select()
      .single();
    if (createError) throw new Error(createError.message);
    speciesId = created.id;
    speciesCommonName = created.common_name;
  }

  const { data: row, error } = await supabase
    .from("user_plants")
    .insert({
      user_id: userId,
      nickname: nickname.trim(),
      species_id: speciesId,
      user_email: email,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  return { ok: true, plant: { id: row.id, nickname: row.nickname, species_common_name: speciesCommonName } };
}

export async function searchPlantCatalog(supabase: AuthenticatedSupabase, q: string) {
  let query = supabase
    .from("plant_species")
    .select("id, common_name, scientific_name, light, water_frequency_days, soil_moisture_min, soil_moisture_max, description")
    .is("archived_at", null)
    .order("common_name")
    .limit(20);
  const term = q.trim();
  if (term) {
    query = query.or(`common_name.ilike.%${term}%,scientific_name.ilike.%${term}%,aliases.cs.{${term}}`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
