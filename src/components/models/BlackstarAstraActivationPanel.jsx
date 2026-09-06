import { CheckCircle2, CircleAlert, Cpu, Database, Route, Server, ShieldCheck, XCircle } from 'lucide-react';
import { deriveAstraActivationSummary } from '@/lib/runtime/blackstar-astra-activation-status';

const stageIcons = {
  configured: Server,
  serving: Cpu,
  evidence: Database,
  routing: Route,
};

function statusClass(ready) {
  return ready
    ? 'border-emerald-400/20 bg-emerald-400/[.04] text-emerald-200'
    : 'border-amber-400/20 bg-amber-400/[.04] text-amber-200';
}

export default function BlackstarAstraActivationPanel({ readiness }) {
  const summary = deriveAstraActivationSummary(readiness);

  if (!summary) {
    return (
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-4 w-4 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-white">Blackstar Astra-class Engine</h2>
            <p className="mt-1 text-[11px] text-zinc-500">Operational readiness is unavailable. Blackstar will continue using the existing authoritative model fallback.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-violet-400/15 bg-violet-400/[.025] p-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-violet-300" />
            <h2 className="text-sm font-semibold text-white">Blackstar Astra-class Engine</h2>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">Blackstar-owned serving and evidence infrastructure. Configuration or health never grants routing authority.</p>
        </div>
        <span className={`rounded-xl border px-3 py-1.5 text-[10px] font-medium ${summary.state === 'routing_ready' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}`}>
          {summary.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.stages.map((stage) => {
          const Icon = stageIcons[stage.id];
          return (
            <article key={stage.id} className={`rounded-xl border p-3 ${statusClass(stage.ready)}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" />
                <p className="text-[11px] font-semibold">{stage.label}</p>
                {stage.ready ? <CheckCircle2 className="ml-auto h-3.5 w-3.5" /> : <XCircle className="ml-auto h-3.5 w-3.5" />}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">{stage.detail}</p>
            </article>
          );
        })}
      </div>

      {readiness.models?.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
              <tr><th className="pb-2 font-medium">Task classes</th><th className="pb-2 font-medium">Model</th><th className="pb-2 font-medium">Serving</th><th className="pb-2 font-medium">Probe</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {readiness.models.map((model) => (
                <tr key={`${model.model}:${model.task_classes.join(',')}`}>
                  <td className="py-2.5 pr-3 text-zinc-400">{model.task_classes.join(' · ')}</td>
                  <td className="py-2.5 pr-3"><code className="text-violet-200">{model.model}</code></td>
                  <td className={`py-2.5 pr-3 ${model.serving_ready ? 'text-emerald-300' : 'text-amber-300'}`}>{model.serving_ready ? 'Ready' : 'Not ready'}</td>
                  <td className="py-2.5 text-zinc-500">{model.serving_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 lg:grid-cols-2">
        <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] leading-relaxed text-zinc-400">{readiness.certification_note}</p>
        <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-[10px] leading-relaxed text-zinc-400">{readiness.authority_note}</p>
      </div>
    </section>
  );
}
