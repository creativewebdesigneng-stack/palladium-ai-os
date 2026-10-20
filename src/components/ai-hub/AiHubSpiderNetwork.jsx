import { useId, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Activity, Eye, Network, Pause, Play, ShieldCheck } from 'lucide-react'
import { buildAiHubSpiderTopology } from '@/lib/ai-hub/spider-network'

const SIGNALS = [
  { label: 'Relevance', value: 'Not verified' },
  { label: 'Grounding', value: 'Not verified' },
  { label: 'Ambiguity', value: 'Not verified' },
  { label: 'Approval', value: 'Mandatory for evidence routes' },
]

function webRing(radius) {
  const pieces = Array.from({ length: 16 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 16
    const x = 500 + Math.cos(angle) * radius
    const y = 310 + Math.sin(angle) * radius * 0.68
    return (index ? 'L ' : 'M ') + x.toFixed(2) + ' ' + y.toFixed(2)
  })
  return pieces.join(' ') + ' Z'
}

const RINGS = [60, 113, 173, 242, 337]

function DotLegend({ color, children }) {
  return <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
    <span className={'h-2 w-2 rounded-full ' + color} />
    {children}
  </span>
}

/**
 * An interactive visual projection of existing Hub inventory and route plans.
 * Animation is a planning-path guide, NOT a worker execution or event stream.
 */
