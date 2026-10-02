import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { AlertTriangle, CheckCircle2, CircleDashed, Loader2, ShieldCheck, Wrench } from 'lucide-react'
import { getAgentBusinessCertification } from '@/lib/agents/agent-business-certification.functions'

const STATUS = {
  verified: { label: 'Verified', icon: CheckCircle2, cls: 'text-emerald-300 border-emerald-300/15 bg-emerald-400/[.05]' },
  building_evidence: { label: 'Building evidence', icon: Loader2, cls: 'text-sky-300 border-sky-300/15 bg-sky-400/[.05]' },
  ready_for_evidence: { label: 'Ready to test', icon: CircleDashed, cls: 'text-violet-300 border-violet-300/15 bg-violet-400/[.05]' },
  attention_required: { label: 'Attention required', icon: AlertTriangle, cls: 'text-amber-300 border-amber-300/15 bg-amber-400/[.05]' },
  not_configured: { label: 'Not configured', icon: Wrench, cls: 'text-zinc-500 border-white/[.07] bg-white/[.02]' },
}

export default function AgentBusinessCertificationPanel({ agentId }) {
  const loadCertification = useServerFn(getAgentBusinessCertification)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadCertification({ data: { agentId } })
      setData(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load business capability certification.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [agentId])

  const summary = useMemo(() => data?.summary ?? null, [data])

  return (
    <section className="rounded-[22px] border border-white/[.075] bg-black/25 p-4 backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-violet-200/70">
            <ShieldCheck className="h-3.5 w-3.5" /> Business capability certification
          </div>
          <h2 className="mt-2 text-sm font-semibold text-white">Evidence-backed agent readiness</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">
            Capabilities are not certified from configuration alone. Blackstar requires repeated real runtime evidence, a verifier score of at least 0.90, and approval-boundary evidence for sensitive actions.
          </p>
        </div>
        {summary && (
          <div className="flex flex-wrap gap-1.5 text-[9px]">
            <Badge label={`${summary.verified} verified`} tone="emerald" />
            <Badge label={`${summary.building} building`} tone="sky" />
            <Badge label={`${summary.attention} attention`} tone="amber" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-4 text-xs text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking runtime evidence…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-rose-300/10 bg-rose-400/[.04] px-3 py-3 text-xs text-rose-200/80">{error}</div>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {(data?.capabilities ?? []).map((item) => {
            const status = STATUS[item.status] ?? STATUS.not_configured
            const Icon = status.icon
            return (
              <div key={item.id} className="rounded-2xl border border-white/[.06] bg-white/[.018] p-3.5">
                <div className="flex items-start gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl border ${status.cls}`}>
                    <Icon className={`h-3.5 w-3.5 ${item.status === 'building_evidence' ? 'animate-spin' : ''}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{item.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[.12em] ${status.cls}`}>{status.label}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-4 text-zinc-600">{item.description}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[9px]">
                  <Metric label="Evidence" value={`${item.verifiedTasks}/${item.requiredVerifiedTasks}`} />
                  <Metric label="Score" value={item.recentAverageScore == null ? '—' : `${Math.round(item.recentAverageScore * 100)}%`} />
                  <Metric label="Tool runs" value={String(item.successfulToolExecutions)} />
                </div>
                {item.notes?.length ? (
                  <p className="mt-2 text-[9px] leading-4 text-zinc-700">{item.notes[0]}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[.05] pt-3 text-[9px] text-zinc-700">
        <span>Certification never grants new permissions.</span>
        <span>•</span>
        <span>Money-affecting actions remain approval-gated.</span>
        <button type="button" onClick={load} disabled={loading} className="ml-auto rounded-lg border border-white/[.06] px-2 py-1 text-zinc-500 hover:text-white disabled:opacity-40">Refresh evidence</button>
      </div>
    </section>
  )
}

function Metric({ label, value }) {
  return <div className="rounded-lg border border-white/[.05] bg-black/20 px-2 py-1.5"><p className="uppercase tracking-[.12em] text-zinc-700">{label}</p><p className="mt-0.5 font-medium text-zinc-300">{value}</p></div>
}

function Badge({ label, tone }) {
  const cls = tone === 'emerald' ? 'border-emerald-300/10 bg-emerald-400/[.04] text-emerald-300/70' : tone === 'sky' ? 'border-sky-300/10 bg-sky-400/[.04] text-sky-300/70' : 'border-amber-300/10 bg-amber-400/[.04] text-amber-300/70'
  return <span className={`rounded-full border px-2 py-1 ${cls}`}>{label}</span>
}
