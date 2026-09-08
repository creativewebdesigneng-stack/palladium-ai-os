import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { BadgeCheck, Loader2, Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { verifyFreeLlmEvaluatorRuntime } from '@/lib/evals/freellm-runtime-verification.functions';

export default function IndependentEvaluatorVerification() {
  const { session } = useWorkspace();
  const verifyFn = useServerFn(verifyFreeLlmEvaluatorRuntime);
  const verification = useMutation({ mutationFn: () => verifyFn({ data: {} }) });

  if (session !== 'yes') return null;

  const failed = verification.data && verification.data.verified === false;
  const passed = verification.data && verification.data.verified === true;

  return (
    <section className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-400/[.035] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-amber-300" /><h2 className="text-sm font-semibold text-white">Independent evaluator verification</h2></div>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-400">Runs a tiny bounded request through the dedicated FreeLLM evaluator transport and exact server-configured model. The response must include FreeLLM's upstream route identity so Blackstar can distinguish the evaluator gateway from the model that actually served the request.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" />Transport evidence only · not certification</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={verification.isPending} onClick={() => verification.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.08] px-4 py-2.5 text-xs font-medium text-amber-100 disabled:cursor-not-allowed disabled:opacity-40">
          {verification.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5" />}
          {verification.isPending ? 'Verifying evaluator…' : 'Verify independent evaluator'}
        </button>
        <p className="text-[10px] text-zinc-500">30-second hard bound. The exact configured FreeLLM model must return the marker and a valid routed provider/model identity.</p>
      </div>

      {verification.error && <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(verification.error)}</p>}
      {failed && <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-100">
        <div className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <div className="min-w-0">
            <p className="font-medium">Independent evaluator verification failed</p>
            <p className="mt-1 break-words text-rose-200">{verification.data.message}</p>
            <p className="mt-2 text-[10px] text-rose-300/80">Diagnostic code: <code>{verification.data.code}</code>{typeof verification.data.latencyMs === 'number' ? ` · ${verification.data.latencyMs} ms` : ''}</p>
          </div>
        </div>
      </div>}
      {passed && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <Evidence label="Status" value="VERIFIED" />
        <Evidence label="Gateway identity" value={`${verification.data.provider}/${verification.data.model}`} />
        <Evidence label="Actual route" value={verification.data.routedVia} />
        <Evidence label="Latency" value={`${verification.data.latencyMs} ms`} />
        <Evidence label="Fallback attempts" value={`${verification.data.fallbackAttempts}`} />
        <Evidence label="Marker" value={verification.data.marker} />
      </div>}
      {passed && <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">The actual upstream route was <code className="text-amber-200">{verification.data.routedProvider}/{verification.data.routedModel}</code>. This confirms evaluator transport execution and route provenance only; it does not certify Astra model quality or create benchmark evidence by itself.</p>}
    </section>
  );
}

function Evidence({ label, value }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-1 truncate text-xs font-medium text-amber-200" title={value}>{value}</p></div>;
}
