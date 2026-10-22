import { Activity, BrainCircuit, ShieldAlert } from 'lucide-react'
import { deriveAstraCognitiveAwareness } from '@/lib/ai-hub/astra-cognitive-awareness'

const descriptions = {
  unknown: 'Awaiting authenticated inventory',
  'registered-unverified': 'Registered · not certified',
  'not-registered': 'No eligible resource found',
}
const colours = {
  unknown: 'text-zinc-400 border-white/10',
  'registered-unverified': 'text-cyan-200 border-cyan-300/20',
  'not-registered': 'text-amber-200 border-amber-300/20',
}
const stopLabels = {
  unknown: 'Master control health unavailable',
  stopped: 'Autonomous OS master stop engaged',
  'needs-attention': 'Autonomous OS reports stale work or scheduler errors',
  'no-stop-reported': 'No master stop or scheduler alert reported',
}

/**
 * Read-only Astra awareness, sourced from the canonical AI Hub resource feed
 * and existing Autonomous OS control plane. It neither starts agents nor
 * treats resource registration as proof of capability or certification.
 */
export default function AstraCognitiveAwareness({
  resources,
  inventoryKnown,
  controlPlane,
  controlKnown,
  inventoryError,
  controlError,
}) {
  const snapshot = deriveAstraCognitiveAwareness({
    resources, inventoryKnown, controlPlane, controlKnown,
  })
  return <section aria-label="Astra cognitive capability awareness" className="rounded-[26px] border border-violet-300/15 bg-black/40 p-5 backdrop-blur-xl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-violet-300/20 bg-violet-400/[.08] p-2.5"><BrainCircuit className="h-5 w-5 text-violet-200" /></div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-violet-200/70">Blackstar Astra Core</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Cognitive capability awareness</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-400">Owner-scoped discovery, not proof of intelligence or execution. Astra must validate actual tool runs, sources, model evaluation and approval evidence before saying a task succeeded.</p>
        </div>
      </div>
      <div className="rounded-lg border border-violet-300/15 px-3 py-2 text-xs text-zinc-300">
        {inventoryKnown ? snapshot.availableLaneCount + '/9 domains registered' : 'Inventory pending'}
      </div>
    </div>
    {(inventoryError || controlError) && <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-amber-200"><ShieldAlert className="h-4 w-4" />Some live evidence is unavailable. Missing data is not interpreted as readiness.</p>}
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {snapshot.lanes.map((item) => <div key={item.id} className="rounded-xl border border-white/[.07] bg-white/[.025] p-3">
        <p className="text-xs font-semibold text-zinc-100">{item.name}</p>
        <p className={'mt-2 text-[11px] ' + colours[item.state]}>{descriptions[item.state]}</p>
        <p className="mt-2 text-[11px] leading-4 text-zinc-500">{item.verificationBoundary}</p>
      </div>)}
    </div>
    <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 p-3">
      <Activity className="h-4 w-4 shrink-0 text-violet-200" />
      <p className="text-xs text-zinc-300">{stopLabels[snapshot.autonomy]}.</p>
    </div>
    <p className="mt-2 text-[11px] text-zinc-500">A model can be configured without being benchmark-certified. Research and generation tools may be discoverable without being executable in this account. This panel never grants access, schedules work or changes any controls.</p>
  </section>
}
