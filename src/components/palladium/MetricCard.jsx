import { ArrowUpRight } from 'lucide-react';

export default function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[.07] bg-gradient-to-br from-white/[.045] via-white/[.018] to-violet-500/[.025] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.035)] transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/20 hover:shadow-[0_16px_50px_rgba(0,0,0,.25),0_0_30px_rgba(124,58,237,.04)]">
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/[.05] blur-2xl transition group-hover:bg-violet-500/[.09]" />
      <div className="relative flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[.16em] text-zinc-600">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-violet-300/75" />}
      </div>
      <p className="relative mt-3 text-2xl font-semibold tracking-[-.035em] text-white">{value}</p>
      <p className="relative mt-1 flex items-center text-[11px] text-emerald-400/80"><ArrowUpRight className="mr-1 h-3 w-3" />{detail}</p>
    </div>
  );
}
