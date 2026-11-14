import {
  buildExecutionReceipt,
  type ExecutionAuditRow,
  type ExecutionReceipt,
} from "@/lib/runtime/execution-receipt";

const LIVE_TASK = new Set([
  "pending",
  "queued",
  "running",
  "waiting_for_tool",
  "waiting_for_approval",
]);
const AGENT_STALE_MS = 2 * 60_000;
const WORKFLOW_STALE_MS = 15 * 60_000;
const MAX_RESUME_ATTEMPTS = 3;

export type MissionSourceState = { available: boolean };

export type MissionAgentRunRow = {
  id: string;
  user_id?: string | null;
  agent_id?: string | null;
  title?: string | null;
  input?: string | null;
  status?: string | null;
  provider?: string | null;
  model?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  tool_calls?: number | null;
  duration_ms?: number | null;
  output_text?: string | null;
  error?: string | null;
  heartbeat_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  cancel_requested?: boolean | null;
  replan_count?: number | null;
  resume_count?: number | null;
  has_checkpoint?: boolean;
};

export type MissionOperationsInput = {
  now?: Date | string | number;
  sources: {
    agents: MissionSourceState;
    agentRuns: MissionSourceState;
    workforces: MissionSourceState;
    workflowRuns: MissionSourceState;
    workflows: MissionSourceState;
    goals: MissionSourceState;
    audit: MissionSourceState;
  };
  agents: Array<{ id: string; name?: string | null; user_id?: string | null }>;
  agentRuns: MissionAgentRunRow[];
  workforces: Array<{ id: string; name?: string | null; status?: string | null }>;
  workflowRuns: Array<{
    id: string;
    workforce_id?: string | null;
    status?: string | null;
    worker_heartbeat_at?: string | null;
    error?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
  workflows: Array<{
    id: string;
    name?: string | null;
    status?: string | null;
    schedule?: string | null;
    trigger_type?: string | null;
    workforce_id?: string | null;
  }>;
  goals: Array<{
    id: string;
    name?: string | null;
    status?: string | null;
    trigger_type?: string | null;
    schedule_cron?: string | null;
    timezone?: string | null;
    next_run_at?: string | null;
    last_run_at?: string | null;
    workforce_id?: string | null;
  }>;
  audit: ExecutionAuditRow[];
};

function time(value: string | null | undefined, now: number): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, now - parsed);
}

function finite(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function latestAudit(audits: ExecutionAuditRow[], taskId: string): ExecutionAuditRow | null {
  const matches = audits.filter(
    (row) => row.action === "agent.run_result" && row.target_id === taskId,
  );
  if (!matches.length) return null;
  return (
    [...matches].sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    )[0] ?? null
  );
}

