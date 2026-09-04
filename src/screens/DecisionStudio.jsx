import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { GitBranch, Loader2, ShieldCheck, Sparkles, Target } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useSessionReady } from '@/lib/useSessionReady';
import { friendlyMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/use-toast';
import { Failed } from '@/components/business/live';
import {
  evaluateBlackstarCounterfactuals,
  planBlackstarOptimizationDecision,
} from '@/lib/ai-hub/decision-studio.functions';

const control = 'w-full rounded-xl border border-white/10 bg-[#11131a] px-3 py-2 text-xs text-white outline-none focus:border-violet-400/40';

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

const optimizationSeed = JSON.stringify({
  metrics: [{ id: 'conversion', current: 0.12, target: 0.2, direction: 'increase', weight: 1 }],
  candidates: [{ id: 'checkout-copy', title: 'Improve checkout copy', expectedImpact: 0.4, confidence: 0.8, risk: 'low', cost: 500, reversible: true, affectedMetrics: ['conversion'] }],
  policy: { maximumCandidates: 5, minimumConfidence: 0.65, allowedRisk: 'medium', requireApprovalForMediumRisk: true },
}, null, 2);

const counterfactualSeed = JSON.stringify({
  scenarios: [
    { id: 'focused', label: 'Focused launch', expectedOutcome: 0.75, confidence: 0.82, cost: 1500, risk: 'low', reversible: true, assumptions: ['Demand remains stable'] },
    { id: 'broad', label: 'Broad launch', expectedOutcome: 0.9, confidence: 0.68, cost: 6000, risk: 'medium', reversible: true, assumptions: ['Support capacity scales'] },
  ],
  policy: { minConfidence: 0.65, maxCost: 10000, allowedRisk: ['low', 'medium'], requireReversible: true, requireApprovalFor: ['medium'] },
}, null, 2);

export default function DecisionStudio() {
  const session = useSessionReady();
  const { toast } = useToast();
  const optimizationFn = useServerFn(planBlackstarOptimizationDecision);
  const counterfactualFn = useServerFn(evaluateBlackstarCounterfactuals);
  const [optimizationText, setOptimizationText] = useState(optimizationSeed);
  const [counterfactualText, setCounterfactualText] = useState(counterfactualSeed);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [counterfactualResult, setCounterfactualResult] = useState(null);

  const optimize = useMutation({
    mutationFn: () => optimizationFn({ data: parseJson(optimizationText, 'Optimization request') }),
    onSuccess: (result) => setOptimizationResult(result),
    onError: (error) => toast({ variant: 'destructive', title: 'Optimization failed', description: friendlyMessage(error) }),
  });

  const compare = useMutation({
    mutationFn: () => counterfactualFn({ data: parseJson(counterfactualText, 'Counterfactual request') }),
    onSuccess: (result) => setCounterfactualResult(result),
    onError: (error) => toast({ variant: 'destructive', title: 'Scenario analysis failed', description: friendlyMessage(error) }),
  });

  return <>
    <PageHeader eyebrow="Blackstar · Intelligence" title="Decision Studio" description="Compare governed options before execution. Optimize against real target metrics, explore counterfactual branches, surface policy blocks, and identify decisions that require human approval." />
    {session === 'no' && <Failed message="Sign in to use Decision Studio." />}
    <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.04] p-4 text-[11px] leading-5 text-emerald-100/75">
      <ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" />Decision Studio evaluates and ranks options only. It does not bypass Blackstar approvals, permissions, runtime guardrails or execution controls.
    </div>

    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><Target className="h-4 w-4 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Optimization planner</h2><p className="text-xs text-zinc-500">Rank interventions against KPI gaps, confidence, risk, cost and reversibility.</p></div></div>
        <textarea className={`${control} mt-4 min-h-[330px] font-mono`} value={optimizationText} onChange={(event) => setOptimizationText(event.target.value)} spellCheck={false} />
        <button disabled={session !== 'yes' || optimize.isPending} onClick={() => optimize.mutate()} className="mt-3 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white disabled:opacity-40">{optimize.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Build optimization plan</button>
        {optimizationResult && <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2"><Metric label="Recommendations" value={String(optimizationResult.recommendations.length)} /><Metric label="Approval required" value={optimizationResult.requiresApproval ? 'Yes' : 'No'} /></div>
          {optimizationResult.recommendations.map((item, index) => <article key={item.candidate.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-white">#{index + 1} {item.candidate.title}</p><p className="mt-1 text-[10px] text-zinc-500">{item.reasons.join(' · ')}</p></div><span className="text-xs font-medium text-violet-300">{item.score.toFixed(3)}</span></div>{item.requiresApproval && <p className="mt-2 text-[10px] text-amber-300">Human approval required before execution.</p>}</article>)}
          {optimizationResult.blockedCandidateIds.length > 0 && <p className="text-[10px] text-rose-300">Blocked by policy: {optimizationResult.blockedCandidateIds.join(', ')}</p>}
        </div>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10"><GitBranch className="h-4 w-4 text-violet-300" /></span><div><h2 className="text-sm font-semibold text-white">Counterfactual branches</h2><p className="text-xs text-zinc-500">Compare possible futures before committing to a course of action.</p></div></div>
        <textarea className={`${control} mt-4 min-h-[330px] font-mono`} value={counterfactualText} onChange={(event) => setCounterfactualText(event.target.value)} spellCheck={false} />
        <button disabled={session !== 'yes' || compare.isPending} onClick={() => compare.mutate()} className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-xs font-medium text-violet-200 disabled:opacity-40">{compare.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}Compare scenarios</button>
        {counterfactualResult && <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2"><Metric label="Selected" value={counterfactualResult.selected?.label ?? 'None allowed'} /><Metric label="Approval required" value={counterfactualResult.requiresApproval ? 'Yes' : 'No'} /></div>
          {counterfactualResult.ranked.map((scenario, index) => <article key={scenario.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-white">#{index + 1} {scenario.label}</p><p className="mt-1 text-[10px] text-zinc-500">{scenario.allowed ? 'Allowed by policy' : scenario.reasons.join(' · ')}</p></div><span className="text-xs font-medium text-violet-300">{scenario.score.toFixed(3)}</span></div>{scenario.requiresApproval && <p className="mt-2 text-[10px] text-amber-300">Human approval required before execution.</p>}</article>)}
        </div>}
      </section>
    </div>
  </>;
}

function Metric({ label, value }) { return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-1 text-sm font-semibold text-white">{value}</p></div>; }
