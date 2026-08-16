import { createFileRoute } from "@tanstack/react-router";
import { processQueuedWorkflowRuns } from "@/lib/runtime/workflow-queue.server";
import { isValidRuntimeWorkerToken } from "@/lib/runtime/runtime-worker-auth.server";

/**
 * Scheduler endpoint for durable workflow execution.
 *
 * Configure a deployment scheduler to POST here with:
 *   Authorization: Bearer <WORKFLOW_RUNNER_CRON_SECRET>
 *
 * The caller cannot choose a workflow, user, agent or run id. The worker only
 * claims rows already persisted in PalladiumAI's workflow queue.
 */
export const Route = createFileRoute("/api/internal/workflow-runs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = request.headers.get("authorization") ?? "";
        const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (!(await isValidRuntimeWorkerToken("workflow_runner", supplied))) {
          return json({ error: "Unauthorized" }, 401);
        }

        const url = new URL(request.url);
        const requested = Number(url.searchParams.get("limit") ?? 2);
        const limit = Number.isFinite(requested)
          ? Math.max(1, Math.min(4, Math.trunc(requested)))
          : 2;
        const result = await processQueuedWorkflowRuns(limit);
        return json({ ok: true, ...result }, 200);
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
