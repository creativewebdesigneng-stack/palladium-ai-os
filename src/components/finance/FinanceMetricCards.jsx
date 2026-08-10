import { METRICS } from './financeData';

export default function FinanceMetricCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {METRICS.map((m) => (
        <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
          <p className="mt-1 text-base font-semibold text-white">{m.value}</p>
          <p className={`text-[10px] ${m.up ? 'text-emerald-400' : 'text-rose-400'}`}>{m.delta}</p>
        </div>
      ))}
    </div>
  );
}