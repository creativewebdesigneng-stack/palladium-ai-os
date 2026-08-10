/**
 * Platform server functions: organisations, membership, teams, plans and
 * entitlements.
 *
 * Security model — every mutation here:
 *  1. runs behind `requireSupabaseAuth` (verified bearer token, never client data)
 *  2. re-reads the caller's organisation role from the database before acting
 *  3. writes an audit entry
 * Nothing trusts a role, plan or organisation id supplied by the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEntitlements, assertWithinLimit } from "./entitlements.server";
import { writeAudit, notify } from "./audit.server";

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

const ORG_ROLES = ["owner", "admin", "member"] as const;

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

/** Reads the caller's role in an organisation straight from the database. */
async function requireOrgRole(sb: Sb, orgId: string, userId: string, allowed: readonly string[]) {
  const { data, error } = await sb
    .from("organisation_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !allowed.includes(data.role)) {
    await writeAudit({
      userId,
      orgId,
      action: "permission_denied",
      targetType: "organisation",
      targetId: orgId,
      status: "denied",
    });
    throw new Error("You do not have permission to do that.");
  }
  return data.role as (typeof ORG_ROLES)[number];
}

/* --------------------------------------------------------------- workspace */

export const getWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const [{ data: profile }, { data: memberships }, { data: unread }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
      sb
        .from("organisation_members")
        .select(
          "id,role,created_at,org_id,organisations(id,name,slug,logo_url,billing_email,created_at)",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      sb.from("notifications").select("id").is("read_at", null).limit(50),
    ]);

    const orgs = (memberships ?? []).map((m: any) => ({
      id: m.org_id as string,
      role: m.role as string,
      joinedAt: m.created_at as string,
      name: m.organisations?.name ?? "Workspace",
      slug: m.organisations?.slug ?? "",
      logoUrl: m.organisations?.logo_url ?? null,
      billingEmail: m.organisations?.billing_email ?? null,
    }));

    const requested = data.orgId ?? null;
    const activeOrg =
      requested && orgs.some((o: { id: string }) => o.id === requested) ? requested : null;

    const entitlements = await getEntitlements(sb as never, userId, activeOrg);

    return {
      profile: profile ?? null,
      organisations: orgs,
      activeOrgId: activeOrg,
      entitlements,
      unreadNotifications: unread?.length ?? 0,
    };
  });

/* ----------------------------------------------------------- organisations */

export const createOrganisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        billingEmail: z.string().trim().email().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    let slug = slugify(data.name);
    const { data: existing } = await sb
      .from("organisations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const { data: org, error } = await sb
      .from("organisations")
      .insert({ name: data.name, slug, owner_id: userId, billing_email: data.billingEmail ?? null })
      .select("id,name,slug")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit({
      userId,
      orgId: org.id,
      action: "organisation_created",
      targetType: "organisation",
      targetId: org.id,
      metadata: { name: data.name },
    });
    return org;
  });

export const updateOrganisation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(80).optional(),
        billingEmail: z.string().trim().email().nullable().optional(),
        logoUrl: z.string().trim().url().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOrgRole(sb, data.orgId, context.userId, ["owner", "admin"]);

    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.billingEmail !== undefined) patch["billing_email"] = data.billingEmail;
    if (data.logoUrl !== undefined) patch["logo_url"] = data.logoUrl;

    const { data: org, error } = await sb
      .from("organisations")
      .update(patch)
      .eq("id", data.orgId)
      .select("id,name,slug,billing_email,logo_url")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: data.orgId,
      action: "organisation_updated",
      targetType: "organisation",
      targetId: data.orgId,
      metadata: patch,
    });
    return org;
  });

export const listOrganisationMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orgId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOrgRole(sb, data.orgId, context.userId, ORG_ROLES);

    const { data: members, error } = await sb
      .from("organisation_members")
      .select("id,user_id,role,created_at,profiles:user_id(id,email,full_name,avatar_url)")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    return (members ?? []).map((m: any) => ({
      id: m.id as string,
      userId: m.user_id as string,
      role: m.role as string,
      joinedAt: m.created_at as string,
      email: m.profiles?.email ?? null,
      fullName: m.profiles?.full_name ?? null,
      avatarUrl: m.profiles?.avatar_url ?? null,
    }));
  });

