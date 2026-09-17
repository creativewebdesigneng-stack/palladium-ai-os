import { createFileRoute } from "@tanstack/react-router";
import { processDuePhoneCommunicationNotifications } from "@/lib/communications/automation-dispatch.server";
import { processDueLegalAutomation } from "@/lib/legal/legal-automation.server";
import { processDuePersonalReminders } from "@/lib/mission/personal-reminders.server";
import { processDueAutonomousGoals } from "@/lib/runtime/autonomous-os.scheduler.server";
import { processQueuedWorkflowRuns } from "@/lib/runtime/workflow-queue.server";
import { processResumableAgentRuns } from "@/lib/runtime/run-resume-worker.server";
import { isValidRuntimeWorkerToken } from "@/lib/runtime/runtime-worker-auth.server";

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

        try {
          const [
            workflows,
            reminders,
            agentResumes,
            autonomousGoals,
            legalAutomation,
            phoneCommunications,
          ] = await Promise.all([
            processQueuedWorkflowRuns(limit),
            processDuePersonalReminders(Math.max(10, limit * 5)),
            processResumableAgentRuns(limit),
            processDueAutonomousGoals(Math.min(2, limit)),
            processDueLegalAutomation(Math.min(2, limit)),
            processDuePhoneCommunicationNotifications(Math.max(10, limit * 5)),
          ]);
          return json(
            {
              ok: true,
              ...workflows,
              reminders,
              agent_resumes: agentResumes,
              autonomous_goals: autonomousGoals,
              legal_automation: legalAutomation,
              phone_communications: phoneCommunications,
            },
            200,
          );
        } catch (error) {
          console.error("[runtime-worker] workflow processing unavailable", {
            errorName: error instanceof Error ? error.name : "UnknownError",
          });
          return json({ ok: false, error: "Worker unavailable" }, 503);
        }
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
