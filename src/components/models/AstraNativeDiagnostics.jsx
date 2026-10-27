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
    mutationFn: (caseId) => runFn({ data: { caseId } }),
    onMutate: (caseId) => setActive(caseId),
    onSuccess: (data, caseId) => setResults((old) => ({ ...old, [caseId]: data })),
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
          return (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white">{item.name}</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  {result?.forbidden ? 'Admin permission required'
                    : !result ? 'Not yet executed'
                    : result.executed ? `${result.passed ? 'PASS' : 'FAIL'} · ${result.verdict} · ${result.latencyMs} ms · ${result.provider}/${result.model}`
                    : `BLOCKED · ${result.failure ?? 'No native response'}`}
                </p>
                {result?.executed && <p className="mt-1 break-words text-[10px] text-zinc-500">Model excerpt: {result.responseExcerpt || '(empty)'}</p>}
              </div>
              <button
                type="button"
                disabled={runCase.isPending}
                onClick={() => runCase.mutate(item.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[11px] font-medium text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {active === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cpu className="h-3.5 w-3.5" />}
                {active === item.id ? 'Testing…' : result ? 'Rerun' : 'Run check'}
              </button>
            </div>
          );
        })}
      </div>
      {runCase.error && <p className="mt-3 text-xs text-rose-200">{friendlyMessage(runCase.error)}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
        A passing fixture means the specified answer matched a deterministic key. Coding checks do not execute generated code;
        source-grounding checks use supplied records, not a live internet search. This is not independent model-quality certification,
        browser-tool certification, or proof of parity with other AI models. Keep your home bridge running while testing.
      </p>
    </section>
  );
}
