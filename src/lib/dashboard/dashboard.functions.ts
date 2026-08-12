/**
 * Dashboard, Notifications and Analytics server functions.
 *
 * Every read is scoped to the caller (or an org the caller belongs to, via
 * RLS) — nothing here trusts a client-supplied user id. Numbers are always
 * derived from real rows; if a table doesn't exist for a concept we simply
 * omit it rather than inventing a value.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEntitlements } from "@/lib/platform/entitlements.server";

type Sb = { from: (t: string) => any };

const scopeInput = (input: unknown) =>
  z.object({ orgId: z.string().uuid().nullish() }).parse(input ?? {});

function scope(q: any, orgId: string | null, userId: string) {
  return orgId ? q.eq("org_id", orgId) : q.eq("user_id", userId);
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------- dashboard */

export const getDashboardSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(scopeInput)
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const orgId = data.orgId ?? null;

    const now = new Date();
    const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startYesterday = new Date(startToday.getTime() - 86400000);
    const sevenDaysAgo = new Date(startToday.getTime() - 6 * 86400000);

    const [agentsRes, tasksRes, usageRes, notificationsRes, entitlements] = await Promise.all([
      scope(
        sb.from("personal_agents").select("id,name,status,model,created_at"),
        orgId,
        userId,
      )
        .order("created_at", { ascending: false })
        .limit(200),
      scope(
        sb.from("agent_tasks").select("id,title,status,input,created_at"),
        orgId,
        userId,
      )
        .order("created_at", { ascending: false })
        .limit(200),
      scope(sb.from("usage_records").select("metric,quantity,occurred_at"), orgId, userId)
        .gte("occurred_at", sevenDaysAgo.toISOString())
        .limit(2000),
      scope(
        sb.from("notifications").select("id,title,kind,read_at,created_at"),
        orgId,
        userId,
      )
        .order("created_at", { ascending: false })
        .limit(20),
      getEntitlements(sb as never, userId, orgId),
    ]);

    if (agentsRes.error) throw new Error(agentsRes.error.message);
    if (tasksRes.error) throw new Error(tasksRes.error.message);
    if (usageRes.error) throw new Error(usageRes.error.message);
    if (notificationsRes.error) throw new Error(notificationsRes.error.message);

    const agents = agentsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const usage = usageRes.data ?? [];
    const notifications = notificationsRes.data ?? [];

    const usageToday = usage
      .filter((r: any) => new Date(r.occurred_at) >= startToday)
      .reduce((s: number, r: any) => s + Number(r.quantity ?? 0), 0);
    const usageYesterday = usage
      .filter((r: any) => {
        const d = new Date(r.occurred_at);
        return d >= startYesterday && d < startToday;
      })
      .reduce((s: number, r: any) => s + Number(r.quantity ?? 0), 0);

    const seriesMap: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      seriesMap[dayKey(new Date(sevenDaysAgo.getTime() + i * 86400000))] = 0;
    }
    for (const r of usage) {
      const k = dayKey(new Date(r.occurred_at));
      if (k in seriesMap) seriesMap[k] = (seriesMap[k] ?? 0) + Number(r.quantity ?? 0);
    }
    const usageSeries = Object.entries(seriesMap).map(([day, requests]) => ({ day, requests }));

    const runningTasks = tasks.filter((t: any) => t.status === "running").length;
    const queuedTasks = tasks.filter((t: any) => t.status === "pending").length;
    const activeAgents = agents.filter((a: any) => a.status === "active").length;
    const connectedModels = new Set(
      agents.filter((a: any) => a.status === "active").map((a: any) => a.model).filter(Boolean),
    ).size;

    const activity = [
      ...agents
        .slice(0, 5)
        .map((a: any) => ({ id: `agent-${a.id}`, message: `Agent "${a.name}" is ${a.status}`, created_at: a.created_at })),
      ...tasks.slice(0, 5).map((t: any) => ({
        id: `task-${t.id}`,
        message: `Task "${t.title || String(t.input ?? "").slice(0, 60) || "Untitled"}" ${t.status}`,
        created_at: t.created_at,
      })),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);

    return {
      metrics: {
        aiRequestsToday: usageToday,
        aiRequestsYesterday: usageYesterday,
        activeAgents,
        totalAgents: agents.length,
        runningTasks,
        queuedTasks,
        connectedModels,
      },
      usageSeries,
      activity,
      recentAgents: agents.slice(0, 5).map((a: any) => ({ id: a.id, name: a.name, status: a.status })),
      recentTasks: tasks.slice(0, 5).map((t: any) => ({
        id: t.id,
        title: t.title || (t.input ? String(t.input).slice(0, 60) : "Untitled task"),
        status: t.status,
      })),
      notifications: notifications.slice(0, 4).map((n: any) => ({
        id: n.id,
        title: n.title,
        kind: n.kind,
        read: !!n.read_at,
      })),
      credits: {
        used: entitlements.usage.tasksThisMonth,
        limit: entitlements.limits.tasks_per_month,
        planName: entitlements.planName,
      },
    };
  });