export function buildMissionOperations(input: MissionOperationsInput) {
  const now = new Date(input.now ?? Date.now()).getTime();
  const agentIds = new Set(input.agents.map((agent) => agent.id));
  const agentNames = new Map(input.agents.map((agent) => [agent.id, agent.name || "Agent"]));
  const runsAvailable = input.sources.agentRuns.available;
  const runs = runsAvailable ? input.agentRuns : [];

  const ownership = {
    available: input.sources.agents.available && runsAvailable,
    owned: 0,
    unassigned: 0,
    unmatched: 0,
  };
  const executions = runs.map((run) => {
    const owned = Boolean(run.agent_id && agentIds.has(run.agent_id));
    const assignment = !run.agent_id ? "unassigned" : owned ? "owned" : "unmatched";
    if (assignment === "owned") ownership.owned += 1;
    else if (assignment === "unassigned") ownership.unassigned += 1;
    else ownership.unmatched += 1;
    const age = time(run.heartbeat_at, now);
    const live = LIVE_TASK.has(String(run.status ?? ""));
    const worker = !live
      ? "idle"
      : age == null
        ? "unknown"
        : age <= AGENT_STALE_MS
          ? "healthy"
          : "stale";
    const receipt: ExecutionReceipt | null = input.sources.audit.available
      ? buildExecutionReceipt(run, latestAudit(input.audit, run.id))
      : null;
    return {
      id: run.id,
      title: run.title || run.input?.slice(0, 120) || "Agent run",
      agentId: run.agent_id ?? null,
      agentName: run.agent_id ? (agentNames.get(run.agent_id) ?? null) : null,
      status: run.status ?? "unknown",
      assignment,
      worker,
      heartbeatAgeMs: age,
      replanCount: finite(run.replan_count),
      resumeCount: finite(run.resume_count),
      hasCheckpoint: Boolean(run.has_checkpoint),
      canCancel: live && run.cancel_requested !== true,
      canRunAgain: !live && owned && Boolean(run.input?.trim()) && Boolean(run.agent_id),
      input: run.input ?? "",
      receipt,
    };
  });

  const workers = [
    ...executions
      .filter((row) => row.worker !== "idle")
      .map((row) => ({
        id: `agent:${row.id}`,
        kind: "agent_task" as const,
        label: row.title,
        status: row.worker,
        ageMs: row.heartbeatAgeMs,
      })),
    ...(input.sources.workflowRuns.available
      ? input.workflowRuns
          .filter((run) => run.status === "running")
          .map((run) => {
            const age = time(run.worker_heartbeat_at, now);
            return {
              id: `workflow:${run.id}`,
              kind: "workflow_run" as const,
              label: `Workflow run ${run.id.slice(0, 8)}`,
              status: age == null ? "unknown" : age <= WORKFLOW_STALE_MS ? "healthy" : "stale",
              ageMs: age,
            };
          })
      : []),
  ];

  const recovery = executions
    .map((row) => {
      const resumeCount = row.resumeCount ?? 0;
      if (row.status === "waiting_for_approval") {
        return {
          ...row,
          kind: "approval_pause" as const,
          detail: "Waiting for an operator decision. Approval resume stays on this task.",
        };
      }
      if (row.worker === "stale") {
        return {
          ...row,
          kind: row.hasCheckpoint
            ? ("scheduler_recoverable" as const)
            : ("stale_without_checkpoint" as const),
          detail: row.hasCheckpoint
            ? "Heartbeat is stale and a checkpoint exists. The scheduled resume worker owns the lease; this screen does not steal it."
            : "Heartbeat is stale and there is no checkpoint to resume. Cancel it if it should not stay live.",
        };
      }
      if (row.status === "failed" && row.hasCheckpoint && resumeCount < MAX_RESUME_ATTEMPTS) {
        return {
          ...row,
          kind: "failed_with_checkpoint" as const,
          detail: `Resume attempts recorded: ${resumeCount} of ${MAX_RESUME_ATTEMPTS}. Recovery remains on the scheduled worker.`,
        };
      }
      if (row.status === "failed" && resumeCount >= MAX_RESUME_ATTEMPTS) {
        return {
          ...row,
          kind: "resume_exhausted" as const,
          detail: "Bounded resume attempts are exhausted. Run again only starts a new owned task.",
        };
      }
      return null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const schedules =
    input.sources.goals.available || input.sources.workflows.available
      ? {
          available: input.sources.goals.available && input.sources.workflows.available,
          goals: input.sources.goals.available
            ? input.goals
                .filter(
                  (goal) =>
                    goal.trigger_type === "schedule" ||
                    goal.trigger_type === "continuous" ||
                    Boolean(goal.next_run_at),
                )
                .map((goal) => ({
                  id: goal.id,
                  name: goal.name || "Autonomous goal",
                  status: goal.status ?? "unknown",
                  triggerType: goal.trigger_type ?? "manual",
                  cron: goal.schedule_cron ?? null,
                  timezone: goal.timezone ?? null,
                  nextRunAt: goal.next_run_at ?? null,
                  lastRunAt: goal.last_run_at ?? null,
                  workforceId: goal.workforce_id ?? null,
                }))
            : null,
          workflows: input.sources.workflows.available
            ? input.workflows
                .filter((workflow) => Boolean(workflow.schedule?.trim()))
                .map((workflow) => ({
                  id: workflow.id,
                  name: workflow.name || "Workflow",
                  status: workflow.status ?? "unknown",
                  schedule: workflow.schedule ?? "",
                  triggerType: workflow.trigger_type ?? null,
                  workforceId: workflow.workforce_id ?? null,
                }))
            : null,
        }
      : { available: false, goals: null, workflows: null };

  const completedRuns = input.sources.workflowRuns.available
    ? input.workflowRuns.filter((run) => run.started_at && run.completed_at)
    : [];
  const durations = completedRuns
    .map((run) => {
      const start = new Date(String(run.started_at)).getTime();
      const end = new Date(String(run.completed_at)).getTime();
      return Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null;
    })
    .filter((value): value is number => value != null);

  const workforceReport = {
    available: input.sources.workforces.available && input.sources.workflowRuns.available,
    workforces: input.sources.workforces.available ? input.workforces.length : null,
    activeWorkforces: input.sources.workforces.available
      ? input.workforces.filter((row) => row.status === "active").length
      : null,
    runs: input.sources.workflowRuns.available ? input.workflowRuns.length : null,
    runningRuns: input.sources.workflowRuns.available
      ? input.workflowRuns.filter((run) => LIVE_TASK.has(String(run.status ?? ""))).length
      : null,
    failedRuns: input.sources.workflowRuns.available
      ? input.workflowRuns.filter((run) => run.status === "failed").length
      : null,
    averageDurationMs: durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : null,
  };

  return {
    sources: input.sources,
    ownership,
    executions,
    workers,
    recovery,
    schedules,
    workforceReport,
    receipts: executions
      .map((row) => row.receipt)
      .filter((receipt): receipt is ExecutionReceipt => Boolean(receipt)),
  };
}
