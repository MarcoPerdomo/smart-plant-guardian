import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function assertAdmin(context: Ctx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data), userId: context.userId };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const count = async (table: string, archived?: boolean) => {
      let q: any = (context.supabase as any).from(table).select("id", { count: "exact", head: true });
      if (archived === false) q = q.is("archived_at", null);
      const { count: c } = await q;
      return c ?? 0;
    };
    const [users, plants, species, photos, archived] = await Promise.all([
      count("profiles"),
      count("user_plants", false),
      count("plant_species", false),
      count("plant_photos"),
      count("archived_records"),
    ]);
    return { users, plants, species, photos, archived };
  });

// ============ Users & roles ============
export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().default("") }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const q = data.q.trim();
    let query = context.supabase
      .from("profiles")
      .select("id, email, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (q) query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
    const { data: profiles, error } = await query;
    if (error) throw new Error(error.message);

    const ids = (profiles ?? []).map((p: any) => p.id);
    if (ids.length === 0) return [];

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const { data: plants } = await context.supabase
      .from("user_plants")
      .select("user_id")
      .in("user_id", ids)
      .is("archived_at", null);

    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
    }
    const plantCount = new Map<string, number>();
    for (const p of plants ?? []) plantCount.set(p.user_id, (plantCount.get(p.user_id) ?? 0) + 1);

    return (profiles ?? []).map((p: any) => ({
      ...p,
      roles: roleMap.get(p.id) ?? [],
      plant_count: plantCount.get(p.id) ?? 0,
    }));
  });

const roleSchema = z.enum(["admin", "moderator", "user"]);

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ user_id: z.string().uuid(), role: roleSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ user_id: z.string().uuid(), role: roleSchema }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && data.role === "admin") {
      throw new Error("You cannot remove your own admin role");
    }
    const { error } = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Plants ============
export const adminListPlants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ q: z.string().default(""), includeArchived: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("user_plants")
      .select("id, nickname, location, user_id, created_at, archived_at, plant_species(common_name)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (!data.includeArchived) query = query.is("archived_at", null);
    const q = data.q.trim();
    if (q) query = query.ilike("nickname", `%${q}%`);
    const { data: plants, error } = await query;
    if (error) throw new Error(error.message);

    const owners = [...new Set((plants ?? []).map((p: any) => p.user_id))];
    const { data: profiles } = owners.length
      ? await context.supabase.from("profiles").select("id, email, display_name").in("id", owners)
      : { data: [] };
    const owner = new Map((profiles ?? []).map((p: any) => [p.id, p]));

    return (plants ?? []).map((p: any) => ({
      ...p,
      owner_email: owner.get(p.user_id)?.email ?? null,
      owner_name: owner.get(p.user_id)?.display_name ?? null,
    }));
  });

// ============ Species ============
export const adminListSpecies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ q: z.string().default(""), includeArchived: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("plant_species")
      .select(
        "id, common_name, scientific_name, slug, light, water_frequency_days, care_tips, image_url, source, archived_at",
      )
      .order("common_name")
      .limit(1000);
    if (!data.includeArchived) query = query.is("archived_at", null);
    const q = data.q.trim();
    if (q) query = query.ilike("search_text", `%${q.toLowerCase()}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateSpecies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        common_name: z.string().min(1),
        scientific_name: z.string().nullable(),
        light: z.string().nullable(),
        water_frequency_days: z.number().int().min(0).max(365).nullable(),
        care_tips: z.string().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("plant_species").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Soft delete / archive ============
const archiveInput = z.object({
  entity_type: z.enum(["plant", "species"]),
  id: z.string().uuid(),
  reason: z.string().nullable().default(null),
});

export const archiveRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => archiveInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const table = data.entity_type === "plant" ? "user_plants" : "plant_species";

    const { data: row, error: readError } = await context.supabase
      .from(table)
      .select("*")
      .eq("id", data.id)
      .single();
    if (readError) throw new Error(readError.message);
    if (row.archived_at) return { ok: true, alreadyArchived: true };

    let snapshot: Record<string, unknown> = { record: row };
    if (data.entity_type === "plant") {
      const [{ data: readings }, { data: photos }, { data: waterings }, { data: summaries }] =
        await Promise.all([
          context.supabase.from("sensor_readings").select("*").eq("plant_id", data.id).limit(2000),
          context.supabase.from("plant_photos").select("*").eq("plant_id", data.id).limit(2000),
          context.supabase.from("watering_events").select("*").eq("plant_id", data.id).limit(2000),
          context.supabase.from("ai_summaries").select("*").eq("plant_id", data.id).limit(500),
        ]);
      snapshot = {
        record: row,
        sensor_readings: readings ?? [],
        plant_photos: photos ?? [],
        watering_events: waterings ?? [],
        ai_summaries: summaries ?? [],
      };
    }

    const { error: updateError } = await context.supabase
      .from(table)
      .update({ archived_at: new Date().toISOString(), archived_by: context.userId })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);

    const { error: archiveError } = await context.supabase.from("archived_records").insert({
      entity_type: data.entity_type,
      entity_id: data.id,
      owner_id: data.entity_type === "plant" ? ((row as any).user_id as string) : null,
      snapshot: snapshot as any,
      reason: data.reason,
      archived_by: context.userId,
    });
    if (archiveError) throw new Error(archiveError.message);

    return { ok: true };
  });

export const listArchive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ includeRestored: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let query = context.supabase
      .from("archived_records")
      .select("id, entity_type, entity_id, owner_id, reason, archived_at, restored_at, snapshot")
      .order("archived_at", { ascending: false })
      .limit(300);
    if (!data.includeRestored) query = query.is("restored_at", null);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      owner_id: r.owner_id,
      reason: r.reason,
      archived_at: r.archived_at,
      restored_at: r.restored_at,
      label:
        r.snapshot?.record?.nickname ?? r.snapshot?.record?.common_name ?? r.entity_id,
    }));
  });

export const restoreRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ archive_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: entry, error } = await context.supabase
      .from("archived_records")
      .select("*")
      .eq("id", data.archive_id)
      .single();
    if (error) throw new Error(error.message);

    const table = entry.entity_type === "plant" ? "user_plants" : "plant_species";
    const { error: restoreError } = await context.supabase
      .from(table)
      .update({ archived_at: null, archived_by: null })
      .eq("id", entry.entity_id);
    if (restoreError) throw new Error(restoreError.message);

    const { error: markError } = await context.supabase
      .from("archived_records")
      .update({ restored_at: new Date().toISOString(), restored_by: context.userId })
      .eq("id", data.archive_id);
    if (markError) throw new Error(markError.message);

    return { ok: true };
  });
