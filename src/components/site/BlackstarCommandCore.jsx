import { AstraMark } from '@/components/blackstar/AstraMark'

const NODES = [
  ['Models', 'Route'],
  ['Agents', 'Act'],
  ['Memory', 'Recall'],
  ['Tools', 'Use'],
  ['Workflows', 'Run'],
  ['Governance', 'Control'],
]

export default function BlackstarCommandCore() {
  return (
    <div className="blackstar-command-core relative mx-auto aspect-square w-full max-w-[34rem]">
      <div aria-hidden className="blackstar-command-core-glow" />
      <div aria-hidden className="blackstar-command-core-ring blackstar-command-core-ring-a" />
      <div aria-hidden className="blackstar-command-core-ring blackstar-command-core-ring-b" />
      <div aria-hidden className="blackstar-command-core-ring blackstar-command-core-ring-c" />
      <div className="blackstar-command-core-center">
        <AstraMark size={78} title="Blackstar intelligence core" />
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.28em] text-violet-100/70">Astra-class core</p>
        <p className="mt-1 text-xs text-zinc-500">Bounded intelligence infrastructure</p>
      </div>
      {NODES.map(([name, action], index) => (
        <div
          key={name}
          className="blackstar-command-core-node"
          style={{ '--node-index': index }}
        >
          <span className="blackstar-command-core-node-dot" />
          <span>
            <span className="block text-[11px] font-semibold text-white">{name}</span>
            <span className="mt-0.5 block text-[9px] uppercase tracking-[.18em] text-zinc-600">{action}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
