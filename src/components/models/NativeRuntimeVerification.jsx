import { useMutation } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Cpu, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspace';
import { friendlyMessage } from '@/lib/errors';
import { verifyBlackstarNativeRuntime } from '@/lib/runtime/native-runtime-verification.functions';

export default function NativeRuntimeVerification() {
  const { session } = useWorkspace();
  const verifyFn = useServerFn(verifyBlackstarNativeRuntime);
  const verification = useMutation({ mutationFn: () => verifyFn({ data: {} }) });

  if (session !== 'yes') return null;

  return (
    <section className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[.035] p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><Cpu className="h-4 w-4 text-emerald-300" /><h2 className="text-sm font-semibold text-white">Native execution verification</h2></div>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-zinc-400">Runs a tiny deterministic request through the exact configured Blackstar native provider and model. It does not use an external candidate or paid LLM judge, and it cannot silently fall back to another provider.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[10px] text-zinc-400"><ShieldCheck className="h-3.5 w-3.5" />Execution evidence only · not certification</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={verification.isPending} onClick={() => verification.mutate()} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/[.08] px-4 py-2.5 text-xs font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-40">
          {verification.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          {verification.isPending ? 'Verifying native runtime…' : 'Verify native runtime'}
        </button>
        <p className="text-[10px] text-zinc-500">Bounded to 60 seconds with a small output budget and <code className="text-emerald-200">/no_think</code>.</p>
      </div>

      {verification.error && <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[.05] p-3 text-xs text-rose-200">{friendlyMessage(verification.error)}</p>}
      {verification.data && <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <Evidence label="Status" value="VERIFIED" />
        <Evidence label="Identity" value={`${verification.data.provider}/${verification.data.model}`} />
        <Evidence label="Latency" value={`${verification.data.latencyMs} ms`} />
        <Evidence label="Tokens" value={`${verification.data.inputTokens + verification.data.outputTokens}`} />
        <Evidence label="Marker" value={verification.data.marker} />
      </div>}
      {verification.data && <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">This confirms successful server-to-native-model execution for the exact returned identity. It does not certify model quality, independence, AGI capability, or benchmark parity.</p>}
    </section>
  );
}

function Evidence({ label, value }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p><p className="mt-1 truncate text-xs font-medium text-emerald-200" title={value}>{value}</p></div>;
}
