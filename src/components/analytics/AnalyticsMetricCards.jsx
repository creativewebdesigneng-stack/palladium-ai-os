export default function AnalyticsMetricCards({ metrics = [] }) {
  if (metrics.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-4 py-6 text-center text-xs text-zinc-500">No metrics yet.</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((m) => (
        <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">{m.label}</p>
          <p className="mt-1 text-lg font-semibold text-white">{m.value}</p>
          {m.delta && <p className={`text-[10px] ${m.up ? 'text-emerald-400' : 'text-rose-400'}`}>{m.delta} vs prev</p>}
        </div>
      ))}
    </div>
  );
}
