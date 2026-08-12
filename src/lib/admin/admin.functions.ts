/**
 * Platform-admin server functions.
 *
 * Every handler here re-reads the caller's role from the database via
 * `public.has_role(auth.uid(), 'admin')` before returning platform-wide data.
 * Callers without the role get `{ forbidden: true }` back — never a partial
 * or mocked payload.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

const FORBIDDEN = { forbidden: true as const };

async function requireAdmin(sb: Sb, userId: string) {
  const ok = await isPlatformAdmin(sb, userId);
  return ok;
}

/** Platform-wide counts for the admin overview dashboard. */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;

    const [users, orgs, activeSubs, agents, tasks24h, errors24h] = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("organisations").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("personal_agents").select("id", { count: "exact", head: true }),
      admin
        .from("agent_tasks")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
      admin
        .from("api_request_logs")
        .select("id", { count: "exact", head: true })
        .gte("status_code", 400)
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    ]);

    return {
      forbidden: false as const,
      total_users: users.count ?? 0,
      total_organisations: orgs.count ?? 0,
      active_subscriptions: activeSubs.count ?? 0,
      total_agents: agents.count ?? 0,
      tasks_last_24h: tasks24h.count ?? 0,
      errors_last_24h: errors24h.count ?? 0,
    };
  });

/** Paginated user directory for the admin console. */
export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ q: z.string().trim().optional(), limit: z.number().int().min(1).max(500).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;

    let q = admin
      .from("profiles")
      .select("id,email,full_name,avatar_url,role,org_id,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.q) q = q.or(`email.ilike.%${data.q}%,full_name.ilike.%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    const [{ data: subs }, { data: roles }] = await Promise.all([
      ids.length
        ? admin.from("subscriptions").select("user_id,plan_code,status").in("user_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? admin.from("user_roles").select("user_id,role").in("user_id", ids)
        : Promise.resolve({ data: [] }),
    ]);
    const subByUser = new Map<string, any>((subs ?? []).map((s: any) => [s.user_id, s] as [string, any]));
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }

    return {
      forbidden: false as const,
      users: (rows ?? []).map((r: any) => ({
        id: r.id,
        name: r.full_name ?? r.email ?? "Unnamed",
        email: r.email ?? "",
        avatarUrl: r.avatar_url,
        plan: subByUser.get(r.id)?.plan_code ?? "free",
        status: subByUser.get(r.id)?.status === "canceled" ? "inactive" : "active",
        platformRoles: rolesByUser.get(r.id) ?? [],
        createdAt: r.created_at,
      })),
    };
  });

/** Organisation directory with member and subscription context. */
export const listAllOrganisations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ q: z.string().trim().optional(), limit: z.number().int().min(1).max(500).optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;

    let q = admin
      .from("organisations")
      .select("id,name,slug,billing_email,owner_id,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: any) => r.id);
    const [{ data: subs }, { data: members }, { data: owners }] = await Promise.all([
      ids.length
        ? admin.from("subscriptions").select("org_id,plan_code,status").in("org_id", ids)
        : Promise.resolve({ data: [] }),
      ids.length
        ? admin.from("organisation_members").select("org_id").in("org_id", ids)
        : Promise.resolve({ data: [] }),
      (rows ?? []).length
        ? admin
            .from("profiles")
            .select("id,email,full_name")
            .in("id", (rows ?? []).map((r: any) => r.owner_id))
        : Promise.resolve({ data: [] }),
    ]);
    const subByOrg = new Map<string, any>((subs ?? []).map((s: any) => [s.org_id, s] as [string, any]));
    const memberCounts = new Map<string, number>();
    for (const m of members ?? []) memberCounts.set(m.org_id, (memberCounts.get(m.org_id) ?? 0) + 1);
    const ownerById = new Map<string, any>((owners ?? []).map((o: any) => [o.id, o] as [string, any]));

    return {
      forbidden: false as const,
      organisations: (rows ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        owner: ownerById.get(r.owner_id)?.full_name ?? ownerById.get(r.owner_id)?.email ?? "—",
        billingEmail: r.billing_email,
        plan: subByOrg.get(r.id)?.plan_code ?? "free",
        status: subByOrg.get(r.id)?.status === "canceled" ? "suspended" : "active",
        memberCount: memberCounts.get(r.id) ?? 0,
        createdAt: r.created_at,
      })),
    };
  });

/** Platform-wide subscriptions plus the active plan catalogue. */
export const listAllSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;

    const [{ data: subs, error }, { data: plans }] = await Promise.all([
      admin
        .from("subscriptions")
        .select("id,org_id,user_id,plan_code,status,seats,current_period_end,cancel_at_period_end,created_at")
        .order("created_at", { ascending: false })
        .limit(300),
      admin.from("plans").select("code,name,price_pence,currency,billing_interval,is_active"),
    ]);
    if (error) throw new Error(error.message);

    const orgIds = [...new Set((subs ?? []).map((s: any) => s.org_id).filter(Boolean))];
    const userIds = [...new Set((subs ?? []).map((s: any) => s.user_id).filter(Boolean))];
    const [{ data: orgs }, { data: profiles }] = await Promise.all([
      orgIds.length ? admin.from("organisations").select("id,name").in("id", orgIds) : Promise.resolve({ data: [] }),
      userIds.length
        ? admin.from("profiles").select("id,email,full_name").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);
    const orgById = new Map<string, any>((orgs ?? []).map((o: any) => [o.id, o] as [string, any]));
    const profileById = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p] as [string, any]));
    const planByCode = new Map<string, any>((plans ?? []).map((p: any) => [p.code, p] as [string, any]));

    return {
      forbidden: false as const,
      plans: plans ?? [],
      subscriptions: (subs ?? []).map((s: any) => {
        const plan = planByCode.get(s.plan_code);
        const customer = s.org_id
          ? orgById.get(s.org_id)?.name ?? "Unknown organisation"
          : profileById.get(s.user_id)?.full_name ?? profileById.get(s.user_id)?.email ?? "Unknown user";
        return {
          id: s.id,
          customer,
          plan: s.plan_code,
          status: s.status,
          seats: s.seats,
          mrr: Math.round(Number(plan?.price_pence ?? 0) / 100),
          currentPeriodEnd: s.current_period_end,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          createdAt: s.created_at,
        };
      }),
    };
  });

