/**
 * Analytics and business-intelligence reads.
 *
 * Every figure is aggregated from real rows the caller owns: agent tasks,
 * workflow runs, metered usage, notifications, CRM contacts, finance
 * transactions and marketing campaigns. When a dataset is empty the field is
 * returned as `null` / `0` so the UI can render "No data yet" instead of
 * fabricating a number.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function buildDays(days: number) {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

export const getAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ range: z.enum(["7d", "30d", "90d"]).default("30d") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const days = RANGE_DAYS[data.range] ?? 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const [tasksRes, runsRes, usageRes, agentsRes, contactsRes, txRes, campaignsRes] =
      await Promise.all([
        sb
          .from("agent_tasks")
          .select("id, status, created_at, completed_at, agent_id, model, tokens_in, tokens_out, cost_pence")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        sb
          .from("workflow_runs")
          .select("id, status, created_at, workflow_id")
          .gte("created_at", since)
          .limit(1000),
        sb
          .from("usage_records")
          .select("metric, quantity, unit, occurred_at, metadata")
          .gte("occurred_at", since)
          .limit(2000),
        sb.from("personal_agents").select("id, name, status, category").limit(500),
        sb.from("crm_contacts").select("id, stage, value_gbp, created_at").limit(1000),
        sb
          .from("finance_transactions")
          .select("direction, amount, occurred_on")
          .gte("occurred_on", since.slice(0, 10))
          .limit(1000),
        sb.from("marketing_campaigns").select("id, status, spend, conversions").limit(500),
      ]);

    if (tasksRes.error) throw new Error(tasksRes.error.message);

    const tasks = (tasksRes.data ?? []) as any[];
    const runs = runsRes.error ? [] : ((runsRes.data ?? []) as any[]);
    const usage = usageRes.error ? [] : ((usageRes.data ?? []) as any[]);
    const agents = agentsRes.error ? [] : ((agentsRes.data ?? []) as any[]);
    const contacts = contactsRes.error ? [] : ((contactsRes.data ?? []) as any[]);
    const transactions = txRes.error ? [] : ((txRes.data ?? []) as any[]);
    const campaigns = campaignsRes.error ? [] : ((campaignsRes.data ?? []) as any[]);

    const completed = tasks.filter((t) => t.status === "completed" || t.status === "succeeded");
    const failed = tasks.filter((t) => t.status === "failed");
    const finished = completed.length + failed.length;

    const durations = completed
      .filter((t) => t.completed_at)
      .map((t) => (Date.parse(t.completed_at) - Date.parse(t.created_at)) / 1000)
      .filter((n) => Number.isFinite(n) && n >= 0);

    const dayBuckets = new Map<string, { day: string; tasks: number; completed: number; failed: number }>();
    for (const day of buildDays(days)) {
      dayBuckets.set(day, { day, tasks: 0, completed: 0, failed: 0 });
    }
    for (const task of tasks) {
      const bucket = dayBuckets.get(dayKey(task.created_at));
      if (!bucket) continue;
      bucket.tasks += 1;
      if (task.status === "completed" || task.status === "succeeded") bucket.completed += 1;
      if (task.status === "failed") bucket.failed += 1;
    }

    const modelMap = new Map<string, { model: string; runs: number; tokens: number; cost: number }>();
    for (const task of tasks) {
      const model = task.model || "unspecified";
      const bucket = modelMap.get(model) ?? { model, runs: 0, tokens: 0, cost: 0 };
      bucket.runs += 1;
      bucket.tokens += Number(task.tokens_in ?? 0) + Number(task.tokens_out ?? 0);
      bucket.cost += Number(task.cost_pence ?? 0) / 100;
      modelMap.set(model, bucket);
    }

    const agentMap = new Map<string, { id: string; name: string; runs: number; completed: number; failed: number }>();
    for (const agent of agents) {
      agentMap.set(agent.id, { id: agent.id, name: agent.name, runs: 0, completed: 0, failed: 0 });
    }
    for (const task of tasks) {
      if (!task.agent_id) continue;
      const bucket = agentMap.get(task.agent_id);
      if (!bucket) continue;
      bucket.runs += 1;
      if (task.status === "completed" || task.status === "succeeded") bucket.completed += 1;
      if (task.status === "failed") bucket.failed += 1;
    }

    const meteredTokens = usage
      .filter((u) => u.metric === "tokens" || u.unit === "token")
      .reduce((s, u) => s + Number(u.quantity ?? 0), 0);
    const taskTokens = tasks.reduce(
      (s, t) => s + Number(t.tokens_in ?? 0) + Number(t.tokens_out ?? 0),
      0,
    );
    const tokens = meteredTokens || taskTokens;

    const taskCostGbp = tasks.reduce((s, t) => s + Number(t.cost_pence ?? 0) / 100, 0);
    const meteredCostGbp = usage
      .filter((u) => u.unit === "gbp" || u.unit === "GBP")
      .reduce((s, u) => s + Number(u.quantity ?? 0), 0);
    const modelCost = taskCostGbp || meteredCostGbp;

    const revenue = transactions
      .filter((t) => t.direction === "income")
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);
    const expenses = transactions
      .filter((t) => t.direction === "expense")
      .reduce((s, t) => s + Number(t.amount ?? 0), 0);

    return {
      range: data.range,
      generatedAt: new Date().toISOString(),
      totals: {
        tasks: tasks.length,
        completed: completed.length,
        failed: failed.length,
        running: tasks.filter((t) =>
          ["running", "queued", "pending", "waiting_for_tool", "waiting_for_approval"].includes(
            t.status,
          ),
        ).length,
        successRate: finished > 0 ? Math.round((completed.length / finished) * 100) : null,
        avgDurationSeconds: durations.length
          ? Math.round(durations.reduce((s, n) => s + n, 0) / durations.length)
          : null,
        agents: agents.length,
        activeAgents: agents.filter((a) => a.status === "active").length,
        workflowRuns: runs.length,
        workflowSuccessRate:
          runs.length > 0
            ? Math.round(
                (runs.filter((r) => r.status === "completed" || r.status === "succeeded").length /
                  runs.length) *
                  100,
              )
            : null,
        tokens,
        modelCost,
      },
      series: Array.from(dayBuckets.values()),
      models: Array.from(modelMap.values()).sort((a, b) => b.runs - a.runs),
      agents: Array.from(agentMap.values())
        .filter((a) => a.runs > 0)
        .sort((a, b) => b.runs - a.runs),
      business: {
        contacts: contacts.length,
        pipelineValue: contacts
          .filter((c) => c.stage !== "won" && c.stage !== "lost")
          .reduce((s, c) => s + Number(c.value_gbp ?? 0), 0),
        wonDeals: contacts.filter((c) => c.stage === "won").length,
        revenue,
        expenses,
        profit: revenue - expenses,
        hasFinance: transactions.length > 0,
        campaigns: campaigns.length,
        campaignSpend: campaigns.reduce((s, c) => s + Number(c.spend ?? 0), 0),
        campaignConversions: campaigns.reduce((s, c) => s + Number(c.conversions ?? 0), 0),
      },
    };
  });
