/**
 * Usage analytics API (typed RPC).
 *
 * Aggregates real consumption rows (agent_tasks, tool_executions,
 * api_request_logs) plus the caller's plan limits from the entitlement
 * engine. Nothing here is fabricated — if a range has no rows the totals are
 * zero and callers should render an honest empty state.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEntitlements } from "@/lib/platform/entitlements.server";

type Sb = { from: (t: string) => any };

const RANGE_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

function rangeStart(range: string) {
  const days = RANGE_DAYS[range] ?? 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * A cost/usage breakdown for the caller (optionally scoped to one agent),
 * over the selected range: tokens & spend from agent_tasks, tool execution
 * counts, API request volume, and the plan limits to compare against.
 */
export const getUsageBreakdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid().nullish(),
        agentId: z.string().uuid().nullish(),
        range: z.enum(["24h", "7d", "30d", "90d"]).default("30d"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const since = rangeStart(data.range);
    const orgId = data.orgId ?? null;

    let taskQuery = sb
      .from("agent_tasks")
      .select(
        "id,agent_id,status,tokens_in,tokens_out,cost_pence,duration_ms,model,provider,created_at",
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    taskQuery = orgId ? taskQuery.eq("org_id", orgId) : taskQuery.eq("user_id", context.userId);
    if (data.agentId) taskQuery = taskQuery.eq("agent_id", data.agentId);

    let toolQuery = sb
      .from("tool_executions")
      .select("id,agent_id,tool,status,duration_ms,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    toolQuery = orgId ? toolQuery.eq("org_id", orgId) : toolQuery.eq("user_id", context.userId);
    if (data.agentId) toolQuery = toolQuery.eq("agent_id", data.agentId);

    let apiQuery = sb
      .from("api_request_logs")
      .select("id,status_code,duration_ms,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    apiQuery = orgId ? apiQuery.eq("org_id", orgId) : apiQuery.eq("user_id", context.userId);

    const [
      { data: tasks, error: taskErr },
      { data: tools, error: toolErr },
      { data: apiLogs, error: apiErr },
    ] = await Promise.all([taskQuery, toolQuery, apiQuery]);
    if (taskErr) throw new Error(taskErr.message);
    if (toolErr) throw new Error(toolErr.message);
    if (apiErr) throw new Error(apiErr.message);

    const taskRows = tasks ?? [];
    const toolRows = tools ?? [];
    const apiRows = apiLogs ?? [];

    const totals = taskRows.reduce(
      (
        acc: {
          tokensIn: number;
          tokensOut: number;
          costPence: number;
          durationMs: number;
          completed: number;
          failed: number;
        },
        t: any,
      ) => {
        acc.tokensIn += Number(t.tokens_in ?? 0);
        acc.tokensOut += Number(t.tokens_out ?? 0);
        acc.costPence += Number(t.cost_pence ?? 0);
        acc.durationMs += Number(t.duration_ms ?? 0);
        if (t.status === "completed") acc.completed += 1;
        if (t.status === "failed") acc.failed += 1;
        return acc;
      },
      { tokensIn: 0, tokensOut: 0, costPence: 0, durationMs: 0, completed: 0, failed: 0 },
    );

    const byTool = new Map<string, number>();
    for (const row of toolRows) byTool.set(row.tool, (byTool.get(row.tool) ?? 0) + 1);
    const toolUsage = Array.from(byTool.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count);

    const byModel = new Map<string, number>();
    for (const row of taskRows)
      if (row.model) byModel.set(row.model, (byModel.get(row.model) ?? 0) + 1);
    const modelUsage = Array.from(byModel.entries()).map(([model, count]) => ({ model, count }));

    return {
      range: data.range,
      taskCount: taskRows.length,
      toolExecutionCount: toolRows.length,
      apiRequestCount: apiRows.length,
      totals: {
        tokensIn: totals.tokensIn,
        tokensOut: totals.tokensOut,
        tokensTotal: totals.tokensIn + totals.tokensOut,
        costPence: totals.costPence,
        avgDurationMs: taskRows.length ? Math.round(totals.durationMs / taskRows.length) : null,
        completed: totals.completed,
        failed: totals.failed,
      },
      toolUsage,
      modelUsage,
      entitlements: await getEntitlements(sb as never, context.userId, orgId),
    };
  });
