import { useMemo, useState } from 'react';
import { Network, Play, ShieldCheck, Sparkles, Users } from 'lucide-react';

function statusLabel(execution) {
  if (execution?.paused) return 'Waiting for approval';
  const status = execution?.run?.status;
  if (status === 'succeeded') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  return status ? String(status).replaceAll('_', ' ') : 'Ready';
}

export default function OrchestratorConsole({ onRun, pending, result }) {
  const [goal, setGoal] = useState('');
  const assignments = result?.plan?.assignments ?? [];
  const execution = result?.execution;
  const completed = execution?.steps?.filter((step) => step.status === 'succeeded').length ?? 0;
  const status = useMemo(() => statusLabel(execution), [execution]);

  const submit = (event) => {
    event.preventDefault();
    const value = goal.trim();
    if (!value || pending) return;
    onRun(value);
  };

  return (
    <section className="rounded-3xl border border-violet-400/20 bg-violet-500/[.045] p-5 shadow-[0_0_60px_rgba(139,92,246,0.08)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">
            <Network className="h-4 w-4" /> Palladium Orchestrator
          </div>
          <h2 className="text-xl font-semibold text-white">Give the workforce one outcome.</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            Palladium selects the best active specialists, creates a dependency-aware plan, delegates the work and verifies each agent before the mission completes.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[.06] px-3 py-2 text-xs text-emerald-200">
          <ShieldCheck className="h-4 w-4" /> Agent permissions stay isolated
        </div>
      </div>

      <form onSubmit={submit} className="mt-5">
        <textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={4}
          maxLength={12000}
          placeholder="Example: Research our top competitors, identify the strongest market opportunity, produce a launch strategy and prepare the implementation plan."
          className="w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/10"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-zinc-500">{goal.length.toLocaleString()} / 12,000 characters</span>
          <button
            type="submit"
            disabled={!goal.trim() || pending}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
            {pending ? 'Orchestrating…' : 'Orchestrate mission'}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Latest delegation</p>
              <p className="mt-1 text-sm text-zinc-300">{result?.plan?.summary || result?.workflow?.name || 'Generated specialist workflow'}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-zinc-300"><Users className="mr-1.5 inline h-3.5 w-3.5" />{assignments.length} assignments</span>
              <span className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-zinc-300">{completed}/{assignments.length} completed</span>
              <span className="rounded-lg border border-violet-400/20 bg-violet-500/[.06] px-2.5 py-1.5 text-violet-200">{status}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment, index) => {
              const step = execution?.steps?.[index];
              return (
                <div key={assignment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{assignment.title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-400">{assignment.objective}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-white/[.05] px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400">{step?.status ?? 'planned'}</span>
                  </div>
                  {assignment.depends_on?.length > 0 && <p className="mt-3 text-[11px] text-zinc-500">Depends on: {assignment.depends_on.join(', ')}</p>}
                  {assignment.requires_approval && <p className="mt-2 text-[11px] font-medium text-amber-300">Approval gate required</p>}
                </div>
              );
            })}
          </div>

          {execution?.output && (
            <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-500/[.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Verified mission output</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{execution.output}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
