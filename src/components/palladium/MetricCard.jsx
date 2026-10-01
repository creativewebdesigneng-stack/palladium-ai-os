import { ArrowUpRight } from 'lucide-react'

export default function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="blackstar-metric-card group relative overflow-hidden rounded-[20px] border border-white/[.075] p-4">
      <div aria-hidden className="blackstar-metric-beam" />
      <div aria-hidden className="blackstar-metric-floor" />
      <div aria-hidden className="blackstar-metric-ring" />
      <div aria-hidden className="blackstar-corner-mark blackstar-corner-mark-tl" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <span className="text-[9px] font-semibold uppercase tracking-[.2em] text-zinc-600">{label}</span>
        {Icon && (
          <span className="blackstar-metric-icon grid h-8 w-8 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[.055] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
            <Icon className="h-4 w-4 text-violet-200/80" />
          </span>
        )}
      </div>
      <div className="relative z-10 mt-4 flex items-end justify-between gap-3">
        <p className="text-[1.7rem] font-semibold leading-none tracking-[-.055em] text-white">{value}</p>
        <span aria-hidden className="mb-1 h-px min-w-8 flex-1 bg-gradient-to-r from-violet-300/15 to-transparent" />
      </div>
      {detail ? (
        <p className="relative z-10 mt-2 flex items-center text-[10px] text-emerald-300/75">
          <ArrowUpRight className="mr-1 h-3 w-3" />{detail}
        </p>
      ) : (
        <p className="relative z-10 mt-2 text-[10px] text-zinc-700">Live workspace metric</p>
      )}
    </div>
  )
}
