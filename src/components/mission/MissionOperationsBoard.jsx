import { Activity, CalendarClock, HeartPulse, ShieldCheck, Workflow } from "lucide-react";

function age(ms) {
  if (ms == null) return "no heartbeat";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  return `${Math.round(ms / 60_000)}m ago`;
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#030812] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-violet-300" />
        <h3 className="text-[10px] font-semibold uppercase tracking-[.14em] text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export default function MissionOperationsBoard({ operations, busyId, onCancel, onRunAgain }) {
  if (!operations) return null;
  const sources = operations.sources ?? {};
  const unverified = Object.entries(sources)
    .filter(([, source]) => source && source.available === false)
    .map(([name]) => name);
  const executions = operations.executions ?? [];
  const live = executions.filter((row) =>
    ["pending", "queued", "running", "waiting_for_tool", "waiting_for_approval"].includes(
      row.status,
    ),
  );

  return (
    <div className="mt-3 space-y-3">
      {unverified.length ? (
        <p className="rounded-xl border border-amber-300/20 bg-amber-300/[.05] px-3 py-2 text-[11px] text-amber-100">
          Unverified sources are omitted rather than shown as zero: {unverified.join(", ")}.
        </p>
      ) : null}
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel icon={Activity} title="Live agent execution">
          {sources.agentRuns?.available === false ? (
            <p className="text-[11px] text-amber-100">Agent runs could not be verified.</p>
          ) : live.length === 0 ? (
            <p className="text-[11px] text-zinc-500">No agent runs are currently in flight.</p>
          ) : (
            <ul className="space-y-2">
              {live.slice(0, 8).map((row) => (
                <li key={row.id} className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] text-zinc-100">{row.title}</p>
                    <span className="font-mono text-[9px] uppercase text-violet-200">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {row.agentName ||
                      (row.assignment === "unassigned"
                        ? "Unassigned"
                        : "Agent not in this account")}{" "}
                    · heartbeat {age(row.heartbeatAgeMs)} · {row.worker}
                  </p>
                  {row.canCancel ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => onCancel?.(row.id)}
                      className="mt-2 rounded-lg border border-rose-300/20 px-2 py-1 text-[10px] text-rose-100"
                    >
                      Cancel run
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={ShieldCheck} title="Execution receipts">
          {sources.audit?.available === false ? (
            <p className="text-[11px] text-amber-100">Audit receipts could not be verified.</p>
          ) : (
            <ul className="space-y-2">
              {(operations.receipts ?? []).slice(0, 8).map((receipt) => (
                <li
                  key={receipt.taskId}
                  className="rounded-xl border border-white/8 bg-black/30 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] text-zinc-200">
                      {receipt.taskId.slice(0, 8)}
                    </p>
                    <span
                      className={`text-[9px] uppercase ${receipt.provesExecution ? "text-emerald-200" : "text-amber-200"}`}
                    >
                      {receipt.provesExecution ? "Proven" : "Not proven"}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {receipt.provider || "provider unset"} · {receipt.model || "model unset"} ·{" "}
                    {receipt.toolCalls} tool calls
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">{receipt.reason}</p>
                </li>
              ))}
              {(operations.receipts ?? []).length === 0 ? (
                <p className="text-[11px] text-zinc-500">
                  No loaded run has an execution receipt yet.
                </p>
              ) : null}
            </ul>
          )}
        </Panel>

        <Panel icon={HeartPulse} title="Worker health">
          {sources.agentRuns?.available === false && sources.workflowRuns?.available === false ? (
            <p className="text-[11px] text-amber-100">Worker heartbeats could not be verified.</p>
          ) : (operations.workers ?? []).length === 0 ? (
            <p className="text-[11px] text-zinc-500">No live workers in the loaded ledgers.</p>
          ) : (
            <ul className="space-y-2">
              {operations.workers.slice(0, 8).map((worker) => (
                <li
                  key={worker.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-[11px]"
                >
                  <span className="truncate text-zinc-200">
                    {worker.kind === "workflow_run" ? "Workforce worker" : "Agent runtime"} ·{" "}
                    {worker.label}
                  </span>
                  <span
                    className={
                      worker.status === "healthy"
                        ? "text-emerald-200"
                        : worker.status === "stale"
                          ? "text-rose-200"
                          : "text-amber-200"
                    }
                  >
                    {worker.status} · {age(worker.ageMs)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={Workflow} title="Task recovery">
          {(operations.recovery ?? []).length === 0 ? (
            <p className="text-[11px] text-zinc-500">
              No recoverable, paused or exhausted runs in the loaded ledger.
            </p>
          ) : (
            <ul className="space-y-2">
              {operations.recovery.slice(0, 8).map((row) => (
                <li key={row.id} className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
                  <p className="text-[11px] text-zinc-100">{row.title}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{row.detail}</p>
                  <div className="mt-2 flex gap-2">
                    {row.canCancel ? (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => onCancel?.(row.id)}
                        className="rounded-lg border border-rose-300/20 px-2 py-1 text-[10px] text-rose-100"
                      >
                        Cancel
                      </button>
                    ) : null}
                    {row.canRunAgain ? (
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() =>
                          onRunAgain?.({ id: row.id, agentId: row.agentId, input: row.input })
                        }
                        className="rounded-lg border border-violet-300/20 px-2 py-1 text-[10px] text-violet-100"
                      >
                        Run again
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={CalendarClock} title="Scheduling">
          {operations.schedules?.goals == null && operations.schedules?.workflows == null ? (
            <p className="text-[11px] text-amber-100">Schedules could not be verified.</p>
          ) : (
            <div className="space-y-2 text-[11px] text-zinc-400">
              {(operations.schedules.goals ?? []).length === 0 &&
              (operations.schedules.workflows ?? []).length === 0 ? (
                <p>No scheduled goals or workflows are stored.</p>
              ) : null}
              {(operations.schedules.goals ?? []).slice(0, 6).map((goal) => (
                <p key={goal.id}>
                  {goal.name} · {goal.triggerType}
                  {goal.cron ? ` · ${goal.cron}` : ""}
                  {goal.nextRunAt
                    ? ` · next ${new Date(goal.nextRunAt).toLocaleString("en-GB")}`
                    : ""}
                </p>
              ))}
              {(operations.schedules.workflows ?? []).slice(0, 6).map((workflow) => (
                <p key={workflow.id}>
                  {workflow.name} · {workflow.schedule}
                </p>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={Workflow} title="Workforce report">
          {operations.workforceReport?.available === false ? (
            <p className="text-[11px] text-amber-100">Workforce totals could not be verified.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300">
              <p>Workforces: {operations.workforceReport.workforces}</p>
              <p>Active: {operations.workforceReport.activeWorkforces}</p>
              <p>Runs loaded: {operations.workforceReport.runs}</p>
              <p>In flight: {operations.workforceReport.runningRuns}</p>
              <p>Failed: {operations.workforceReport.failedRuns}</p>
              <p>
                Average duration:{" "}
                {operations.workforceReport.averageDurationMs == null
                  ? "no completed timestamps"
                  : `${Math.round(operations.workforceReport.averageDurationMs / 1000)}s`}
              </p>
              <p className="col-span-2 text-zinc-500">
                {operations.ownership?.available === false
                  ? "Agent ownership could not be verified."
                  : `Owned runs ${operations.ownership?.owned ?? 0} · unassigned ${operations.ownership?.unassigned ?? 0} · unmatched ${operations.ownership?.unmatched ?? 0}`}
              </p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
