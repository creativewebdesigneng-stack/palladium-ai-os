import { METRICS } from './biData';

export default function BIMetricCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {METRICS.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.tone}`} />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-semibold text-white">{m.value}</p>
              {m.sub && <span className="text-[10px] text-zinc-500">{m.sub}</span>}
            </div>
            <p className={`text-[10px] ${m.up ? 'text-emerald-400' : 'text-rose-400'}`}>{m.delta} vs prev</p>
          </div>
        </div>
      ))}
    </div>
  );
}