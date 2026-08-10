import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Loader2 } from 'lucide-react';
import { getApiUsage } from './api';

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <span className="text-[11px] text-zinc-500">{sub}</span>
      </div>
    </div>
  );
}

export default function UsagePanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try { setData(await getApiUsage()); } catch { setData(null); }
    finally { setLoading(false); }
  })(); }, []);

  if (loading) return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" />Loading usage…</div>;
  const series = (data && data.series) || [];
  const max = Math.max(1, ...series);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Usage</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Requests" value={(data?.requests || 0).toLocaleString()} sub="this period" />
        <Stat label="Errors" value={data?.errors || 0} sub={`${data?.error_rate || 0}% rate`} />
        <Stat label="Avg latency" value={`${data?.avg_latency_ms || 0}ms`} sub="server" />
        <Stat label="Top keys" value={(data?.top_keys || []).length} sub="tracked" />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
        <p className="mb-3 text-[11px] font-semibold text-white">Requests (recent window)</p>
        {series.length === 0 ? (
          <p className="py-10 text-center text-xs text-zinc-500">No API requests recorded yet. Make a call with an API key to see usage here.</p>
        ) : (
          <div className="flex h-32 items-end gap-1.5">
            {series.map((v, i) => (
              <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-violet-600/40 to-indigo-500" style={{ height: `${(v / max) * 100}%` }} />
            ))}
          </div>
        )}
      </div>
      {(data?.top_keys || []).length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
          <p className="mb-3 text-[11px] font-semibold text-white">Top keys by requests</p>
          <div className="space-y-2">
            {data.top_keys.map((k) => (
              <div key={k.name} className="flex items-center gap-2 text-xs">
                <span className="flex-1 truncate font-mono text-zinc-300">{k.name}</span>
                <span className="flex items-center gap-1 text-zinc-400"><TrendingUp className="h-3 w-3" />{k.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}