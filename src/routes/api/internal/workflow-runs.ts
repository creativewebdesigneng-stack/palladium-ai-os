import { createFileRoute } from "@tanstack/react-router";
import { processDuePhoneCommunicationNotifications } from "@/lib/communications/automation-dispatch.server";
import { processDueLegalAutomation } from "@/lib/legal/legal-automation.server";
import { processDuePersonalReminders } from "@/lib/mission/personal-reminders.server";
import { processDueAutonomousGoals } from "@/lib/runtime/autonomous-os.scheduler.server";
import { processQueuedWorkflowRuns } from "@/lib/runtime/workflow-queue.server";
import { processResumableAgentRuns } from "@/lib/runtime/run-resume-worker.server";
import { isValidRuntimeWorkerToken } from "@/lib/runtime/runtime-worker-auth.server";

type WorkerName =
  | "workflows"
  | "reminders"
  | "agent_resumes"
  | "autonomous_goals"
  | "legal_automation"
  | "phone_communications";

type WorkerResult<T> =
  | { ok: true; worker: WorkerName; value: T }
  | { ok: false; worker: WorkerName; errorName: string };

async function runIsolated<T>(worker: WorkerName, operation: () => Promise<T>): Promise<WorkerResult<T>> {
  try {
    return { ok: true, worker, value: await operation() };
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error("[runtime-worker] processor unavailable", { worker, errorName });
    return { ok: false, worker, errorName };
  }
}

function valueOrNull<T>(result: WorkerResult<T>): T | null {
  return result.ok ? result.value : null;
}

/**
 * Scheduler endpoint for durable workflow, autonomous-goal, agent-resume, reminder,
 * Legal Hub and opted-in phone communication execution.
 *
 * Configure a deployment scheduler to POST here with:
 *   Authorization: Bearer <WORKFLOW_RUNNER_CRON_SECRET>
 *
 * The caller cannot choose a workflow, user, agent, goal, run id, reminder, legal
 * record or phone recipient. The worker only claims rows already persisted in
 * Blackstar's durable queues and phone delivery remains subject to user consent,
 * verification, quiet hours and daily limits.
 *
 * Each durable processor is fault-isolated. One unhealthy subsystem must not stop
 * unrelated workflow, reminder, agent, legal or phone queues from making progress.
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

        const [
          workflows,
          reminders,
          agentResumes,
          autonomousGoals,
          legalAutomation,
          phoneCommunications,
        ] = await Promise.all([
          runIsolated("workflows", () => processQueuedWorkflowRuns(limit)),
          runIsolated("reminders", () => processDuePersonalReminders(Math.max(10, limit * 5))),
          runIsolated("agent_resumes", () => processResumableAgentRuns(limit)),
          runIsolated("autonomous_goals", () => processDueAutonomousGoals(Math.min(2, limit))),
          runIsolated("legal_automation", () => processDueLegalAutomation(Math.min(2, limit))),
          runIsolated("phone_communications", () => processDuePhoneCommunicationNotifications(Math.max(10, limit * 5))),
        ]);

        const results = [
          workflows,
          reminders,
          agentResumes,
          autonomousGoals,
          legalAutomation,
          phoneCommunications,
        ] as const;
        const failures = results
          .filter((result) => !result.ok)
          .map((result) => ({
            worker: result.worker,
            errorName: result.ok ? "" : result.errorName,
          }));
        const allFailed = failures.length === results.length;
        const workflowPayload = workflows.ok
          ? (workflows.value as Record<string, unknown>)
          : {};

        return json(
          {
            ok: !allFailed,
            degraded: failures.length > 0,
            ...workflowPayload,
            reminders: valueOrNull(reminders),
            agent_resumes: valueOrNull(agentResumes),
            autonomous_goals: valueOrNull(autonomousGoals),
            legal_automation: valueOrNull(legalAutomation),
            phone_communications: valueOrNull(phoneCommunications),
            worker_failures: failures,
          },
          allFailed ? 503 : 200,
        );
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
