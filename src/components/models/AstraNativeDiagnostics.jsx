import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Activity, Cpu, Loader2, ShieldCheck } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { runBlackstarNativeDiagnostic } from '@/lib/runtime/astra-native-diagnostics.functions';

const CASES = [
  { id: 'scheduling', name: 'Dependency reasoning' },
  { id: 'ts-expression', name: 'TypeScript bug fix' },
  { id: 'source-grounding', name: 'Provided-source grounding' },
  { id: 'uncertainty', name: 'Unknown facts / non-fabrication' },
  { id: 'approval-status', name: 'Approval and tool-status awareness' },
];

export default function AstraNativeDiagnostics() {
  const { session } = useWorkspace();
  const runFn = useServerFn(runBlackstarNativeDiagnostic);
  const [results, setResults] = useState({});
  const [active, setActive] = useState(null);
  const runCase = useMutation({
    mutationFn: ({ caseId, mode = 'fast' }) => runFn({ data: { caseId, mode } }),
    onMutate: ({ caseId, mode = 'fast' }) => setActive(`${caseId}:${mode}`),
    onSuccess: (data, { caseId, mode = 'fast' }) =>
      setResults((old) => ({ ...old, [mode === 'fast' ? caseId : `${caseId}:${mode}`]: data })),
    onSettled: () => setActive(null),
  });
  if (session !== 'yes') return null;
  const attempted = CASES.filter((item) => results[item.id]?.executed);
  const passes = attempted.filter((item) => results[item.id]?.passed).length;
  const forbidden = Object.values(results).some((value) => value?.forbidden);

  return (
    <section className="mb-6 rounded-2xl border border-sky-400/20 bg-sky-400/[.035] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Activity className="h-4 w-4 text-sky-300" />Astra native model diagnostics</h2>
          <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-zinc-400">
            Five individually triggered server-owned checks for reasoning, TypeScript repair, supplied-source grounding,
            uncertainty, and approval awareness. Requests are pinned to the configured native GPU model and logged to the
            existing audit trail. No outside AI judge, browser activity or paid fallback.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" />Diagnostic only · not certification</span>
      </div>
      <p className="mt-3 text-[11px] text-sky-200">Model responses scored: {attempted.length}/5 · Exact passes: {passes}/{attempted.length || 0}</p>
      {forbidden && <p className="mt-3 text-xs text-amber-200">The live diagnostic is restricted to authorised platform administrators.</p>}
      <div className="mt-3 grid gap-2">
        {CASES.map((item) => {
          const result = results[item.id];
          const deepResult = item.id === 'scheduling' ? results['scheduling:deliberate'] : null;
          const guidedResult = item.id === 'scheduling' ? results['scheduling:guided'] : null;
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white">{item.name}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {result?.forbidden ? 'Admin permission required'
                    : !result ? 'Not yet executed'
                    : result.executed ? `${result.passed ? 'PASS' : 'FAIL'} · ${result.verdict}${result.outputBudgetReached ? ' (output budget reached)' : ''} · ${result.latencyMs} ms · ${result.provider}/${result.model}`
                    : `BLOCKED · ${result.failure ?? 'No native response'}`}
                </p>
                {result?.executed && <p className="mt-1 break-words text-[10px] text-zinc-500">Fast model excerpt: {result.responseExcerpt || '(empty)'}</p>}
                {item.id === 'scheduling' && <p className="mt-2 text-[10px] text-sky-300">
                  Reasoning comparison: the deliberate test uses the same question and exact answer key, but permits a longer Qwen thinking pass.
                </p>}
                {item.id === 'scheduling' && <p className="mt-1 text-[10px] text-zinc-400">
                  {deepResult?.forbidden ? 'Deliberate: admin permission required'
                    : !deepResult ? 'Deliberate mode not yet tested'
                    : deepResult.executed ? `Deliberate: ${deepResult.passed ? 'PASS' : 'FAIL'} · ${deepResult.verdict}${deepResult.outputBudgetReached ? ' (output budget reached)' : ''} · ${deepResult.latencyMs} ms · ${deepResult.outputTokens} output tokens`
                    : `Deliberate: BLOCKED · ${deepResult.failure ?? 'No native response'}`}
                </p>}
                {deepResult?.executed && <p className="mt-1 break-words text-[10px] text-zinc-500">Deliberate model excerpt: {deepResult.responseExcerpt || '(empty)'}</p>}
                {item.id === 'scheduling' && <p className="mt-1 text-[10px] text-zinc-400">{!guidedResult ? 'Guided no-think reasoning not tested (separate prompt-assisted result)' : guidedResult.executed ? `Guided: ${guidedResult.passed ? 'PASS' : 'FAIL'} · ${guidedResult.verdict} · ${guidedResult.latencyMs} ms` : `Guided: BLOCKED · ${guidedResult.failure ?? 'No native response'}`}</p>}
                {guidedResult?.executed && <p className="mt-1 break-words text-[10px] text-zinc-500">Guided model excerpt: {guidedResult.responseExcerpt || '(empty)'}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={runCase.isPending}
                  onClick={() => runCase.mutate({ caseId: item.id, mode: 'fast' })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[11px] font-medium text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {active === `${item.id}:fast` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                  {active === `${item.id}:fast` ? 'Testing…' : item.id === 'scheduling' ? 'Run fast' : result ? 'Rerun' : 'Run check'}
                </button>
                {item.id === 'scheduling' && <button
                  type="button"
                  disabled={runCase.isPending}
                  onClick={() => runCase.mutate({ caseId: item.id, mode: 'guided' })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[11px] font-medium text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {active === 'scheduling:guided' ? 'Testing…' : 'Run guided'}
                </button>}
                {item.id === 'scheduling' && <button
                  type="button"
                  disabled={runCase.isPending}
                  onClick={() => runCase.mutate({ caseId: item.id, mode: 'deliberate' })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-medium text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {active === 'scheduling:deliberate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                  {active === 'scheduling:deliberate' ? 'Thinking…' : 'Run deep reasoning'}
                </button>}
              </div>
            </div>
          );
        })}
      </div>
      {runCase.error && <p className="mt-3 text-xs text-rose-200">{friendlyMessage(runCase.error)}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
        Guided is a separately tagged no-think, prompt-assisted experiment and never changes the five-case baseline. An output-budget flag does not prove the answer would have been correct. A passing fixture means the specified answer matched a deterministic key. Coding checks do not execute generated code;
        source-grounding checks use supplied records, not a live internet search. This is not independent model-quality certification,
        browser-tool certification, or proof of parity with other AI models. Deliberate reasoning uses more local-GPU time
        and may still fail if your Ollama OpenAI-compatible endpoint ignores thinking controls. Keep your home bridge running while testing.
      </p>
    </section>
  );
}
