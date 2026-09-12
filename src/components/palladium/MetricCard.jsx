import { ArrowUpRight } from 'lucide-react';

export default function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="blackstar-metric-card group relative overflow-hidden rounded-[20px] border border-white/[.075] p-4">
      <div aria-hidden className="blackstar-metric-beam" />
      <div aria-hidden className="blackstar-metric-floor" />
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[.18em] text-zinc-500">{label}</span>
        {Icon && <span className="grid h-8 w-8 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[.055] shadow-[inset_0_1px_0_rgba(255,255,255,.05)]"><Icon className="h-4 w-4 text-violet-200/80" /></span>}
      </div>
      <p className="relative z-10 mt-3 text-2xl font-semibold tracking-[-.045em] text-white">{value}</p>
      <p className="relative z-10 mt-1.5 flex items-center text-[11px] text-emerald-300/80"><ArrowUpRight className="mr-1 h-3 w-3" />{detail}</p>
    </div>
  );
}