export const addOrganisationMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        email: z.string().trim().email(),
        role: z.enum(["admin", "member"]).default("member"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    await requireOrgRole(sb, data.orgId, userId, ["owner", "admin"]);

    // Seat allowance is enforced server-side against the stored subscription.
    const ent = await getEntitlements(sb as never, userId, data.orgId);
    assertWithinLimit(ent, "seats");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target } = await supabaseAdmin
      .from("profiles")
      .select("id,email")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();

    if (!target) {
      await writeAudit({
        userId,
        orgId: data.orgId,
        action: "member_invite_failed",
        status: "failed",
        metadata: { email: data.email },
      });
      throw new Error(
        "No PalladiumAI account uses that email address yet. Ask them to sign up first.",
      );
    }

    const { error } = await sb
      .from("organisation_members")
      .insert({ org_id: data.orgId, user_id: target.id, role: data.role, invited_by: userId });
    if (error)
      throw new Error(
        error.message.includes("duplicate") ? "That person is already a member." : error.message,
      );

    await writeAudit({
      userId,
      orgId: data.orgId,
      action: "member_added",
      targetType: "user",
      targetId: target.id,
      metadata: { role: data.role },
    });
    await notify({
      userId: target.id,
      orgId: data.orgId,
      kind: "organisation",
      title: "You were added to a workspace",
      body: "You now have access to a PalladiumAI organisation.",
      link: "/organisation",
    });

    return { ok: true, userId: target.id };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid(),
        memberId: z.string().uuid(),
        role: z.enum(["owner", "admin", "member"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const callerRole = await requireOrgRole(sb, data.orgId, context.userId, ["owner", "admin"]);
    // Only an owner may create or remove another owner.
    if (data.role === "owner" && callerRole !== "owner")
      throw new Error("Only the owner can grant ownership.");

    const { error } = await sb
      .from("organisation_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: data.orgId,
      action: "member_role_changed",
      targetType: "organisation_member",
      targetId: data.memberId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), memberId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOrgRole(sb, data.orgId, context.userId, ["owner", "admin"]);

    const { data: target } = await sb
      .from("organisation_members")
      .select("role,user_id")
      .eq("id", data.memberId)
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (target?.role === "owner") throw new Error("The organisation owner cannot be removed.");

    const { error } = await sb
      .from("organisation_members")
      .delete()
      .eq("id", data.memberId)
      .eq("org_id", data.orgId);
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: data.orgId,
      action: "member_removed",
      targetType: "organisation_member",
      targetId: data.memberId,
    });
    return { ok: true };
  });

/* ----------------------------------------------------------------- teams */

export const listTeams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orgId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOrgRole(sb, data.orgId, context.userId, ORG_ROLES);
    const { data: teams, error } = await sb
      .from("teams")
      .select("id,name,description,created_at,team_members(id,user_id,role)")
      .eq("org_id", data.orgId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return teams ?? [];
  });

export const saveTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        orgId: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
        description: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOrgRole(sb, data.orgId, context.userId, ["owner", "admin"]);

    const payload = {
      org_id: data.orgId,
      name: data.name,
      description: data.description ?? null,
      created_by: context.userId,
    };
    const q = data.id
      ? sb.from("teams").update(payload).eq("id", data.id).eq("org_id", data.orgId)
      : sb.from("teams").insert(payload);
    const { data: team, error } = await q.select("id,name,description").single();
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: data.orgId,
      action: data.id ? "team_updated" : "team_created",
      targetType: "team",
      targetId: team.id,
    });
    return team;
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid(), id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireOrgRole(sb, data.orgId, context.userId, ["owner", "admin"]);
    const { error } = await sb.from("teams").delete().eq("id", data.id).eq("org_id", data.orgId);
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: data.orgId,
      action: "team_deleted",
      targetType: "team",
      targetId: data.id,
    });
    return { ok: true };
  });

/* ------------------------------------------------------ plans & entitlements */

/** Public: the pricing table. Reads only active plans through the anon role. */
export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await supabasePublic
    .from("plans")
    .select(
      "code,name,description,price_pence,currency,billing_interval,features,limits,sort_order",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return { plans: [], error: "Pricing is temporarily unavailable." };
  return { plans: data ?? [], error: null };
});

/** Authoritative entitlement read for the signed-in user. */
export const getMyEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) =>
    getEntitlements(context.supabase as never, context.userId, data.orgId ?? null),
  );

/* ---------------------------------------------------------------- usage */

export const getUsageSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const orgId = data.orgId ?? null;
    const base = sb
      .from("usage_records")
      .select("metric,quantity,unit,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(500);
    const { data: rows, error } = orgId
      ? await base.eq("org_id", orgId)
      : await base.eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const totals: Record<string, number> = {};
    for (const row of rows ?? [])
      totals[row.metric] = (totals[row.metric] ?? 0) + Number(row.quantity ?? 0);

    return {
      totals,
      recent: (rows ?? []).slice(0, 50),
      entitlements: await getEntitlements(sb as never, context.userId, orgId),
    };
  });
