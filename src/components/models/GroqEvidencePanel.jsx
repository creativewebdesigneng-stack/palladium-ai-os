import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { Activity, AlertTriangle, CheckCircle2, Cpu, Gauge, Loader2, RefreshCw, Server } from 'lucide-react'
import { getGroqRuntimeIntelligence } from '@/lib/evals/groq-evaluation.functions'

function pct(value) {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 100)}%` : '—'
}

export default function GroqEvidencePanel() {
  const loadGroq = useServerFn(getGroqRuntimeIntelligence)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setData(await loadGroq({ data: { limit: 300 } }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load Groq evidence status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <section className="mb-6 overflow-hidden rounded-[22px] border border-white/[.075] bg-black/25 p-5 backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200/70">
            <Gauge className="h-3.5 w-3.5" /> Groq evidence lane
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-[-.03em] text-white">Fast provider, evidence-qualified routing</h2>
          <p className="mt-1 max-w-3xl text-[11px] leading-5 text-zinc-500">
            Groq remains one provider inside Blackstar's neutral router. A task class only becomes eligible when independent evaluation reaches the configured evidence floor; low latency alone never qualifies routing.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-xl border border-white/[.07] px-3 py-2 text-[10px] text-zinc-400 hover:bg-white/[.035] hover:text-white disabled:opacity-40">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-4 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading Groq runtime intelligence…</div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-rose-300/10 bg-rose-400/[.04] px-3 py-3 text-xs text-rose-200/80">{error}</div>
      ) : data ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric icon={Server} label="Groq runtime" value={data.configured ? 'Configured' : 'Not configured'} good={data.configured} />
            <Metric icon={Cpu} label="Active models observed" value={String(data.activeModels?.length ?? 0)} />
            <Metric icon={CheckCircle2} label="Qualified workload classes" value={String(data.qualifiedClasses?.length ?? 0)} good={(data.qualifiedClasses?.length ?? 0) > 0} />
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {(data.evaluation?.classes ?? []).map((item) => (
              <div key={item.taskClass} className={`rounded-2xl border p-3 ${item.qualified ? 'border-emerald-300/15 bg-emerald-400/[.04]' : 'border-white/[.06] bg-white/[.015]'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-400">{item.taskClass.replace(/_/g, ' ')}</p>
                  {item.qualified ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Activity className="h-3.5 w-3.5 text-zinc-700" />}
                </div>
                <p className="mt-2 text-lg font-semibold text-white">{item.sampleCount}<span className="ml-1 text-[9px] font-normal text-zinc-600">samples</span></p>
                <div className="mt-2 space-y-1 text-[9px] text-zinc-600">
                  <p>Quality: <span className="text-zinc-400">{pct(item.averageScore)}</span></p>
                  <p>Tool use: <span className="text-zinc-400">{pct(item.toolUseRate)}</span></p>
                  <p>P50 latency: <span className="text-zinc-400">{item.p50LatencyMs == null ? '—' : `${Math.round(item.p50LatencyMs)} ms`}</span></p>
                </div>
                {!item.qualified && item.reasons?.length ? <p className="mt-2 text-[9px] leading-4 text-amber-200/45">{item.reasons[0]}</p> : null}
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-2xl border border-white/[.06] bg-black/20 p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-500">Routing policy</p>
              <div className="mt-2 space-y-1.5 text-[10px] text-zinc-500">
                <p>Minimum samples/class: <span className="text-zinc-300">{data.routingPolicy?.minimumSamplesPerClass ?? 20}</span></p>
                <p>Quality floor: <span className="text-zinc-300">{pct(data.routingPolicy?.qualityFloor ?? 0.75)}</span></p>
                <p>Tool-use floor: <span className="text-zinc-300">{pct(data.routingPolicy?.toolUseFloor ?? 0.9)}</span></p>
                <p>Provider-neutral: <span className="text-emerald-300">{data.routingPolicy?.providerNeutral ? 'Yes' : '—'}</span></p>
              </div>
              <p className="mt-3 text-[9px] leading-4 text-zinc-700">{data.note}</p>
            </div>

            <div className="rounded-2xl border border-white/[.06] bg-black/20 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-zinc-500">Live Groq model catalogue</p>
                {data.catalogError ? <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> : null}
              </div>
              {data.catalogError ? (
                <p className="mt-2 text-[10px] text-amber-200/60">{data.catalogError}</p>
              ) : data.activeModels?.length ? (
                <div className="mt-2 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                  {data.activeModels.map((model) => <code key={model} className="rounded-lg border border-white/[.06] bg-white/[.025] px-2 py-1 text-[9px] text-cyan-100/70">{model}</code>)}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-zinc-600">No live model catalogue available.</p>
              )}
              <p className="mt-3 text-[9px] leading-4 text-zinc-700">Retired Compound identifiers are blocked before execution rather than sent to Groq.</p>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}

function Metric({ icon: Icon, label, value, good = false }) {
  return <div className="rounded-2xl border border-white/[.06] bg-white/[.018] p-3"><div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.14em] text-zinc-600"><Icon className={`h-3.5 w-3.5 ${good ? 'text-emerald-300' : 'text-zinc-500'}`} />{label}</div><p className={`mt-2 text-sm font-semibold ${good ? 'text-emerald-200' : 'text-white'}`}>{value}</p></div>
}