/* --------------------------------------------------------- notifications */

export const listNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("notifications")
      .select("id,title,body,kind,link,metadata,read_at,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Toggles a single notification back to unread. Reading uses the shared
 * `markNotifications` function from mission.functions.ts. */
export const setNotificationUnread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("notifications")
      .update({ read_at: null })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------- analytics */

const RANGE_DAYS: Record<string, number> = { daily: 1, weekly: 7, monthly: 180 };

export const getAnalyticsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        range: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
        orgId: z.string().uuid().nullish(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const orgId = data.orgId ?? null;
    const days = RANGE_DAYS[data.range] ?? 7;
    const windowStart = new Date(Date.now() - days * 86400000);
    const prevWindowStart = new Date(windowStart.getTime() - days * 86400000);

    const [agentsRes, teamsRes, tasksRes, prevTasksRes, workflowRunsRes] = await Promise.all([
      scope(sb.from("personal_agents").select("id,name,team_id,model,status"), orgId, userId).limit(500),
      orgId
        ? sb.from("teams").select("id,name,team_members(id)").eq("org_id", orgId)
        : Promise.resolve({ data: [], error: null }),
      scope(
        sb
          .from("agent_tasks")
          .select("id,agent_id,status,model,tokens_in,tokens_out,cost_pence,duration_ms,created_at"),
        orgId,
        userId,
      )
        .gte("created_at", windowStart.toISOString())
        .limit(5000),
      scope(sb.from("agent_tasks").select("id,cost_pence,created_at"), orgId, userId)
        .gte("created_at", prevWindowStart.toISOString())
        .lt("created_at", windowStart.toISOString())
        .limit(5000),
      scope(sb.from("workflow_runs").select("id,status,cost_pence,created_at"), orgId, userId)
        .gte("created_at", windowStart.toISOString())
        .limit(5000),
    ]);

    if (agentsRes.error) throw new Error(agentsRes.error.message);
    if (tasksRes.error) throw new Error(tasksRes.error.message);
    if (workflowRunsRes.error) throw new Error(workflowRunsRes.error.message);

    const agents = agentsRes.data ?? [];
    const teams = (teamsRes as any).data ?? [];
    const tasks = tasksRes.data ?? [];
    const prevTasks = prevTasksRes.data ?? [];
    const workflowRuns = workflowRunsRes.data ?? [];

    const agentById = new Map(agents.map((a: any) => [a.id, a]));

    const totalCostPence =
      tasks.reduce((s: number, t: any) => s + Number(t.cost_pence ?? 0), 0) +
      workflowRuns.reduce((s: number, r: any) => s + Number(r.cost_pence ?? 0), 0);
    const prevCostPence = prevTasks.reduce((s: number, t: any) => s + Number(t.cost_pence ?? 0), 0);
    const errors =
      tasks.filter((t: any) => t.status === "failed").length +
      workflowRuns.filter((r: any) => r.status === "failed").length;

    const pctDelta = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? "+100%" : "0%") : `${curr >= prev ? "+" : ""}${(((curr - prev) / prev) * 100).toFixed(1)}%`;

    const metrics = [
      { id: "agents", label: "Agents", value: String(agents.length), delta: "", up: true },
      { id: "tasks", label: "Tasks", value: String(tasks.length), delta: pctDelta(tasks.length, prevTasks.length), up: tasks.length >= prevTasks.length },
      { id: "workflows", label: "Workflow runs", value: String(workflowRuns.length), delta: "", up: true },
      { id: "ai-requests", label: "AI Requests", value: String(tasks.length), delta: pctDelta(tasks.length, prevTasks.length), up: tasks.length >= prevTasks.length },
      { id: "errors", label: "Errors", value: String(errors), delta: "", up: errors === 0 },
      { id: "costs", label: "Costs", value: `£${(totalCostPence / 100).toFixed(2)}`, delta: pctDelta(totalCostPence, prevCostPence), up: totalCostPence <= prevCostPence },
    ];

    // Activity series bucketed by day (daily -> hourly buckets collapsed to a
    // single day, weekly -> 7 days, monthly -> ~6 months).
    const buckets: Record<string, { requests: number; activeAgents: Set<string> }> = {};
    const bucketKey = (d: Date) =>
      data.range === "monthly" ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10);
    for (const t of tasks) {
      const k = bucketKey(new Date(t.created_at));
      if (!buckets[k]) buckets[k] = { requests: 0, activeAgents: new Set() };
      buckets[k].requests += 1;
      if (t.agent_id) buckets[k].activeAgents.add(t.agent_id);
    }
    const activity = Object.keys(buckets)
      .sort()
      .map((k) => ({ k, requests: buckets[k]?.requests ?? 0, users: buckets[k]?.activeAgents.size ?? 0 }));

    // Per-agent aggregates.
    const byAgent = new Map<string, { tasks: number; completed: number; cost: number }>();
    for (const t of tasks) {
      const key = t.agent_id ?? "unassigned";
      const row = byAgent.get(key) ?? { tasks: 0, completed: 0, cost: 0 };
      row.tasks += 1;
      if (t.status === "completed") row.completed += 1;
      row.cost += Number(t.cost_pence ?? 0);
      byAgent.set(key, row);
    }
    const agentAnalytics = [...byAgent.entries()]
      .map(([agentId, row]) => ({
        agent: (agentById.get(agentId) as any)?.name ?? "Unassigned",
        tasks: row.tasks,
        requests: row.tasks,
        success: row.tasks ? Math.round((row.completed / row.tasks) * 100) : 0,
        cost: Number((row.cost / 100).toFixed(2)),
      }))
      .sort((a, b) => b.tasks - a.tasks)
      .slice(0, 8);

    // Per-team aggregates (via each agent's team_id).
    const agentTeam = new Map<string, string | null>(agents.map((a: any) => [a.id, a.team_id] as [string, string | null]));
    const byTeam = new Map<string, { tasks: number; cost: number }>();
    for (const t of tasks) {
      const teamId = t.agent_id ? agentTeam.get(t.agent_id) : null;
      if (!teamId) continue;
      const row = byTeam.get(teamId) ?? { tasks: 0, cost: 0 };
      row.tasks += 1;
      row.cost += Number(t.cost_pence ?? 0);
      byTeam.set(teamId, row);
    }
    const teamAnalytics = teams.map((t: any) => {
      const row = byTeam.get(t.id) ?? { tasks: 0, cost: 0 };
      return {
        team: t.name,
        members: (t.team_members ?? []).length,
        tasks: row.tasks,
        requests: row.tasks,
        cost: Number((row.cost / 100).toFixed(2)),
      };
    });

    // Per-model aggregates.
    const byModel = new Map<
      string,
      { requests: number; tokensIn: number; tokensOut: number; cost: number; duration: number; durationCount: number }
    >();
    for (const t of tasks) {
      const key = t.model || "Unknown";
      const row = byModel.get(key) ?? { requests: 0, tokensIn: 0, tokensOut: 0, cost: 0, duration: 0, durationCount: 0 };
      row.requests += 1;
      row.tokensIn += Number(t.tokens_in ?? 0);
      row.tokensOut += Number(t.tokens_out ?? 0);
      row.cost += Number(t.cost_pence ?? 0);
      if (t.duration_ms != null) {
        row.duration += Number(t.duration_ms);
        row.durationCount += 1;
      }
      byModel.set(key, row);
    }
    const modelAnalytics = [...byModel.entries()]
      .map(([model, row]) => ({
        model,
        requests: row.requests,
        tokens: row.tokensIn + row.tokensOut,
        cost: Number((row.cost / 100).toFixed(2)),
        latencyMs: row.durationCount ? Math.round(row.duration / row.durationCount) : null,
      }))
      .sort((a, b) => b.requests - a.requests);

    return { metrics, activity, agentAnalytics, teamAnalytics, modelAnalytics };
  });
