import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, FlaskConical, Loader2, ShieldCheck, Eye } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { attestAstraCertificationRun, getAstraCertificationBenchmark, runAstraVisionCertificationCase } from '@/lib/evals/astra-certification-benchmark.functions';
import { ASTRA_CERTIFICATION_JUDGES, judgeMatchesCandidate } from '@/lib/evals/astra-certification-judge-policy';
import { certifyAstraTaskClass, getAstraCertificationStatus } from '@/lib/evals/astra-evaluation-verifier.functions';
import { runModelArena } from '@/lib/evals/model-arena.functions';

const TASK_CLASSES = ['general', 'reasoning', 'coding', 'tool_use', 'agentic', 'vision'];
const TEXT_PROVIDERS = ['groq', 'openai', 'anthropic', 'deepseek', 'lovable'];
const VISION_PROVIDERS = ['groq', 'openai', 'lovable', 'gemini'];
const DEFAULT_JUDGE = ASTRA_CERTIFICATION_JUDGES[0];

export default function AstraCertificationWorkbench() {
  const { session } = useWorkspace();
  const queryClient = useQueryClient();
  const [taskClass, setTaskClass] = useState('reasoning');
  const [reference, setReference] = useState({ provider: 'openai', model: 'gpt-5-mini' });
  const [judge, setJudge] = useState(() => ({ provider: DEFAULT_JUDGE.provider, model: DEFAULT_JUDGE.model }));
  const [activeCaseId, setActiveCaseId] = useState(null);

  const benchmarkFn = useServerFn(getAstraCertificationBenchmark);
  const statusFn = useServerFn(getAstraCertificationStatus);
  const runFn = useServerFn(runModelArena);
  const runVisionFn = useServerFn(runAstraVisionCertificationCase);
  const attestFn = useServerFn(attestAstraCertificationRun);
  const certifyFn = useServerFn(certifyAstraTaskClass);

  const benchmark = useQuery({ queryKey: ['astra-certification-benchmark', taskClass], queryFn: () => benchmarkFn({ data: { taskClass } }), enabled: session === 'yes', retry: false });
  const status = useQuery({ queryKey: ['astra-certification-status', taskClass], queryFn: () => statusFn({ data: { taskClass } }), enabled: session === 'yes', retry: false });
  const nextCase = useMemo(() => benchmark.data?.cases?.find((entry) => !entry.completed) ?? null, [benchmark.data]);
  const judgeIsCandidate = useMemo(() => judgeMatchesCandidate(judge, [reference]), [judge, reference]);

  const runCase = useMutation({
    mutationFn: async (benchmarkCase) => {
      if (!status.data?.model) throw new Error('Astra serving identity is unavailable.');
      if (judgeMatchesCandidate(judge, [reference])) throw new Error('The trusted judge must be different from every candidate model.');
      const run = taskClass === 'vision'
        ? await runVisionFn({ data: { caseId: benchmarkCase.caseId, reference: { provider: reference.provider, model: reference.model.trim() }, judge: { provider: judge.provider, model: judge.model.trim() } } })
        : await runFn({ data: {
            name: benchmarkCase.name, prompt: benchmarkCase.prompt, systemPrompt: null,
            contestants: [
              { provider: 'compatible', model: status.data.model, label: 'Blackstar Astra' },
              { provider: reference.provider, model: reference.model.trim(), label: 'Reference' },
            ],
            judge: { provider: judge.provider, model: judge.model.trim(), label: 'Independent judge' },
            criteria: benchmarkCase.criteria, astraTaskClass: taskClass,
          } });
      const attested = await attestFn({ data: { taskClass, runId: run.runId, caseId: benchmarkCase.caseId } });
      return { run, attested };
    },
    onMutate: (benchmarkCase) => setActiveCaseId(benchmarkCase.caseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['astra-certification-benchmark', taskClass] }),
        queryClient.invalidateQueries({ queryKey: ['astra-certification-status', taskClass] }),
        queryClient.invalidateQueries({ queryKey: ['model-arena-runs'] }),
      ]);
    },
    onSettled: () => setActiveCaseId(null),
  });

  const certify = useMutation({
    mutationFn: () => certifyFn({ data: { taskClass } }),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['astra-certification-status', taskClass] }),
      queryClient.invalidateQueries({ queryKey: ['model-runtime-overview'] }),
    ]),
  });

  if (session !== 'yes') return null;
  const supported = benchmark.data?.certificationSupported !== false;
  const completed = benchmark.data?.completedCases ?? 0;
  const total = benchmark.data?.totalCases ?? 20;
  const referenceProviders = taskClass === 'vision' ? VISION_PROVIDERS : TEXT_PROVIDERS;
  const referenceProviderAllowed = referenceProviders.includes(reference.provider);
  const canRun = supported && referenceProviderAllowed && Boolean(status.data?.model) && Boolean(reference.model.trim()) && Boolean(judge.model.trim()) && !judgeIsCandidate;

  return (
    <section className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/[.035] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-semibold text-white">Astra Certification Workbench</h2></div>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-400">Runs versioned server-owned benchmark cases through Blackstar's persisted Model Arena evidence chain. Vision cases use deterministic server-generated PNG fixtures; the browser never supplies certification image bytes.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right"><p className="text-[10px] uppercase tracking-wide text-zinc-500">Trusted cases</p><p className="mt-1 text-xl font-semibold text-white">{completed}/{total}</p></div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_1fr_1fr]">
        <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Task class<select value={taskClass} onChange={(event) => setTaskClass(event.target.value)} className="input mt-1.5 w-full">{TASK_CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <ProviderModel label={taskClass === 'vision' ? 'Multimodal reference candidate' : 'Reference candidate'} value={reference} onChange={setReference} providers={referenceProviders} />
        <TrustedJudge value={judge} onChange={setJudge} />
      </div>

      {taskClass === 'vision' && supported && <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.05] p-3 text-xs text-violet-200"><Eye className="h-3.5 w-3.5" />Trusted vision mode: each case renders a deterministic PNG on the server, binds its SHA-256 digest, and scores responses against a server-owned ground-truth key.</p>}
      {!referenceProviderAllowed && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">Choose a reference provider supported by the selected task mode before running certification.</p>}
      {judgeIsCandidate && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">The certification judge must be different from every candidate. Choose another reference model or trusted judge.</p>}
      {(benchmark.isLoading || status.isLoading) && <p className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading trusted suite…</p>}
      {(benchmark.error || status.error) && <p className="mt-4 text-xs text-rose-300">{friendlyMessage(benchmark.error ?? status.error)}</p>}
      {!supported && benchmark.data && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">{benchmark.data.reason ?? 'This task class does not yet have a trusted certification benchmark.'}</div>}

      {supported && benchmark.data?.cases?.length > 0 && <>
        <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-4">
          {benchmark.data.cases.map((benchmarkCase) => <button key={benchmarkCase.caseId} type="button" disabled={benchmarkCase.completed || !canRun || runCase.isPending} onClick={() => runCase.mutate(benchmarkCase)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/[.04] disabled:cursor-not-allowed disabled:opacity-45">
            <div className="flex items-center gap-2">{benchmarkCase.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : activeCaseId === benchmarkCase.caseId ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" /> : benchmarkCase.modality === 'vision' ? <Eye className="h-3.5 w-3.5 text-violet-300" /> : <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />}<p className="min-w-0 flex-1 truncate text-[11px] font-medium text-white">{benchmarkCase.name}</p></div>
            <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-zinc-500">{benchmarkCase.prompt}</p>
          </button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!nextCase || !canRun || runCase.isPending} onClick={() => nextCase && runCase.mutate(nextCase)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[.08] px-4 py-2.5 text-xs font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{runCase.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}{runCase.isPending ? 'Running and attesting…' : nextCase ? 'Run next trusted case' : 'All trusted cases complete'}</button>
          <button type="button" disabled={!status.data?.readyToCertify || certify.isPending} onClick={() => certify.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-2.5 text-xs font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">{certify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}{certify.isPending ? 'Issuing evidence…' : status.data?.readyToCertify ? 'Issue verified evidence' : `Need ${Math.max(0, (status.data?.minimumRuns ?? 20) - (status.data?.completedRuns ?? 0))} more cases`}</button>
          {status.data?.model && <span className="text-[10px] text-zinc-500">Astra identity: <code className="text-cyan-200">compatible/{status.data.model}</code></span>}
        </div>
      </>}
      {runCase.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(runCase.error)}</p>}
      {runCase.data && <p className="mt-3 text-xs text-emerald-300">Trusted case attested from Arena run {runCase.data.run.runId}.</p>}
      {certify.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(certify.error)}</p>}
      {certify.data && <p className="mt-3 text-xs text-emerald-300">Verified evidence issued from {certify.data.sampleCount} trusted cases.</p>}
    </section>
  );
}

function ProviderModel({ label, value, onChange, providers }) {
  return <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}<div className="mt-1.5 grid grid-cols-[130px_1fr] gap-2"><select value={value.provider} onChange={(event) => onChange({ ...value, provider: event.target.value })} className="input">{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select><input value={value.model} onChange={(event) => onChange({ ...value, model: event.target.value })} className="input" placeholder="Model ID" /></div></label>;
}
function TrustedJudge({ value, onChange }) {
  const selected = `${value.provider}::${value.model}`;
  return <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Trusted independent judge<select value={selected} onChange={(event) => { const next = ASTRA_CERTIFICATION_JUDGES.find((entry) => `${entry.provider}::${entry.model}` === event.target.value); if (next) onChange({ provider: next.provider, model: next.model }); }} className="input mt-1.5 w-full">{ASTRA_CERTIFICATION_JUDGES.map((entry) => <option key={`${entry.provider}/${entry.model}`} value={`${entry.provider}::${entry.model}`}>{entry.label}</option>)}</select></label>;
}
