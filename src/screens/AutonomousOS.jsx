import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BrainCircuit, Pause, Play, Plus, RefreshCw, ShieldCheck, Sparkles, Square, TimerReset, Users } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { friendlyMessage } from '@/lib/errors';
import { useSessionReady } from '@/lib/useSessionReady';
import { createAutonomousGoal, listAutonomousGoals, controlAutonomousGoal } from '@/lib/runtime/autonomous-os.functions';
import { queueAutonomousGoalNow } from '@/lib/runtime/autonomous-os.manual.functions';

const badge = (status) => {
  if (status === 'completed') return 'border-emerald-300/20 bg-emerald-300/[.06] text-emerald-200';
  if (status === 'failed' || status === 'cancelled') return 'border-rose-300/20 bg-rose-300/[.06] text-rose-200';
  if (status === 'paused' || status === 'waiting_for_approval') return 'border-amber-300/20 bg-amber-300/[.06] text-amber-200';
  return 'border-violet-300/20 bg-violet-300/[.06] text-violet-100';
};

const when = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const emptyDraft = () => ({
  name: '',
  objective: '',
  autonomy_level: 'guarded',
  trigger_type: 'manual',
  schedule_cron: '',
  event_match: '',
});

export default function AutonomousOS() {
  const session = useSessionReady();
  const qc = useQueryClient();
  const listFn = useServerFn(listAutonomousGoals);
  const createFn = useServerFn(createAutonomousGoal);
  const runFn = useServerFn(queueAutonomousGoalNow);
  const controlFn = useServerFn(controlAutonomousGoal);
  const [draft, setDraft] = useState(emptyDraft);

  const goalsQuery = useQuery({ queryKey: ['autonomous-os-goals'], queryFn: () => listFn(), enabled: session === 'yes', refetchInterval: 15000, retry: 1 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['autonomous-os-goals'] });
  const createGoal = useMutation({ mutationFn: (data) => createFn({ data }), onSuccess: () => { setDraft(emptyDraft()); refresh(); } });
  const runGoal = useMutation({ mutationFn: (id) => runFn({ data: { id } }), onSettled: refresh });
  const controlGoal = useMutation({ mutationFn: ({ id, action }) => controlFn({ data: { id, action } }), onSettled: refresh });

  const data = goalsQuery.data ?? { goals: [], runs: [], events: [], fleets: [] };
  const latestRun = useMemo(() => {
    const map = new Map();
    for (const run of data.runs ?? []) if (!map.has(run.goal_id)) map.set(run.goal_id, run);
    return map;
  }, [data.runs]);
  const fleetByGoal = useMemo(() => {
    const map = new Map();
    for (const row of data.fleets ?? []) map.set(row.goal_id, (map.get(row.goal_id) ?? 0) + 1);
    return map;
  }, [data.fleets]);

  const submit = (event) => {
    event.preventDefault();
    const name = draft.name.trim();
    const objective = draft.objective.trim();
    const eventMatch = draft.event_match.trim();
    if (!name || !objective || createGoal.isPending || (draft.trigger_type === 'event' && !eventMatch)) return;
    createGoal.mutate({
      name,
      objective,
      autonomy_level: draft.autonomy_level,
      trigger_type: draft.trigger_type,
      schedule_cron: draft.trigger_type === 'schedule' && draft.schedule_cron.trim() ? draft.schedule_cron.trim() : null,
      event_source: draft.trigger_type === 'event' ? 'notification' : null,
      event_match: draft.trigger_type === 'event' ? eventMatch : null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      max_parallel_agents: 4,
      max_runtime_seconds: 3600,
      budget_pence: null,
      require_approval_for_external_actions: true,
      allow_replanning: true,
      success_criteria: [],
    });
  };

  const invalidEvent = draft.trigger_type === 'event' && !draft.event_match.trim();

  return <>
    <PageHeader eyebrow="Autonomous Intelligence" title="Autonomous OS" description="Persistent goals that Blackstar can plan, delegate to specialist fleets, execute, observe and govern through the existing agent runtime." />

    <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
      <section className="relative overflow-hidden rounded-[28px] border border-violet-300/15 bg-black/45 p-5 shadow-[0_30px_100px_rgba(0,0,0,.35)] backdrop-blur-2xl sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,.18),transparent_38%),radial-gradient(circle_at_100%_100%,rgba(34,211,238,.08),transparent_28%)]" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.28em] text-violet-300/80"><BrainCircuit className="h-4 w-4" /> Persistent mission kernel</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] text-white">Give Blackstar an outcome, not a prompt.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">The Orchestrator chooses specialists, builds dependencies, preserves permissions and approval gates, and links every run back to this persistent goal.</p></div><ShieldCheck className="h-7 w-7 text-emerald-300/70" /></div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} maxLength={160} placeholder="Goal name · e.g. Launch Tokyo expansion" className="w-full rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-violet-300/30" />
            <textarea value={draft.objective} onChange={(e) => setDraft((v) => ({ ...v, objective: e.target.value }))} rows={6} maxLength={12000} placeholder="Describe the outcome Blackstar should own. Include constraints, evidence requirements and what success looks like." className="w-full resize-y rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/22 focus:border-violet-300/30" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-white/45">Autonomy level<select value={draft.autonomy_level} onChange={(e) => setDraft((v) => ({ ...v, autonomy_level: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="assisted">Assisted</option><option value="guarded">Guarded</option><option value="autonomous">Autonomous</option></select></label>
              <label className="text-xs text-white/45">Trigger<select value={draft.trigger_type} onChange={(e) => setDraft((v) => ({ ...v, trigger_type: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"><option value="manual">Manual</option><option value="schedule">Schedule</option><option value="event">Event</option><option value="continuous">Continuous</option></select></label>
            </div>
            {draft.trigger_type === 'schedule' && <input value={draft.schedule_cron} onChange={(e) => setDraft((v) => ({ ...v, schedule_cron: e.target.value }))} placeholder="Cron schedule · e.g. 0 8 * * 1-5" className="w-full rounded-xl border border-white/10 bg-white/[.025] px-4 py-3 text-sm text-white outline-none placeholder:text-white/22" />}
            {draft.trigger_type === 'event' && <div><input value={draft.event_match} onChange={(e) => setDraft((v) => ({ ...v, event_match: e.target.value }))} maxLength={160} placeholder="Wake when a notification contains · e.g. payment failed" className="w-full rounded-xl border border-cyan-300/15 bg-cyan-300/[.025] px-4 py-3 text-sm text-white outline-none placeholder:text-white/22 focus:border-cyan-300/30" /><p className="mt-1.5 text-[10px] text-white/28">Matches notification title, body or kind. Autonomous OS lifecycle notifications are excluded to prevent loops.</p></div>}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1"><p className="text-[10px] uppercase tracking-[.18em] text-white/24">External actions stay approval-gated by default.</p><button type="submit" disabled={createGoal.isPending || !draft.name.trim() || !draft.objective.trim() || invalidEvent} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40">{createGoal.isPending ? <Sparkles className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />}{createGoal.isPending ? 'Creating…' : 'Create autonomous goal'}</button></div>
          </form>
          {createGoal.isError && <p className="mt-3 text-sm text-rose-300">{friendlyMessage(createGoal.error)}</p>}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[.02] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-cyan-300/70">Runtime posture</p><h3 className="mt-1 text-lg font-semibold text-white">Agent fleet control</h3></div><button onClick={() => goalsQuery.refetch()} className="rounded-lg border border-white/10 p-2 text-white/45 hover:text-white"><RefreshCw className={`h-4 w-4 ${goalsQuery.isFetching ? 'animate-spin' : ''}`} /></button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><Users className="h-5 w-5 text-violet-300" /><p className="mt-3 text-2xl font-semibold text-white">{data.goals?.filter((g) => g.status === 'active').length ?? 0}</p><p className="text-xs text-white/35">Active persistent goals</p></div>
          <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><TimerReset className="h-5 w-5 text-cyan-300" /><p className="mt-3 text-2xl font-semibold text-white">{data.runs?.filter((r) => ['queued','planning','running','waiting_for_approval'].includes(r.status)).length ?? 0}</p><p className="text-xs text-white/35">Queued / live governed runs</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-emerald-300/12 bg-emerald-300/[.035] p-4 text-sm leading-6 text-white/55"><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" />Existing agent tool grants, memory boundaries, approvals and workforce verification remain authoritative. Manual, scheduled, event-triggered and continuous runs all hand execution to the same durable workflow worker.</div>
      </section>
    </div>

    <section className="mt-4 rounded-[28px] border border-white/10 bg-black/35 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.25em] text-violet-300/70">Mission portfolio</p><h3 className="mt-1 text-xl font-semibold text-white">Persistent goals</h3></div><span className="text-xs text-white/30">{data.goals?.length ?? 0} total</span></div>
      {goalsQuery.isLoading && <p className="mt-5 text-sm text-white/35">Loading autonomous goals…</p>}
      {goalsQuery.isError && <p className="mt-5 text-sm text-rose-300">{friendlyMessage(goalsQuery.error)}</p>}
      {!goalsQuery.isLoading && !goalsQuery.isError && !data.goals?.length && <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center"><BrainCircuit className="mx-auto h-8 w-8 text-white/20" /><p className="mt-3 text-sm text-white/45">No autonomous goals yet. Create the first persistent mission above.</p></div>}
      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {(data.goals ?? []).map((goal) => { const run = latestRun.get(goal.id); const fleetCount = fleetByGoal.get(goal.id) ?? 0; const busy = (runGoal.isPending && runGoal.variables === goal.id) || (controlGoal.isPending && controlGoal.variables?.id === goal.id); return <article key={goal.id} className="rounded-2xl border border-white/8 bg-white/[.018] p-4">
          <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-white">{goal.name}</h4><span className={`rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[.14em] ${badge(goal.status)}`}>{goal.status}</span></div><p className="mt-2 line-clamp-3 text-sm leading-6 text-white/42">{goal.objective}</p></div><BrainCircuit className="h-5 w-5 shrink-0 text-violet-300/60" /></div>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-white/35"><span className="rounded-md border border-white/8 px-2 py-1">{goal.autonomy_level}</span><span className="rounded-md border border-white/8 px-2 py-1">{goal.trigger_type}</span><span className="rounded-md border border-white/8 px-2 py-1">up to {goal.max_parallel_agents} agents</span>{goal.trigger_type === 'event' && goal.event_match && <span className="rounded-md border border-cyan-300/10 px-2 py-1 text-cyan-100/60">match: {goal.event_match}</span>}{fleetCount > 0 && <span className="rounded-md border border-cyan-300/10 px-2 py-1 text-cyan-100/60">{fleetCount} fleet assignments</span>}{run && <span className={`rounded-md border px-2 py-1 ${badge(run.status)}`}>last run: {run.status}</span>}</div>
          {(goal.next_run_at || goal.scheduler_attempts > 0) && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/30">{goal.next_run_at && <span>Next worker pickup: {when(goal.next_run_at)}</span>}{goal.scheduler_attempts > 0 && <span className="text-amber-200/70">Scheduler retry {goal.scheduler_attempts}</span>}</div>}
          {(run?.error || goal.last_scheduler_error) && <p className="mt-3 text-xs text-rose-300/80">{run?.error || goal.last_scheduler_error}</p>}
          {run?.heartbeat_at && ['queued','planning','running','waiting_for_approval'].includes(run.status) && <p className="mt-2 text-[10px] text-emerald-200/45">Worker heartbeat: {when(run.heartbeat_at)}</p>}
          <div className="mt-4 flex flex-wrap gap-2">{goal.status === 'active' && <button disabled={busy} onClick={() => runGoal.mutate(goal.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"><Play className="h-3.5 w-3.5" />{runGoal.isPending && runGoal.variables === goal.id ? 'Queueing…' : 'Run now'}</button>}{goal.status === 'active' && <button disabled={busy} onClick={() => controlGoal.mutate({ id: goal.id, action: 'pause' })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60"><Pause className="h-3.5 w-3.5" />Pause</button>}{goal.status === 'paused' && <button disabled={busy} onClick={() => controlGoal.mutate({ id: goal.id, action: 'resume' })} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/15 px-3 py-2 text-xs text-emerald-200"><Play className="h-3.5 w-3.5" />Resume</button>}{!['cancelled','completed'].includes(goal.status) && <button disabled={busy} onClick={() => controlGoal.mutate({ id: goal.id, action: 'cancel' })} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/15 px-3 py-2 text-xs text-rose-200"><Square className="h-3.5 w-3.5" />Cancel</button>}</div>
          {runGoal.isError && runGoal.variables === goal.id && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(runGoal.error)}</p>}
        </article>; })}
      </div>
    </section>
  </>;
}
