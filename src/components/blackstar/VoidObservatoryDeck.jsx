import { motion } from 'framer-motion'
import { AstraMark } from '@/components/blackstar/AstraMark'

const SUBSYSTEMS = [
  ['Astrometry', 'Stable'],
  ['Celestial maps', 'Stable'],
  ['Void array', 'Active'],
  ['Infrastructure', 'Stable'],
  ['Risk matrix', 'Monitoring'],
  ['Horizon link', 'Stable'],
]

const DECISIONS = [
  ['Strategic horizon', 'Long-range alignment'],
  ['Infrastructure leverage', 'Asset velocity'],
  ['Systemic risk', 'Cascade analysis'],
  ['Execution lock', 'Protocol commit'],
]

const FLOOR = ['Observatory core', 'Portfolio lens', 'Exposure map', 'Risk depth', 'Protocol gate']

export default function VoidObservatoryDeck() {
  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-[#050508]/90 shadow-[0_40px_120px_rgba(0,0,0,.65)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(123,92,255,.12),transparent_28%)]" />
      <div className="relative flex items-center justify-between px-6 py-4 font-mono text-[9px] uppercase tracking-[.22em] text-zinc-500">
        <span>Sys // 07 overview</span>
        <div className="text-center">
          <p className="text-[11px] tracking-[.48em] text-zinc-200">Blackstar</p>
          <p className="mt-1 tracking-[.32em] text-zinc-600">Void observatory</p>
        </div>
        <span>Obs. time</span>
      </div>

      <div className="relative grid gap-6 px-5 pb-6 lg:grid-cols-[200px_minmax(0,1fr)_220px] lg:items-center">
        <aside className="space-y-3">
          <p className="text-[9px] uppercase tracking-[.24em] text-zinc-600">Subsystems</p>
          {SUBSYSTEMS.map(([name, state]) => (
            <div key={name} className="flex items-baseline justify-between border-b border-white/5 pb-2">
              <span className="text-[11px] text-zinc-300">{name}</span>
              <span className={`text-[9px] uppercase tracking-[.16em] ${state === 'Active' ? 'text-violet-300' : 'text-zinc-600'}`}>{state}</span>
            </div>
          ))}
        </aside>

        <div className="relative mx-auto grid min-h-[320px] place-items-center">
          <div className="absolute h-64 w-64 rounded-full border border-white/10" />
          <div className="absolute h-48 w-48 rounded-full border border-violet-300/15" />
          <div className="absolute bottom-8 h-16 w-52 rounded-[50%] border border-violet-300/20 bg-violet-500/10 blur-[1px]" />
          <motion.div
            className="relative z-10"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <AstraMark size={148} title="Blackstar void observatory" />
          </motion.div>
        </div>

        <aside className="space-y-4">
          <p className="text-[9px] uppercase tracking-[.24em] text-zinc-600">Decision rail</p>
          {DECISIONS.map(([title, copy], index) => (
            <div key={title} className="border-l border-violet-300/20 pl-3">
              <p className="text-[11px] text-zinc-200">{title}</p>
              <p className="mt-0.5 text-[10px] text-zinc-600">{copy}</p>
              {index === DECISIONS.length - 1 ? (
                <span className="mt-3 inline-flex rounded-md border border-white/10 px-2 py-1 text-[9px] uppercase tracking-[.16em] text-zinc-400">Advance protocol</span>
              ) : null}
            </div>
          ))}
        </aside>
      </div>

      <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-6 py-3 text-[9px] uppercase tracking-[.16em] text-zinc-600">
        <span>Briefing feed</span>
        <div className="flex flex-wrap gap-4 text-zinc-500">
          {FLOOR.map((item) => <span key={item}>{item}</span>)}
        </div>
        <span>Local node</span>
      </div>
    </div>
  )
}
