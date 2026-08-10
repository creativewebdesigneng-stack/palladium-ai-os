export default function AnalyticsChart({ title, subtitle, data, color = 'violet' }) {
  if (!data) return null;
  const max = Math.max(...data.values, 1);
  const fmt = (v) => v >= 1000 ? (v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : (v/1000).toFixed(1) + 'k') : String(v);
  const bar = color === 'cyan' ? 'from-cyan-600/30 to-cyan-400' : color === 'rose' ? 'from-rose-600/30 to-rose-400' : 'from-violet-600/30 to-violet-400';
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center justify-between">
        <div><p className="text-sm font-semibold text-white">{title}</p>{subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}</div>
      </div>
      <div className="mt-4 flex h-44 items-end gap-1.5">
        {data.values.map((v, i) => (
          <div key={i} className="group relative flex-1">
            <div className={`w-full rounded-t-md bg-gradient-to-t ${bar}`} style={{ height: Math.max((v / max) * 100, 2) + '%' }} />
            <div className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[9px] text-white group-hover:block">{fmt(v)}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[9px] text-zinc-600">{data.labels.map((l, i) => <span key={i}>{l}</span>)}</div>
    </div>
  );
}