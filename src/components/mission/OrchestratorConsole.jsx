import { useMemo, useState } from 'react';
import { Network, Play, ShieldCheck, Sparkles, Users, GitBranch, Radio, BadgeCheck, Gauge } from 'lucide-react';

function statusLabel(execution) {
  if (execution?.paused) return 'Waiting for approval';
  const status = execution?.run?.status;
  if (status === 'succeeded') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  return status ? String(status).replaceAll('_', ' ') : 'Ready';
}

function SelectionAttribution({ attribution, outcome }) {
  if (!attribution) return null;
  const breakdown = attribution.score_breakdown || {};
  const trust = attribution.trust_score == null ? null : Math.round(attribution.trust_score * 100);
  const performance = attribution.recent_performance;
  const similar = attribution.similar_task_performance;
  const evidence = [
    ...(attribution.matched_skills || []).map((skill) => ({
      label: `${skill.name}${skill.verified ? ' · verified' : ''}`,
      verified: skill.verified,
    })),
    ...(attribution.matched_tools || []).map((item) => ({ label: `Tool · ${item}`, verified: false })),
    ...(attribution.matched_connectors || []).map((item) => ({ label: `Connector · ${item}`, verified: false })),
    ...(attribution.matched_certifications || []).map((item) => ({ label: `Certificate · ${item}`, verified: true })),
  ].slice(0, 10);

  return (
    <div className="mt-3 rounded-xl border border-violet-300/10 bg-violet-300/[.025] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/70">
          <BadgeCheck className="h-3.5 w-3.5" /> Selection evidence
        </p>
        <span className="flex items-center gap-1 rounded-md border border-white/8 bg-black/20 px-2 py-1 text-[9px] text-white/45">
          <Gauge className="h-3 w-3" /> mission score {attribution.score}
        </span>
      </div>
      <p className="mt-1.5 text-[11px] text-white/55">
        <span className="font-medium text-white/75">{attribution.agent_name}</span> · {attribution.role}
      </p>

      {evidence.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {evidence.map((item, index) => (
            <span
              key={`${item.label}-${index}`}
              className={`rounded-md border px-1.5 py-1 text-[9px] ${item.verified ? 'border-emerald-300/15 bg-emerald-300/[.045] text-emerald-200/75' : 'border-white/8 bg-white/[.025] text-white/42'}`}
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-2 grid gap-1.5 text-[9px] text-white/36 sm:grid-cols-2">
        <p>Score · fit {breakdown.text_fit ?? 0} · registry {breakdown.registry_evidence ?? 0} · trust {breakdown.trust ?? 0} · performance {breakdown.performance ?? 0} · similar {breakdown.similar_performance ?? 0}</p>
        <p>
          {trust == null ? 'Trust evidence unavailable' : `Trust ${trust}%`}
          {performance ? ` · recent ${performance.successes}/${performance.runs} successful` : ''}
          {similar ? ` · similar-task match ${Math.round(similar.average_similarity * 100)}%` : ''}
        </p>
      </div>

      {(attribution.matched_experience || []).length || (attribution.matched_models || []).length ? (
        <p className="mt-1.5 text-[9px] leading-4 text-white/30">
          {attribution.matched_experience?.length ? `Relevant experience: ${attribution.matched_experience.join('; ')}. ` : ''}
          {attribution.matched_models?.length ? `Model fit: ${attribution.matched_models.join(', ')}.` : ''}
        </p>
      ) : null}
      <p className="mt-1.5 text-[9px] leading-4 text-white/25">This explains Blackstar’s deterministic pre-ranking evidence; it does not grant tools, permissions, connector access or approval rights.</p>

      {outcome ? (() => {
        const feedback = outcome.skill_feedback || {};
        const positive = [
          ...(feedback.matched_skills || []).map((item) => `${item} · verified work`),
          ...(feedback.promoted_skills || []).map((item) => `${item} · learned`),
          ...(feedback.certifications_awarded || []).map((item) => `${item} · awarded`),
        ];
        const negative = [
          ...(feedback.flagged_skills || []).map((item) => `${item} · verifier flag`),
          ...(feedback.reduced_skills || []).map((item) => `${item} · confidence reduced`),
          ...(feedback.certifications_expired || []).map((item) => `${item} · expired`),
        ];
        const hasVerifier = typeof outcome.verification_score === 'number' || typeof outcome.verification_passed === 'boolean';
        const taskRef = outcome.task_id ? String(outcome.task_id).slice(0, 12) : null;
        return (
          <div className="mt-3 border-t border-white/8 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/38">Observed outcome</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                <span className={`rounded-md border px-1.5 py-0.5 ${outcome.status === 'succeeded' ? 'border-emerald-300/15 bg-emerald-300/[.04] text-emerald-200/75' : outcome.status === 'failed' ? 'border-amber-300/15 bg-amber-300/[.04] text-amber-200/75' : 'border-white/8 bg-white/[.02] text-white/38'}`}>
                  {String(outcome.status || 'unknown').replaceAll('_', ' ')}
                </span>
                {hasVerifier ? (
                  <span className="rounded-md border border-white/8 bg-black/20 px-1.5 py-0.5 text-white/45">
                    Verifier {typeof outcome.verification_score === 'number' ? `${Math.round(outcome.verification_score * 100)}%` : 'result'}{typeof outcome.verification_passed === 'boolean' ? ` · ${outcome.verification_passed ? 'passed' : 'not passed'}` : ''}
                  </span>
                ) : null}
                {taskRef ? <span className="rounded-md border border-white/8 bg-black/20 px-1.5 py-0.5 text-white/30">task {taskRef}</span> : null}
              </div>
            </div>
            {positive.length || negative.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {positive.map((item) => <span key={item} className="rounded-md border border-emerald-300/15 bg-emerald-300/[.04] px-1.5 py-0.5 text-[9px] text-emerald-200/70">{item}</span>)}
                {negative.map((item) => <span key={item} className="rounded-md border border-amber-300/15 bg-amber-300/[.04] px-1.5 py-0.5 text-[9px] text-amber-200/70">{item}</span>)}
              </div>
            ) : null}
            <p className="mt-2 text-[9px] leading-4 text-white/24">Observed evidence comes only from this executed assignment. Blackstar does not infer outcomes for candidates that were not run.</p>
          </div>
        );
      })() : null}
    </div>
  );
}

function SelectionAudit({ audit }) {
  const candidates = audit?.ranked_candidates || [];
  if (!candidates.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.018] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
            <Users className="h-3.5 w-3.5" /> Candidates considered
          </p>
          <p className="mt-1 text-[10px] leading-4 text-white/28">
            Deterministic bounded pre-ranking. The planner may still assign a lower-ranked specialist when mission decomposition makes that agent a better fit for a specific node.
          </p>
        </div>
        <span className="rounded-md border border-white/8 bg-black/20 px-2 py-1 text-[9px] text-white/35">
          {candidates.length} specialist{candidates.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {candidates.map((candidate) => (
          <div
            key={candidate.agent_id}
            className={`rounded-xl border p-2.5 ${candidate.selected ? 'border-violet-300/15 bg-violet-300/[.035]' : 'border-white/7 bg-black/15'}`}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-white/8 bg-black/20 text-[9px] font-semibold text-white/45">#{candidate.rank}</span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-white/70">{candidate.agent_name}</p>
                <p className="truncate text-[9px] text-white/28">{candidate.role}</p>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {candidate.selected ? <span className="rounded-md border border-violet-300/15 bg-violet-300/[.05] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] text-violet-200/75">assigned</span> : null}
                <span className="text-[9px] text-white/38">{candidate.score} pts</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(candidate.verified_skills || []).slice(0, 4).map((skill) => (
                <span key={skill} className="rounded-md border border-emerald-300/12 bg-emerald-300/[.035] px-1.5 py-0.5 text-[8px] text-emerald-200/65">{skill} · verified</span>
              ))}
              {!candidate.selected && candidate.score_delta_from_top > 0 ? (
                <span className="rounded-md border border-white/7 bg-white/[.02] px-1.5 py-0.5 text-[8px] text-white/28">−{candidate.score_delta_from_top} from top score</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

          <SelectionAudit audit={result?.plan?.selection_audit} />

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment, index) => {
              const step = execution?.steps?.[index];
              return (
                <div key={assignment.id} className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-semibold text-white">{assignment.title}</p><p className="mt-1 text-xs leading-5 text-white/42">{assignment.objective}</p></div>
                    <span className="shrink-0 rounded-md border border-white/8 bg-black/25 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-white/38">{step?.status ?? 'planned'}</span>
                  </div>
                  <SelectionAttribution attribution={assignment.selection_attribution} outcome={step} />
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