const RANGE_DAYS: Record<string, number> = { Daily: 1, Weekly: 7, Monthly: 30, Yearly: 365 };

/** Aggregated usage telemetry for the platform analytics screen. */
export const getPlatformAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ range: z.enum(["Daily", "Weekly", "Monthly", "Yearly"]).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const days = RANGE_DAYS[data.range ?? "Monthly"] ?? 30;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;

    const [{ data: tasks }, { data: logs }, { count: newUsers }] = await Promise.all([
      admin.from("agent_tasks").select("created_at,status,cost_pence").gte("created_at", since).limit(5000),
      admin
        .from("api_request_logs")
        .select("created_at,status_code")
        .gte("created_at", since)
        .limit(5000),
      admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);

    const byDay = new Map<string, { requests: number; errors: number; revenuePence: number }>();
    const dayKey = (iso: string) => iso.slice(0, 10);
    for (const t of tasks ?? []) {
      const k = dayKey(t.created_at);
      const e = byDay.get(k) ?? { requests: 0, errors: 0, revenuePence: 0 };
      e.requests += 1;
      if (t.status === "failed") e.errors += 1;
      e.revenuePence += Number(t.cost_pence ?? 0);
      byDay.set(k, e);
    }
    for (const l of logs ?? []) {
      const k = dayKey(l.created_at);
      const e = byDay.get(k) ?? { requests: 0, errors: 0, revenuePence: 0 };
      e.requests += 1;
      if (l.status_code >= 400) e.errors += 1;
      byDay.set(k, e);
    }

    const series = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, requests: v.requests, errors: v.errors, revenue: Math.round(v.revenuePence / 100) }));

    return {
      forbidden: false as const,
      range: data.range ?? "Monthly",
      new_users: newUsers ?? 0,
      total_requests: (tasks?.length ?? 0) + (logs?.length ?? 0),
      total_errors: series.reduce((s, d) => s + d.errors, 0),
      total_revenue: series.reduce((s, d) => s + d.revenue, 0),
      series,
    };
  });

/** Security signals sourced from real audit and API-usage tables. */
export const getSecurityOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [{ data: denied }, { data: failedAuth }, { data: keys }, { data: errorReqs }] = await Promise.all([
      admin
        .from("mission_audit_logs")
        .select("id,user_id,action,ip_address,created_at,status")
        .eq("status", "denied")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("mission_audit_logs")
        .select("id,user_id,ip_address,created_at")
        .eq("action", "auth_failed")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),
      admin.from("api_keys").select("id,name,last_used_at,revoked_at,expires_at").limit(500),
      admin
        .from("api_request_logs")
        .select("id,ip,path,status_code,created_at")
        .gte("status_code", 400)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const activeKeys = (keys ?? []).filter((k: any) => !k.revoked_at).length;
    const revokedKeys = (keys ?? []).filter((k: any) => !!k.revoked_at).length;
    const ipCounts = new Map<string, number>();
    for (const r of errorReqs ?? []) if (r.ip) ipCounts.set(r.ip, (ipCounts.get(r.ip) ?? 0) + 1);

    return {
      forbidden: false as const,
      permission_denied_7d: denied?.length ?? 0,
      auth_failures_7d: failedAuth?.length ?? 0,
      active_api_keys: activeKeys,
      revoked_api_keys: revokedKeys,
      error_requests_7d: errorReqs?.length ?? 0,
      top_error_ips: [...ipCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, count })),
      recent_denied_events: (denied ?? []).slice(0, 20),
    };
  });

/** Basic platform health signals derived from real request/task tables. */
export const listSystemHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await requireAdmin(sb, context.userId))) return FORBIDDEN;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;
    const since = new Date(Date.now() - 3600 * 1000).toISOString();

    const [{ data: recentLogs }, { data: recentTasks }] = await Promise.all([
      admin.from("api_request_logs").select("status_code,duration_ms").gte("created_at", since).limit(2000),
      admin.from("agent_tasks").select("status,duration_ms").gte("created_at", since).limit(2000),
    ]);

    const total = recentLogs?.length ?? 0;
    const errors = (recentLogs ?? []).filter((r: any) => r.status_code >= 500).length;
    const avgLatency = total
      ? Math.round((recentLogs ?? []).reduce((s: number, r: any) => s + (r.duration_ms ?? 0), 0) / total)
      : null;
    const taskTotal = recentTasks?.length ?? 0;
    const taskFailures = (recentTasks ?? []).filter((t: any) => t.status === "failed").length;
    const errorRate = total ? errors / total : 0;

    return {
      forbidden: false as const,
      window: "last 60 minutes",
      api: { total_requests: total, server_errors: errors, avg_latency_ms: avgLatency, error_rate: errorRate },
      agents: { total_runs: taskTotal, failed_runs: taskFailures },
      overall: total === 0 && taskTotal === 0 ? "no_data" : errorRate > 0.1 ? "degraded" : "operational",
    };
  });