export default function AiHubSpiderNetwork({ resources = [], selectedCapability, route = null, loading = false }) {
  const reducedMotion = useReducedMotion()
  const [motionOn, setMotionOn] = useState(true)
  const [focusedId, setFocusedId] = useState(null)
  const namespace = useId().replace(/:/g, '')
  const graph = useMemo(
    () => buildAiHubSpiderTopology(resources, selectedCapability, route),
    [resources, selectedCapability, route],
  )
  const activeId = graph.nodes.some((node) => node.id === focusedId)
    ? focusedId : graph.selectedId ?? graph.nodes[0]?.id ?? null
  const activeNode = graph.nodes.find((node) => node.id === activeId)
  const planned = graph.nodes.find((node) => node.planned)
  const canAnimate = !reducedMotion && motionOn
  const matches = graph.links.filter((link) => link.relation === 'routing-candidate').length
  const flowStatus = route?.decisionTrace?.lane === 'model-escalation'
    ? 'Model reasoning candidate'
    : route?.decisionTrace?.lane === 'deterministic'
      ? 'Deterministic tool candidate'
      : route?.decisionTrace?.lane === 'approval-required'
        ? 'Human review path'
        : 'No planned route'

  return <div className="mt-4 overflow-hidden rounded-2xl border border-violet-300/15 bg-[#03040b]" aria-label="Blackstar spider network">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-white"><Network className="h-4 w-4 text-violet-300" />Astra Spider · Intelligence Web</p>
        <p className="mt-1 text-xs text-zinc-500">Interconnected real resources and one read-only routing decision</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] text-zinc-400">{graph.nodes.length} visible / {graph.totalRegistered} registered</span>
        <button type="button" onClick={() => setMotionOn((current) => !current)}
          disabled={Boolean(reducedMotion)}
          aria-label={canAnimate ? 'Pause spider web animation' : 'Enable spider web animation'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[.05] px-2.5 py-1.5 text-xs text-zinc-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 disabled:opacity-50">
          {canAnimate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {canAnimate ? 'Pause motion' : 'Motion paused'}
        </button>
      </div>
    </div>
    <div className="relative overflow-x-auto bg-[radial-gradient(ellipse_at_center,rgba(80,37,151,.17),rgba(4,4,12,0)_55%)]">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(140,92,246,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(140,92,246,.07)_1px,transparent_1px)] [background-size:27px_27px]" aria-hidden="true" />
      <svg role="group" aria-label="Spider web map of registered Blackstar models, tools, agents and providers. Highlighted lines are planning candidates, not live executions."
        viewBox="0 0 1000 620" className="relative mx-auto block min-w-[660px] w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id={namespace + '-core'}>
            <stop offset="0%" stopColor="#a78bfa" stopOpacity=".45" />
            <stop offset="67%" stopColor="#6d28d9" stopOpacity=".22" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity=".02" />
          </radialGradient>
          <linearGradient id={namespace + '-route'} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <filter id={namespace + '-glow'} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
        <g aria-hidden="true" fill="none" stroke="#8b5cf6" strokeWidth="1">
          {RINGS.map((r, index) => <motion.path key={r} d={webRing(r)} strokeOpacity={0.075 + index * 0.02}
            animate={canAnimate ? { strokeOpacity: [0.08, 0.22, 0.08] } : undefined}
            transition={canAnimate ? { duration: 5, delay: index * 0.3, repeat: Infinity } : undefined} />)}
          {Array.from({ length: 16 }, (_, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 16
            return <line key={index} x1="500" y1="310" x2={500 + Math.cos(angle) * 347} y2={310 + Math.sin(angle) * 236}
              strokeOpacity=".1" />
          })}
        </g>
        {graph.nodes.map((node) => {
          const highlight = node.planned
          const candidate = node.eligible
          const selected = node.id === activeId
          return <g key={node.providerId + ':' + node.kind + ':' + node.id}>
            {highlight && <line x1="500" y1="310" x2={node.x} y2={node.y}
              stroke="#a78bfa" strokeWidth="9" strokeOpacity=".12" filter={'url(#' + namespace + '-glow)'} aria-hidden="true" />}
            <line x1="500" y1="310" x2={node.x} y2={node.y}
              stroke={highlight ? 'url(#' + namespace + '-route)' : candidate ? '#67e8f9' : '#8b5cf6'}
              strokeWidth={highlight ? 2.6 : candidate ? 1.5 : 0.85}
              strokeOpacity={highlight ? 1 : candidate ? .55 : .22}
              strokeDasharray={highlight ? 'none' : candidate ? '5 5' : '2 8'}
              aria-hidden="true" />
            <g role="button" tabIndex={0} aria-label={'Inspect ' + node.name + ', ' + node.kind + ', ' + node.status}
              onClick={() => setFocusedId(node.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setFocusedId(node.id) } }}
              className="cursor-pointer outline-none focus-visible:opacity-90">
              {selected && <circle cx={node.x} cy={node.y} r="35" stroke="#c4b5fd" strokeWidth="1.5" fill="#a78bfa" fillOpacity=".1" />}
              <motion.circle cx={node.x} cy={node.y} r={node.planned ? 18 : 15}
                fill={node.active ? '#130f29' : '#10121a'}
                stroke={node.planned ? '#c4b5fd' : node.eligible ? '#67e8f9' : '#6b7280'}
                strokeOpacity={node.active ? 1 : .6} strokeWidth={node.planned ? 2.5 : 1.4}
                animate={canAnimate && node.planned ? { r: [18, 21, 18] } : undefined}
                transition={canAnimate && node.planned ? { duration: 3, repeat: Infinity } : undefined} />
              <circle cx={node.x} cy={node.y} r="4.5"
                fill={node.planned ? '#c4b5fd' : node.active ? '#67e8f9' : '#52525b'} />
              <text x={node.x} y={node.y + 35} fill={node.planned ? '#ede9fe' : '#cbd5e1'} fontSize="12" fontWeight={node.planned ? 650 : 450} textAnchor="middle">
                {node.name.length > 20 ? node.name.slice(0, 18) + '…' : node.name}
              </text>
              <text x={node.x} y={node.y + 50} fill="#77718f" fontSize="9" textAnchor="middle" letterSpacing="1.3">{node.kind.toUpperCase()}</text>
              <title>{node.name + ' · ' + node.kind + ' · ' + node.status}</title>
            </g>
          </g>
        })}
        {planned && canAnimate && <motion.circle r="4.5" fill="#e9d5ff" stroke="#c4b5fd" strokeWidth="2"
          animate={{ cx: [500, planned.x, 500], cy: [310, planned.y, 310], opacity: [0, 1, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true" />}
        <circle cx="500" cy="310" r="68" fill={'url(#' + namespace + '-core)'} stroke="#7c3aed" strokeOpacity=".3" />
        <motion.circle cx="500" cy="310" r="52" fill="#09071a" stroke="#a78bfa" strokeWidth="2"
          animate={canAnimate ? { strokeOpacity: [.5, 1, .5] } : undefined}
          transition={canAnimate ? { duration: 3, repeat: Infinity } : undefined} />
        <text x="500" y="302" textAnchor="middle" fill="#f5f3ff" fontWeight="650" fontSize="16" letterSpacing="2">ASTRA</text>
        <text x="500" y="320" textAnchor="middle" fill="#a5a0bd" fontSize="10" letterSpacing="1">ROUTER</text>
        <text x="500" y="340" textAnchor="middle" fill="#817698" fontSize="8">PLAN ONLY</text>
        {graph.nodes.length === 0 && <text x="500" y="565" textAnchor="middle" fill="#a1a1aa" fontSize="14">
          {loading ? 'Loading authorised inventory…' : 'No authorised Hub resources are available'}
        </text>}
      </svg>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[.025] px-4 py-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <DotLegend color="bg-zinc-500">Registered</DotLegend>
        <DotLegend color="bg-cyan-300">Eligible candidate</DotLegend>
        <DotLegend color="bg-violet-300">Planned path</DotLegend>
      </div>
      <p className="text-[11px] text-zinc-500">{matches} other candidate links · {graph.totalMatching} matching resources</p>
    </div>
    <div className="grid gap-3 border-t border-white/10 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-xl border border-white/10 bg-white/[.03] p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200"><Eye className="h-3.5 w-3.5 text-violet-300" />Selected network node</p>
        {activeNode ? <>
          <p className="mt-2 break-words text-sm font-medium text-white">{activeNode.name}</p>
          <p className="mt-1 break-words text-xs text-zinc-400">{activeNode.kind} · {activeNode.status} · {activeNode.providerId}</p>
          <p className="mt-2 text-xs text-zinc-500">{activeNode.planned ? 'Selected by the current read-only routing plan.' : activeNode.eligible ? 'Considered by the routing plan.' : 'Present in the existing Hub inventory; not part of this route.'}</p>
        </> : <p className="mt-2 text-xs text-zinc-500">Select a node to inspect its real inventory status.</p>}
      </div>
      <div className="min-w-0 rounded-xl border border-white/10 bg-white/[.03] p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200"><Activity className="h-3.5 w-3.5 text-cyan-300" />Router pathway</p>
        <p className="mt-2 text-sm font-medium text-white">{flowStatus}</p>
        <p className="mt-1 text-xs text-zinc-400">{route?.capability.name ?? 'No eligible capability selected'}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200/90"><ShieldCheck className="h-3.5 w-3.5" />Decision stage is planned, not executed</p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-black/20 p-3 sm:grid-cols-4">
      {SIGNALS.map((signal) => <div key={signal.label} className="rounded-lg border border-white/[.07] bg-white/[.02] px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wide text-zinc-500">{signal.label}</p>
        <p className="mt-1 text-[11px] font-medium text-zinc-300">{signal.value}</p>
      </div>)}
    </div>
    <p className="border-t border-white/10 px-4 py-3 text-[11px] leading-5 text-zinc-500">Motion shows a proposed route, never live data flow or AI execution. The web rings are a visual guide; only registered resources and actual planner candidates create highlighted links. No tool runs or approvals are issued from this diagram. {reducedMotion ? 'Reduced-motion preference is respected.' : ''}</p>
  </div>
}
