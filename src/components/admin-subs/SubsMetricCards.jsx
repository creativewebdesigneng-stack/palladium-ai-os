import { Layers, Users, PoundSterling, TrendingUp, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';

const ICONS = { layers: Layers, users: Users, pound: PoundSterling, trending: TrendingUp, 'arrow-down': ArrowDownCircle, 'arrow-up': ArrowUpCircle, clock: Clock };

export default function SubsMetricCards({ metrics }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(m => {
        const Icon = ICONS[m.icon] || Layers;
        const isNeg = m.icon === 'arrow-down' && m.label === 'Churn Rate';
        return (
          <div key={m.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{m.value}</p>
            <p className="text-[11px] text-zinc-500">{m.label}</p>
            <p className={`mt-1 text-[10px] ${isNeg ? 'text-emerald-300' : 'text-zinc-500'}`}>{m.detail}</p>
          </div>
        );
      })}
    </div>
  );
}