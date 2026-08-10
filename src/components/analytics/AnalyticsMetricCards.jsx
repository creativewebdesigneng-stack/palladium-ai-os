import { METRICS } from './analyticsData';

export default function AnalyticsMetricCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {METRICS.map((m) => (
        <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
          <p className="mt-1 text-lg font-semibold text-white">{m.value}</p>
          <p className={`text-[10px] ${m.up ? 'text-emerald-400' : 'text-rose-400'}`}>{m.delta} vs prev</p>
        </div>
      ))}
    </div>
  );
}