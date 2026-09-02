import { useMemo, useState } from 'react';
import { Network, Play, ShieldCheck, Sparkles, Users, GitBranch, Radio } from 'lucide-react';

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
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-black/45 p-5 shadow-[0_30px_100px_rgba(0,0,0,.4)] backdrop-blur-2xl sm:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(139,92,246,.16),transparent_32%),radial-gradient(circle_at_90%_20%,rgba(139,92,246,.08),transparent_25%)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-300/75">
            <Network className="h-4 w-4" /> Blackstar Orchestration Core
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-white">Turn one outcome into coordinated execution.</h2>
          <p className="mt-2 text-sm leading-6 text-white/48">
            Blackstar selects the strongest available specialists, maps dependencies, delegates each operation and verifies the execution chain before the mission closes.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[.045] px-3 py-2 text-[11px] text-emerald-100/80"><ShieldCheck className="h-3.5 w-3.5" /> Isolated permissions</div>
          <div className="flex items-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[.045] px-3 py-2 text-[11px] text-violet-100/80"><Radio className="h-3.5 w-3.5" /> Governed execution</div>
        </div>
      </div>

      <form onSubmit={submit} className="relative mt-6 rounded-2xl border border-white/8 bg-white/[.025] p-3">
        <textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={4}
          maxLength={12000}
          placeholder="Define the mission outcome. Blackstar will select specialists, build the dependency graph and coordinate execution."
          className="w-full resize-y rounded-xl border border-white/8 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/22 focus:border-violet-300/30 focus:ring-2 focus:ring-violet-400/10"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/25">Mission definition · {goal.length.toLocaleString()} / 12,000</span>
          <button type="submit" disabled={!goal.trim() || pending} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-35">
            {pending ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
            {pending ? 'Building execution graph…' : 'Launch orchestration'}
          </button>
        </div>
      </form>

      {result && (
        <div className="relative mt-6 border-t border-white/8 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-300/65"><GitBranch className="h-3.5 w-3.5" /> Execution graph</p>
              <p className="mt-1.5 text-sm text-white/68">{result?.plan?.summary || result?.workflow?.name || 'Generated specialist workflow'}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-lg border border-white/8 bg-white/[.025] px-2.5 py-1.5 text-white/55"><Users className="mr-1.5 inline h-3.5 w-3.5" />{assignments.length} nodes</span>
              <span className="rounded-lg border border-white/8 bg-white/[.025] px-2.5 py-1.5 text-white/55">{completed}/{assignments.length} verified</span>
              <span className="rounded-lg border border-violet-300/15 bg-violet-300/[.05] px-2.5 py-1.5 text-violet-100/80">{status}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment, index) => {
              const step = execution?.steps?.[index];
              return (
                <div key={assignment.id} className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-white">{assignment.title}</p><p className="mt-1 text-xs leading-5 text-white/42">{assignment.objective}</p></div>
                    <span className="shrink-0 rounded-md border border-white/8 bg-black/25 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/38">{step?.status ?? 'planned'}</span>
                  </div>
                  {assignment.depends_on?.length > 0 && <p className="mt-3 text-[10px] text-white/30">Dependencies: {assignment.depends_on.join(', ')}</p>}
                  {assignment.requires_approval && <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300/80">Human approval gate</p>}
                </div>
              );
            })}
          </div>

          {execution?.output && <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[.035] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/70">Verified mission output</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-white/62">{execution.output}</p></div>}
        </div>
      )}
    </section>
  );
}
