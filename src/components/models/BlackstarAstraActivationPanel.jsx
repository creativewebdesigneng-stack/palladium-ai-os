import { Link } from 'react-router-dom';
import { CheckCircle2, CircleAlert, Cpu, Database, FlaskConical, Route, Server, ShieldCheck, XCircle } from 'lucide-react';
import { deriveAstraActivationSummary } from '@/lib/runtime/blackstar-astra-activation-status';

const stageIcons = {
  configured: Server,
  serving: Cpu,
  evidence: Database,
  certification: ShieldCheck,
  routing: Route,
};

function statusClass(ready) {
  return ready
    ? 'border-emerald-400/20 bg-emerald-400/[.04] text-emerald-200'
    : 'border-amber-400/20 bg-amber-400/[.04] text-amber-200';
}

function servingHealthClass(health) {
  if (health === 'healthy') return 'text-emerald-300';
  if (health === 'degraded') return 'text-amber-300';
  return 'text-rose-300';
}

function certificationClass(item) {
  if (item.actually_routable) return 'text-emerald-300';
  if (item.certified_eligible) return 'text-cyan-300';
  if (item.evidence_available) return 'text-amber-300';
  return 'text-zinc-500';
}

function certificationLabel(item) {
  if (item.actually_routable) return 'Routable';
  if (item.certified_eligible) return 'Eligible, serving gate blocked';
  if (item.evidence_available) return 'Evidence present, not eligible';
  return 'No exact evidence';
}

function evidenceDetail(item) {
  if (!item.evidence_available) return '—';
  if (!item.certified_eligible) return 'Unqualified / stale';
  const score = Number.isFinite(item.evaluation_score) ? `${(item.evaluation_score * 100).toFixed(1)}%` : '—';
  return `${score} · ${item.evaluation_samples.toLocaleString()} samples`;
}

function evaluationHref(item) {
  const params = new URLSearchParams({
    source: 'astra-activation',
    task_class: item.task_class,
    provider: 'compatible',
    model: item.model,
  });
  return `/model-arena?${params.toString()}`;
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
          <p className="mt-1 text-[11px] text-zinc-500">Operator activation state from Blackstar's existing serving probes and verifier-owned Evaluation Lab evidence. No client-side certification inference.</p>
        </div>
        <span className={`rounded-xl border px-3 py-1.5 text-[10px] font-medium ${summary.state === 'routing_ready' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}`}>
          {summary.label}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-600">Serving identities</p>
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
              <tr><th className="pb-2 font-medium">Task classes</th><th className="pb-2 font-medium">Model</th><th className="pb-2 font-medium">Serving</th><th className="pb-2 font-medium">Health</th><th className="pb-2 font-medium">Latency</th><th className="pb-2 font-medium">Probe</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {readiness.models.map((model) => (
                <tr key={`${model.model}:${model.task_classes.join(',')}`}>
                  <td className="py-2.5 pr-3 text-zinc-400">{model.task_classes.join(' · ')}</td>
                  <td className="py-2.5 pr-3"><code className="text-violet-200">{model.model}</code></td>
                  <td className={`py-2.5 pr-3 ${model.serving_ready ? 'text-emerald-300' : 'text-amber-300'}`}>{model.serving_ready ? 'Ready' : 'Not ready'}</td>
                  <td className={`py-2.5 pr-3 capitalize ${servingHealthClass(model.serving_health)}`}>{model.serving_health ?? 'unavailable'}</td>
                  <td className="py-2.5 pr-3 text-zinc-400">{Number.isFinite(model.latency_ms) ? `${model.latency_ms} ms` : '—'}</td>
                  <td className="py-2.5 text-zinc-500">{model.serving_reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {readiness.certification?.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Verifier-backed certification</p>
            <span className="text-[10px] text-zinc-500">{readiness.certified_task_classes ?? 0}/{readiness.certification.length} eligible · {readiness.routable_task_classes ?? 0}/{readiness.certification.length} routable</span>
          </div>
          <p className="mb-3 rounded-lg border border-white/10 bg-white/[.025] px-3 py-2 text-[10px] leading-relaxed text-zinc-500">Missing, stale or unqualified evidence must be refreshed through the existing Model Arena. Blackstar's trusted verifier requires at least 20 distinct completed runs for the exact provider/model before it can issue routing evidence. Running evaluations does not itself certify or grant execution authority.</p>
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wide text-zinc-600">
              <tr><th className="pb-2 font-medium">Task class</th><th className="pb-2 font-medium">Exact model</th><th className="pb-2 font-medium">Evidence</th><th className="pb-2 font-medium">Certified / eligible</th><th className="pb-2 font-medium">Actually routable</th><th className="pb-2 font-medium">Qualified score</th><th className="pb-2 font-medium">Evaluation action</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {readiness.certification.map((item) => (
                <tr key={`${item.task_class}:${item.model}`}>
                  <td className="py-2.5 pr-3 font-medium text-zinc-300">{item.task_class}</td>
                  <td className="py-2.5 pr-3"><code className="text-violet-200">{item.model}</code></td>
                  <td className={`py-2.5 pr-3 ${item.evidence_available ? 'text-cyan-300' : 'text-zinc-500'}`}>{item.evidence_available ? 'Available' : 'Missing'}</td>
                  <td className={`py-2.5 pr-3 ${item.certified_eligible ? 'text-emerald-300' : 'text-amber-300'}`}>{item.certified_eligible ? 'Eligible' : 'Not eligible'}</td>
                  <td className={`py-2.5 pr-3 ${certificationClass(item)}`}>{certificationLabel(item)}</td>
                  <td className="py-2.5 pr-3 text-zinc-500">{evidenceDetail(item)}</td>
                  <td className="py-2.5">
                    {!item.certified_eligible ? (
                      <Link to={evaluationHref(item)} className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-400/[.07] px-2.5 py-1.5 text-[10px] font-medium text-violet-200 transition hover:bg-violet-400/[.12]">
                        <FlaskConical className="h-3 w-3" />
                        {item.evidence_available ? 'Refresh evaluation' : 'Run evaluation'}
                      </Link>
                    ) : <span className="text-[10px] text-zinc-600">No evaluation needed</span>}
                  </td>
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
