import { useMemo, useState } from 'react'
import { ArrowRight, BrainCircuit, Code2, GitBranch, ShieldCheck } from 'lucide-react'
import { routeAiHubWorkload } from '@/lib/ai-hub/router'
import AiHubSpiderNetwork from '@/components/ai-hub/AiHubSpiderNetwork'
import { suggestSpiderCapability } from '@/lib/ai-hub/spider-prompt-preview'

const ACTIVE = new Set(['available', 'active', 'enabled'])
const ALLOWED_KINDS = new Set(['model', 'tool'])

/** A read-only explorer. It never submits a task, claims an audit, or executes a tool. */
export default function AiHubDecisionExplorer({ resources = [], receipts = [], receiptError = false, loading = false, onPrepareResource }) {
  const [capabilityName, setCapabilityName] = useState('model-inference')
  const [objective, setObjective] = useState('balanced')
  const [promptDraft, setPromptDraft] = useState('')
  const { candidates, options } = useMemo(() => {
    const active = resources.filter((resource) =>
      ALLOWED_KINDS.has(resource.kind) && ACTIVE.has(resource.status) &&
      Array.isArray(resource.capabilities) && resource.capabilities.length > 0,
    )
    const options = [...new Set(active.flatMap((resource) => resource.capabilities))].sort()
    const candidates = active.map((resource) => ({
      id: resource.id, name: resource.name, kind: resource.kind, providerId: resource.providerId,
      capabilities: resource.capabilities,
      // Inventory provides no universal runtime-target certification. These
      // values describe the *planning preview* only, never runtime placement.
      deploymentTargets: resource.kind === 'model' || resource.providerId.startsWith('external-mcp:')
        ? ['provider-cloud'] : ['palladium-cloud'],
      metadata: { ...resource.metadata },
    }))
    return { candidates, options }
  }, [resources])
  const suggested = useMemo(() => suggestSpiderCapability(promptDraft, options), [promptDraft, options])
  const chosen = options.includes(capabilityName) ? capabilityName : options[0]
  const route = useMemo(() => chosen
    ? routeAiHubWorkload({
        id: 'hub-readonly-preview',
        tenantId: 'preview-only',
        actorId: 'preview-only',
        goal: 'Read-only route preview for the selected capability',
        requirements: {
          capabilities: [chosen],
          routingObjective: objective,
          evidenceRouting: { mode: 'evidence-gated' },
        },
      }, candidates)
    : null, [chosen, objective, candidates])
  const trace = route?.decisionTrace
  const laneName = trace?.lane === 'deterministic' ? 'Deterministic candidate'
    : trace?.lane === 'model-escalation' ? 'AI model escalation'
      : trace ? 'Human review required' : 'No eligible route'
  const LaneIcon = trace?.lane === 'deterministic' ? Code2
    : trace?.lane === 'model-escalation' ? BrainCircuit : ShieldCheck

  return <section className="rounded-[28px] border border-violet-300/15 bg-[#05050c]/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,.25)]" aria-label="Evidence routing explorer">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-violet-300/70">Intelligence routing · plan explorer</p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-white"><GitBranch className="h-5 w-5 text-violet-300" />Decision network</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-400">Preview a decision using real inventory and available reliability telemetry. No task or model is executed. Historical success is not calibrated confidence.</p>
      </div>
      <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-violet-200">Planning only</span>
    </div>
    <div className="mt-5 rounded-xl border border-violet-300/15 bg-violet-400/[.035] p-3">
      <label htmlFor="astra-spider-prompt" className="text-xs font-medium text-zinc-200">Prompt Spider · Describe a task</label>
      <textarea id="astra-spider-prompt" value={promptDraft} maxLength={1000}
        onChange={(event) => setPromptDraft(event.target.value)}
        rows={2} placeholder="Example: Help me with code analysis"
        className="mt-2 w-full resize-y rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-[11px] leading-5 text-zinc-500">Private, local phrase-match preview: no prompt is sent to a model or tool. Matching does not verify relevance, truth, intent, safety or grounding.</p>
        {suggested ? <button type="button" onClick={() => setCapabilityName(suggested.capability)}
          className="rounded-lg border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs text-violet-100 transition hover:bg-violet-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
          Use suggested capability: {suggested.capability}
        </button> : <span className="text-[11px] text-zinc-500">{promptDraft.trim() ? 'No exact registry phrase match' : 'Enter a prompt to look for registry phrases'}</span>}
      </div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-zinc-300">Required capability
        <select aria-label="Required capability" value={chosen ?? ''} onChange={(e) => setCapabilityName(e.target.value)} disabled={!options.length}
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#11101b] px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
          {!options.length && <option value="">No available capabilities</option>}
          {options.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label className="text-xs text-zinc-300">Routing objective
        <select aria-label="Routing objective" value={objective} onChange={(e) => setObjective(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-[#11101b] px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400">
          <option value="balanced">Balanced</option>
          <option value="lowest-cost">Lowest known cost</option>
          <option value="lowest-latency">Lowest known latency</option>
          <option value="highest-reliability">Best observed reliability</option>
          <option value="highest-quality">Highest evaluated quality</option>
        </select>
      </label>
    </div>
    <AiHubSpiderNetwork resources={resources} receipts={receipts} receiptError={receiptError} selectedCapability={chosen} route={route} loading={loading} taskReady={Boolean(promptDraft.trim())} onPrepareResource={onPrepareResource ? (node) => onPrepareResource(node, promptDraft.trim()) : undefined} />
    <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
      <div className="rounded-xl border border-white/10 bg-white/[.035] p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">01 · Select</p>
        <p className="mt-1 break-words text-sm font-medium text-white">{chosen ?? 'No capability'}</p>
        <p className="mt-1 text-xs text-zinc-400">Requirement and existing policy filters</p>
      </div>
      <ArrowRight aria-hidden className="mx-auto hidden h-4 w-4 self-center text-violet-300/70 md:block" />
      <div className="rounded-xl border border-white/10 bg-white/[.035] p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">02 · Assess</p>
        <p className="mt-1 text-sm font-medium text-white">{trace?.consideredCapabilityIds.length ?? 0} eligible candidates</p>
        <p className="mt-1 text-xs text-zinc-400">At least {trace?.thresholds.minObservedRuns ?? 20} observed runs and {Math.round((trace?.thresholds.minReliability ?? 0.8) * 100)}% reliability for the deterministic lane</p>
      </div>
      <ArrowRight aria-hidden className="mx-auto hidden h-4 w-4 self-center text-violet-300/70 md:block" />
      <div className="rounded-xl border border-violet-300/20 bg-violet-400/[.06] p-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">03 · Planned route</p>
        <p className="mt-1 flex items-center gap-2 text-sm font-medium text-white"><LaneIcon className="h-4 w-4 shrink-0 text-violet-300" />{laneName}</p>
        <p className="mt-1 break-words text-xs text-zinc-400">{route?.capability.name ?? (loading ? 'Loading resources…' : 'No eligible candidates')}</p>
      </div>
    </div>
    {trace && <div className="mt-3 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-zinc-400">
      <span className="text-zinc-200">Evidence:</span> {trace.observedRuns} historical runs · {Math.round(trace.reliabilityScore * 100)}% smoothed reliability estimate · {trace.evaluationCount} evaluations.
      <span className="ml-1">{trace.reasons[0]}</span>
    </div>}
    <p className="mt-3 text-[11px] leading-5 text-zinc-500">No automatic permissions, model invocations or tool dispatch are granted here. Real executions must still use Blackstar's existing provider, domain, approval, and audit boundaries. Missing telemetry is not treated as proof of success.</p>
  </section>
}
