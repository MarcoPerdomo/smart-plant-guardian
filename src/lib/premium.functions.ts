import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function isAdminCtx(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return Boolean(data);
}

async function assertAdmin(context: Ctx) {
  if (!(await isAdminCtx(context))) throw new Error("Forbidden: admin role required");
}

export type Access = {
  userId: string;
  isAdmin: boolean;
  isPremium: boolean;
  premiumSince: string | null;
  expiresAt: string | null;
};

export const myAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Access> => {
    const isAdmin = await isAdminCtx(context);
    const { data: grants } = await context.supabase
      .from("premium_grants")
      .select("granted_at, expires_at, revoked_at")
      .eq("user_id", context.userId)
      .is("revoked_at", null)
      .order("granted_at", { ascending: true });

    const now = Date.now();
    const active = (grants ?? []).filter(
      (g: any) => !g.expires_at || new Date(g.expires_at).getTime() > now,
    );
    const premiumSince = active.length ? active[0].granted_at : null;
    const expiresAt = active.some((g: any) => !g.expires_at)
      ? null
      : active.length
        ? active
            .map((g: any) => g.expires_at as string)
            .sort()
            .at(-1)!
        : null;

    return {
      userId: context.userId,
      isAdmin,
      isPremium: isAdmin || active.length > 0,
      premiumSince,
      expiresAt,
    };
  });

export const listPremiumMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: grants, error } = await context.supabase
      .from("premium_grants")
      .select("*")
      .order("granted_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const ids = Array.from(
      new Set(
        (grants ?? []).flatMap((g: any) => [g.user_id, g.granted_by, g.revoked_by].filter(Boolean)),
      ),
    ) as string[];
    const nameMap = new Map<string, { email: string | null; display_name: string | null }>();
    if (ids.length) {
      const { data: profiles } = await context.supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", ids);
      for (const p of profiles ?? [])
        nameMap.set(p.id, { email: p.email ?? null, display_name: p.display_name ?? null });
    }

    const now = Date.now();
    return (grants ?? []).map((g: any) => {
      const expired = Boolean(g.expires_at) && new Date(g.expires_at).getTime() <= now;
      const state: "active" | "expired" | "revoked" = g.revoked_at
        ? "revoked"
        : expired
          ? "expired"
          : "active";
      return {
        ...g,
        state,
        user: nameMap.get(g.user_id) ?? { email: null, display_name: null },
        granted_by_user: g.granted_by ? (nameMap.get(g.granted_by) ?? null) : null,
      };
    });
  });

export const grantPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        expires_at: z.string().nullable().optional(),
        note: z.string().max(500).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("premium_grants").insert({
      user_id: data.user_id,
      granted_by: context.userId,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      note: data.note || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokePremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ user_id: z.string().uuid(), grant_id: z.string().uuid().optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("premium_grants")
      .update({ revoked_at: new Date().toISOString(), revoked_by: context.userId })
      .eq("user_id", data.user_id)
      .is("revoked_at", null);
    if (data.grant_id) q = q.eq("id", data.grant_id);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });
