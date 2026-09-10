import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { CheckCircle2, FlaskConical, Loader2, ShieldCheck, Eye } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import {
  attestAstraCertificationRun,
  getAstraCertificationBenchmark,
  runAstraTextCertificationCase,
  runAstraVisionCertificationCase,
} from '@/lib/evals/astra-certification-benchmark.functions';
import { ASTRA_CERTIFICATION_JUDGES, judgeMatchesCandidate } from '@/lib/evals/astra-certification-judge-policy';
import { certifyAstraTaskClass, getAstraCertificationStatus } from '@/lib/evals/astra-evaluation-verifier.functions';

const TASK_CLASSES = ['general', 'reasoning', 'coding', 'tool_use', 'agentic', 'vision'];
const VISION_PROVIDERS = ['groq', 'openai', 'lovable', 'gemini'];
const DEFAULT_JUDGE = ASTRA_CERTIFICATION_JUDGES[0];
const FAST_QUALIFICATION_CASES = 3;
const FAST_QUALIFICATION_SCORE = 80;

export default function AstraCertificationWorkbench() {
  const { session } = useWorkspace();
  const queryClient = useQueryClient();
  const [taskClass, setTaskClass] = useState('reasoning');
  const [reference, setReference] = useState({ provider: 'openai', model: 'gpt-5-mini' });
  const [judge, setJudge] = useState(() => ({ provider: DEFAULT_JUDGE.provider, model: DEFAULT_JUDGE.model }));
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [autoRunProgress, setAutoRunProgress] = useState(null);
  const [fastQualificationResult, setFastQualificationResult] = useState(null);
  const autoRunStopRequested = useRef(false);

  const benchmarkFn = useServerFn(getAstraCertificationBenchmark);
  const statusFn = useServerFn(getAstraCertificationStatus);
  const runTextFn = useServerFn(runAstraTextCertificationCase);
  const runVisionFn = useServerFn(runAstraVisionCertificationCase);
  const attestFn = useServerFn(attestAstraCertificationRun);
  const certifyFn = useServerFn(certifyAstraTaskClass);

  const benchmark = useQuery({ queryKey: ['astra-certification-benchmark', taskClass], queryFn: () => benchmarkFn({ data: { taskClass } }), enabled: session === 'yes', retry: false });
  const status = useQuery({ queryKey: ['astra-certification-status', taskClass], queryFn: () => statusFn({ data: { taskClass } }), enabled: session === 'yes', retry: false });
  const nextCase = useMemo(() => benchmark.data?.cases?.find((entry) => !entry.completed) ?? null, [benchmark.data]);
  const trustedJudges = useMemo(() => benchmark.data?.trustedJudges?.length ? benchmark.data.trustedJudges : ASTRA_CERTIFICATION_JUDGES, [benchmark.data]);
  const freeLlmJudge = useMemo(() => trustedJudges.find((entry) => entry.provider === 'freellm') ?? null, [trustedJudges]);
  const judgeIsTrusted = useMemo(() => trustedJudges.some((entry) => entry.provider === judge.provider && entry.model === judge.model), [trustedJudges, judge]);
  const judgeIsCandidate = useMemo(() => judgeMatchesCandidate(judge, [reference]), [judge, reference]);

  useEffect(() => {
    if (taskClass !== 'vision' || judgeIsTrusted || trustedJudges.length === 0) return;
    const next = trustedJudges[0];
    setJudge({ provider: next.provider, model: next.model });
  }, [taskClass, judgeIsTrusted, trustedJudges]);

  const executeTrustedCase = async (benchmarkCase) => {
    if (!status.data?.model) throw new Error('Astra serving identity is unavailable.');

    if (taskClass !== 'vision') {
      if (!freeLlmJudge) throw new Error('The authenticated FreeLLM evaluator is not configured for trusted text certification.');
      const outcome = await runTextFn({ data: { taskClass, caseId: benchmarkCase.caseId } });
      if (!outcome.ok) return { failure: outcome };
      return { runId: outcome.runId, attested: outcome };
    }

    if (!judgeIsTrusted) throw new Error('Choose a server-approved trusted judge before running certification.');
    if (judgeMatchesCandidate(judge, [reference])) throw new Error('The trusted judge must be different from every candidate model.');

    const run = await runVisionFn({
      data: {
        caseId: benchmarkCase.caseId,
        reference: { provider: reference.provider, model: reference.model.trim() },
        judge: { provider: judge.provider, model: judge.model.trim() },
      },
    });
    const attested = await attestFn({ data: { taskClass, runId: run.runId, caseId: benchmarkCase.caseId } });
    return { runId: run.runId, attested };
  };

  const refreshCertificationState = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['astra-certification-benchmark', taskClass] }),
    queryClient.invalidateQueries({ queryKey: ['astra-certification-status', taskClass] }),
    queryClient.invalidateQueries({ queryKey: ['model-arena-runs'] }),
  ]);

  const runCase = useMutation({
    mutationFn: executeTrustedCase,
    onMutate: (benchmarkCase) => setActiveCaseId(benchmarkCase.caseId),
    onSuccess: refreshCertificationState,
    onSettled: () => setActiveCaseId(null),
  });

  const autoRunCases = useMutation({
    mutationFn: async () => {
      const remainingCases = (benchmark.data?.cases ?? []).filter((benchmarkCase) => !benchmarkCase.completed);
      if (!remainingCases.length) return { completed: 0, total: 0, stopped: false };

      autoRunStopRequested.current = false;
      let completedCount = 0;
      setAutoRunProgress({ completed: 0, total: remainingCases.length });

      for (const benchmarkCase of remainingCases) {
        if (autoRunStopRequested.current) break;
        setActiveCaseId(benchmarkCase.caseId);
        const outcome = await executeTrustedCase(benchmarkCase);
        if (outcome?.failure) {
          const error = new Error(outcome.failure.message || 'Trusted certification case failed.');
          error.cause = outcome.failure;
          throw error;
        }
        completedCount += 1;
        setAutoRunProgress({ completed: completedCount, total: remainingCases.length });
        await refreshCertificationState();
      }

      return { completed: completedCount, total: remainingCases.length, stopped: autoRunStopRequested.current };
    },
    onSettled: async () => {
      setActiveCaseId(null);
      await refreshCertificationState();
    },
  });

  const fastQualifyAndCertify = useMutation({
    mutationFn: async () => {
      if (taskClass === 'vision') {
        throw new Error('Fast qualification is currently available for trusted text certification classes.');
      }

      const remainingCases = (benchmark.data?.cases ?? []).filter((benchmarkCase) => !benchmarkCase.completed);
      if (!remainingCases.length) {
        const finalStatus = await statusFn({ data: { taskClass } });
        if (!finalStatus.readyToCertify) throw new Error('No remaining trusted cases are available, but certification is not ready.');
        const evidence = await certifyFn({ data: { taskClass } });
        return { preflightAverage: null, preflightCases: 0, completed: 0, total: 0, evidence };
      }

      autoRunStopRequested.current = false;
      setFastQualificationResult(null);
      const preflightCases = remainingCases.slice(0, FAST_QUALIFICATION_CASES);
      const scores = [];
      let completedCount = 0;
      setAutoRunProgress({ completed: 0, total: remainingCases.length, phase: 'preflight' });

      for (const benchmarkCase of preflightCases) {
        if (autoRunStopRequested.current) {
          return { preflightAverage: null, preflightCases: scores.length, completed: completedCount, total: remainingCases.length, stopped: true };
        }
        setActiveCaseId(benchmarkCase.caseId);
        const outcome = await executeTrustedCase(benchmarkCase);
        if (outcome?.failure) {
          const error = new Error(outcome.failure.message || 'Trusted certification case failed.');
          error.cause = outcome.failure;
          throw error;
        }
        const score = Number(outcome?.attested?.score);
        if (!Number.isFinite(score)) throw new Error('Trusted evaluator did not return a numeric preflight score.');
        scores.push(score);
        completedCount += 1;
        setAutoRunProgress({ completed: completedCount, total: remainingCases.length, phase: 'preflight' });
        await refreshCertificationState();
      }

      const preflightAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setFastQualificationResult({ average: preflightAverage, cases: scores.length, passed: preflightAverage >= FAST_QUALIFICATION_SCORE });

      if (preflightAverage < FAST_QUALIFICATION_SCORE) {
        return {
          preflightAverage,
          preflightCases: scores.length,
          completed: completedCount,
          total: remainingCases.length,
          qualified: false,
          stopped: false,
        };
      }

      const remainingAfterPreflight = remainingCases.slice(preflightCases.length);
      setAutoRunProgress({ completed: completedCount, total: remainingCases.length, phase: 'full' });

      for (const benchmarkCase of remainingAfterPreflight) {
        if (autoRunStopRequested.current) {
          return {
            preflightAverage,
            preflightCases: scores.length,
            completed: completedCount,
            total: remainingCases.length,
            qualified: true,
            stopped: true,
          };
        }
        setActiveCaseId(benchmarkCase.caseId);
        const outcome = await executeTrustedCase(benchmarkCase);
        if (outcome?.failure) {
          const error = new Error(outcome.failure.message || 'Trusted certification case failed.');
          error.cause = outcome.failure;
          throw error;
        }
        completedCount += 1;
        setAutoRunProgress({ completed: completedCount, total: remainingCases.length, phase: 'full' });
        await refreshCertificationState();
      }

      const finalStatus = await statusFn({ data: { taskClass } });
      if (!finalStatus.readyToCertify) {
        throw new Error('Full trusted suite finished but the verifier does not yet consider the current model profile certifiable.');
      }
      const evidence = await certifyFn({ data: { taskClass } });
      return {
        preflightAverage,
        preflightCases: scores.length,
        completed: completedCount,
        total: remainingCases.length,
        qualified: true,
        stopped: false,
        evidence,
      };
    },
    onSettled: async () => {
      setActiveCaseId(null);
      await refreshCertificationState();
      await queryClient.invalidateQueries({ queryKey: ['model-runtime-overview'] });
    },
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
  const referenceProviderAllowed = VISION_PROVIDERS.includes(reference.provider);
  const canRun = taskClass === 'vision'
    ? supported && referenceProviderAllowed && judgeIsTrusted && Boolean(status.data?.model) && Boolean(reference.model.trim()) && Boolean(judge.model.trim()) && !judgeIsCandidate
    : supported && Boolean(status.data?.model) && Boolean(freeLlmJudge);

  return (
    <section className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/[.035] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /><h2 className="text-sm font-semibold text-white">Astra Certification Workbench</h2></div>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-400">Runs versioned server-owned benchmark cases through Blackstar's persisted evidence chain. Text cases use the authenticated, exact-pinned FreeLLM evaluator transport; vision cases use deterministic server-generated PNG fixtures. Browser-supplied prompts, evaluator endpoints, credentials, and certification image bytes are never trusted.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-right"><p className="text-[10px] uppercase tracking-wide text-zinc-500">Trusted cases</p><p className="mt-1 text-xl font-semibold text-white">{completed}/{total}</p></div>
      </div>

      <div className={`mt-4 grid gap-3 ${taskClass === 'vision' ? 'lg:grid-cols-[180px_1fr_1fr]' : 'lg:grid-cols-[180px_1fr]'}`}>
        <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Task class<select value={taskClass} onChange={(event) => setTaskClass(event.target.value)} className="input mt-1.5 w-full">{TASK_CLASSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        {taskClass === 'vision' ? <>
          <ProviderModel label="Multimodal reference candidate" value={reference} onChange={setReference} providers={VISION_PROVIDERS} />
          <TrustedJudge value={judge} onChange={setJudge} judges={trustedJudges} />
        </> : <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Trusted independent judge<div className="input mt-1.5 flex min-h-10 items-center px-3 text-xs normal-case tracking-normal text-emerald-200">{freeLlmJudge ? freeLlmJudge.label : 'Authenticated FreeLLM evaluator not configured'}</div></div>}
      </div>

      {taskClass === 'vision' && supported && <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.05] p-3 text-xs text-violet-200"><Eye className="h-3.5 w-3.5" />Trusted vision mode: each case renders a deterministic PNG on the server, binds its SHA-256 digest, and scores responses against a server-owned ground-truth key.</p>}
      {taskClass !== 'vision' && freeLlmJudge && <p className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[.04] p-3 text-xs text-emerald-200">Trusted text mode is locked to the deployment's authenticated FreeLLMAPI evaluator and exact server-pinned model. Each request executes one server-owned case, verifies independent route evidence, signs provenance, and attests the result before it counts toward certification.</p>}
      {taskClass !== 'vision' && !freeLlmJudge && benchmark.data && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">Trusted text certification is blocked until the authenticated FreeLLM evaluator URL, private bridge credential, and exact model are configured in the deployment.</p>}
      {taskClass === 'vision' && !referenceProviderAllowed && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">Choose a reference provider supported by trusted vision mode before running certification.</p>}
      {taskClass === 'vision' && !judgeIsTrusted && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">Choose a server-approved trusted judge before running certification.</p>}
      {taskClass === 'vision' && judgeIsCandidate && <p className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">The certification judge must be different from every candidate. Choose another reference model or trusted judge.</p>}
      {(benchmark.isLoading || status.isLoading) && <p className="mt-4 inline-flex items-center gap-2 text-xs text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading trusted suite…</p>}
      {(benchmark.error || status.error) && <p className="mt-4 text-xs text-rose-300">{friendlyMessage(benchmark.error ?? status.error)}</p>}
      {!supported && benchmark.data && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/[.05] p-3 text-xs text-amber-200">{benchmark.data.reason ?? 'This task class does not yet have a trusted certification benchmark.'}</div>}

      {supported && benchmark.data?.cases?.length > 0 && <>
        <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-4">
          {benchmark.data.cases.map((benchmarkCase) => <button key={benchmarkCase.caseId} type="button" disabled={benchmarkCase.completed || !canRun || runCase.isPending || autoRunCases.isPending || fastQualifyAndCertify.isPending} onClick={() => runCase.mutate(benchmarkCase)} className="rounded-xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-cyan-400/30 hover:bg-cyan-400/[.04] disabled:cursor-not-allowed disabled:opacity-45">
            <div className="flex items-center gap-2">{benchmarkCase.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : activeCaseId === benchmarkCase.caseId ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" /> : benchmarkCase.modality === 'vision' ? <Eye className="h-3.5 w-3.5 text-violet-300" /> : <FlaskConical className="h-3.5 w-3.5 text-cyan-300" />}<p className="min-w-0 flex-1 truncate text-[11px] font-medium text-white">{benchmarkCase.name}</p></div>
            <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-zinc-500">{benchmarkCase.prompt}</p>
          </button>)}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" disabled={!nextCase || !canRun || runCase.isPending || autoRunCases.isPending || fastQualifyAndCertify.isPending} onClick={() => nextCase && runCase.mutate(nextCase)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[.08] px-4 py-2.5 text-xs font-medium text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40">{runCase.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}{runCase.isPending ? 'Running and attesting…' : nextCase ? 'Run next trusted case' : 'All trusted cases complete'}</button>
          {!fastQualifyAndCertify.isPending ? <button type="button" disabled={taskClass === 'vision' || !nextCase || !canRun || runCase.isPending || autoRunCases.isPending} onClick={() => fastQualifyAndCertify.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/[.08] px-4 py-2.5 text-xs font-medium text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5" />Fast qualify → full certify</button> : <button type="button" onClick={() => { autoRunStopRequested.current = true; }} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.07] px-4 py-2.5 text-xs font-medium text-amber-100"><Loader2 className="h-3.5 w-3.5 animate-spin" />Stop after current case {autoRunProgress ? `(${autoRunProgress.completed}/${autoRunProgress.total})` : ''}</button>}
          {!autoRunCases.isPending ? <button type="button" disabled={!nextCase || !canRun || runCase.isPending || fastQualifyAndCertify.isPending} onClick={() => autoRunCases.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/[.07] px-4 py-2.5 text-xs font-medium text-violet-100 disabled:cursor-not-allowed disabled:opacity-40"><FlaskConical className="h-3.5 w-3.5" />Auto-run remaining trusted cases</button> : <button type="button" onClick={() => { autoRunStopRequested.current = true; }} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.07] px-4 py-2.5 text-xs font-medium text-amber-100"><Loader2 className="h-3.5 w-3.5 animate-spin" />Stop after current case {autoRunProgress ? `(${autoRunProgress.completed}/${autoRunProgress.total})` : ''}</button>}
          <button type="button" disabled={!status.data?.readyToCertify || certify.isPending || autoRunCases.isPending || fastQualifyAndCertify.isPending} onClick={() => certify.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-2.5 text-xs font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">{certify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}{certify.isPending ? 'Issuing evidence…' : status.data?.readyToCertify ? 'Issue verified evidence' : `Need ${Math.max(0, (status.data?.minimumRuns ?? 20) - (status.data?.completedRuns ?? 0))} more cases`}</button>
          {status.data?.model && <span className="text-[10px] text-zinc-500">Astra identity: <code className="text-cyan-200">compatible/{status.data.model}</code></span>}
        </div>
      </>}
      {runCase.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(runCase.error)}</p>}
      {autoRunCases.error && <p className="mt-3 text-xs text-rose-300">Auto-run stopped: {friendlyMessage(autoRunCases.error)}</p>}
      {fastQualifyAndCertify.error && <p className="mt-3 text-xs text-rose-300">Fast qualification stopped: {friendlyMessage(fastQualifyAndCertify.error)}</p>}
      {fastQualificationResult && <p className={`mt-3 text-xs ${fastQualificationResult.passed ? 'text-emerald-300' : 'text-amber-300'}`}>Fast qualification: {fastQualificationResult.average.toFixed(1)}/100 across {fastQualificationResult.cases} cases — {fastQualificationResult.passed ? 'passed; continuing full trusted certification.' : 'below 80/100; full certification was skipped.'}</p>}
      {autoRunCases.data && !autoRunCases.isPending && autoRunCases.data.completed > 0 && <p className="mt-3 text-xs text-emerald-300">Auto-run completed {autoRunCases.data.completed}/{autoRunCases.data.total} trusted cases{autoRunCases.data.stopped ? ' before stopping.' : '.'}</p>}
      {fastQualifyAndCertify.data?.evidence && <p className="mt-3 text-xs text-emerald-300">Fast path completed: verified evidence issued from {fastQualifyAndCertify.data.evidence.sampleCount} trusted cases with score {fastQualifyAndCertify.data.evidence.score == null ? 'pending' : fastQualifyAndCertify.data.evidence.score.toFixed(3)}.</p>}
      {runCase.data?.failure && <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200"><p>{runCase.data.failure.message}</p><p className="mt-1 text-[10px] text-rose-300/70">Diagnostic code: <code>{runCase.data.failure.code}</code></p></div>}
      {runCase.data?.runId && <p className="mt-3 text-xs text-emerald-300">Trusted case attested from run {runCase.data.runId}.</p>}
      {certify.error && <p className="mt-3 text-xs text-rose-300">{friendlyMessage(certify.error)}</p>}
      {certify.data && <p className="mt-3 text-xs text-emerald-300">Verified evidence issued from {certify.data.sampleCount} trusted cases.</p>}
    </section>
  );
}

function ProviderModel({ label, value, onChange, providers }) {
  return <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}<div className="mt-1.5 grid grid-cols-[130px_1fr] gap-2"><select value={value.provider} onChange={(event) => onChange({ ...value, provider: event.target.value })} className="input">{providers.map((provider) => <option key={provider} value={provider}>{provider}</option>)}</select><input value={value.model} onChange={(event) => onChange({ ...value, model: event.target.value })} className="input" placeholder="Model ID" /></div></label>;
}

function TrustedJudge({ value, onChange, judges }) {
  const selected = `${value.provider}::${value.model}`;
  return <label className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Trusted independent judge<select value={selected} onChange={(event) => { const next = judges.find((entry) => `${entry.provider}::${entry.model}` === event.target.value); if (next) onChange({ provider: next.provider, model: next.model }); }} className="input mt-1.5 w-full">{judges.map((entry) => <option key={`${entry.provider}/${entry.model}`} value={`${entry.provider}::${entry.model}`}>{entry.label}</option>)}</select></label>;
}
