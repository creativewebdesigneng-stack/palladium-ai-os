import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getAutonomousBusinessRunEvidence } from '@/lib/runtime/autonomous-business-evidence.functions';
import { SIX_AGENT_BUSINESS_BLUEPRINT } from '@/lib/runtime/business-operations-blueprint';
import { friendlyMessage } from '@/lib/errors';

export default function BusinessRunEvidencePanel({ goals = [], session }) {
  const [selected, setSelected] = useState('');
  const readEvidence = useServerFn(getAutonomousBusinessRunEvidence);
  const businessGoals = goals.filter((goal) => goal.success_criteria?.blueprint_id === SIX_AGENT_BUSINESS_BLUEPRINT.id);
  const goalId = businessGoals.some((goal) => goal.id === selected) ? selected : (businessGoals[0]?.id ?? null);
  const evidence = useQuery({
    queryKey: ['autonomous-six-agent-evidence', goalId],
    queryFn: () => readEvidence({ data: { goalId } }),
    enabled: session === 'yes' && Boolean(goalId),
    refetchInterval: 15000,
    retry: 1,
  });
  const data = evidence.data;

  return <section aria-labelledby="business-run-evidence-heading" className="mt-4 rounded-[28px] border border-violet-300/15 bg-black/35 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-violet-300/80">Execution evidence</p>
        <h3 id="business-run-evidence-heading" className="mt-1 text-xl font-semibold text-white">Six-agent business mission receipts</h3>
        <p className="mt-2 text-xs leading-5 text-white/45">Owner-scoped records from the existing workflow, fleet assignments, tool executions and approvals. A recorded tool success is not independent provider certification or proof of earned money.</p>
      </div>
      {!!businessGoals.length && <label className="text-xs text-white/50">Mission
        <select aria-label="Select six-agent business mission" value={goalId ?? ''} onChange={(event) => setSelected(event.target.value)} className="mt-1.5 block max-w-[260px] rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white">
          {businessGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
        </select>
      </label>}
    </div>

    {!businessGoals.length && <p className="mt-5 rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">No six-agent blueprint goal exists in this account yet. Prepare the preset above, review its limits and create the goal to begin collecting evidence.</p>}
    {evidence.isLoading && <p className="mt-5 text-xs text-white/40">Reading persisted execution records…</p>}
    {evidence.isError && <p className="mt-5 text-xs text-rose-200"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{friendlyMessage(evidence.error)}</p>}
    {data && <>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Planned assignments', data.plannedAssignments],
          ['Distinct assigned agents', data.distinctAgentsAssigned],
          ['Completed assignments', data.completedAssignments],
          ['Recorded tool calls', data.recordedToolCalls],
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.07] bg-white/[.02] p-3"><p className="text-xl font-semibold text-white">{value}</p><p className="mt-1 text-[10px] text-white/40">{label}</p></div>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/45">
        <span className="rounded-md border border-white/10 px-2 py-1">Run: {data.runStatus}</span>
        <span className="rounded-md border border-white/10 px-2 py-1">{data.succeededToolRecords} recorded tool successes</span>
        <span className="rounded-md border border-white/10 px-2 py-1">{data.failedToolRecords} recorded tool failures</span>
        <span className="rounded-md border border-white/10 px-2 py-1">{data.approvalRecords} approval records</span>
        <span className="rounded-md border border-amber-300/15 px-2 py-1 text-amber-100">Owner start gate: {data.workflowGateStatus} ({data.workflowGateRecords} record(s))</span>
      </div>
      {data.truncated && <p className="mt-3 text-xs text-amber-200">Record limit reached. Counts may be incomplete; inspect the full audit trail before certifying outcomes.</p>}
      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {data.assignments.map((assignment) => <article key={assignment.assignmentId} className="rounded-xl border border-white/[.08] bg-black/25 p-3">
          <div className="flex flex-wrap items-center gap-2"><Activity className="h-3.5 w-3.5 text-violet-300" /><h4 className="text-xs font-semibold text-white">{assignment.title}</h4></div>
          <p className="mt-2 text-[10px] text-white/40">Recorded status: <span className="text-white/75">{assignment.status}</span> · {assignment.taskRecords} agent task record(s)</p>
          <p className="mt-1 text-[10px] text-white/40">Tools: {assignment.toolRecords} recorded · {assignment.toolsSucceeded} succeeded · {assignment.toolsFailed} failed</p>
          <p className="mt-1 text-[10px] text-white/40">Approval receipts: {assignment.approvalRecords} · recorded executions: {assignment.approvalExecutionReceipts}</p>
          <p className="mt-2 text-[10px] text-cyan-200/65">{assignment.toolNames.length ? assignment.toolNames.join(', ') : 'No tool executions recorded for this assignment'}</p>
        </article>)}
      </div>
      {!data.assignments.length && <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs text-white/40">No workforce assignments have been persisted for this run. Nothing has been certified as executed.</p>}
      <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[.025] p-3 text-xs leading-5 text-amber-100/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Financial outcome: unverified. No revenue, profit, withdrawals or payment settlement is inferred from task output, recorded tools, approvals or Blackstar's internal agent ledger.</p>
    </>}
  </section>;
}
