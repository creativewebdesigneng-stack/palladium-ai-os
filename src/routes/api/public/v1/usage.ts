import { createFileRoute } from "@tanstack/react-router";
import { ApiError, withApiAuth } from "@/lib/devapi/api-auth.server";

const PATH = "/api/public/v1/usage";

export const Route = createFileRoute("/api/public/v1/usage")({
  server: {
    handlers: {
      GET: withApiAuth({ scope: "usage:read", path: PATH }, async (ctx) => {
        const monthStart = (() => {
          const now = new Date();
          return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
        })();

        const runsQuery = ctx.admin
          .from("agent_tasks")
          .select("status,tokens_in,tokens_out,cost_pence")
          .gte("created_at", monthStart);
        const { data: runs, error } = ctx.orgId
          ? await runsQuery.eq("org_id", ctx.orgId)
          : await runsQuery.eq("user_id", ctx.userId);
        if (error) throw new ApiError(500, "query_failed", error.message);

        const apiCalls = await ctx.admin
          .from("api_request_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", ctx.userId)
          .gte("created_at", monthStart);

        const rows = runs ?? [];
        return {
          period_start: monthStart,
          plan: {
            code: ctx.planCode,
            requests_per_minute: ctx.limits.requestsPerMinute,
            requests_per_day: ctx.limits.requestsPerDay,
            executions_per_day: ctx.limits.executionsPerDay,
            execution_api: ctx.limits.execution,
          },
          agent_runs: rows.length,
          failed_runs: rows.filter((r: any) => r.status === "failed").length,
          tokens_in: rows.reduce((sum: number, r: any) => sum + (Number(r.tokens_in) || 0), 0),
          tokens_out: rows.reduce((sum: number, r: any) => sum + (Number(r.tokens_out) || 0), 0),
          cost_pence: rows.reduce((sum: number, r: any) => sum + (Number(r.cost_pence) || 0), 0),
          api_requests: apiCalls.count ?? 0,
        };
      }),
    },
  },
});
