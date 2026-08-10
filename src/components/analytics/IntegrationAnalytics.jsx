import { Plug } from 'lucide-react';
import { INTEGRATION_ANALYTICS, INTEGRATION_STATUS } from './analyticsData';

export default function IntegrationAnalytics() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center gap-2"><Plug className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">Integration Analytics</h3></div>
      <p className="text-[11px] text-zinc-500">API calls & health by integration</p>
      <div className="mt-3 space-y-2">
        {INTEGRATION_ANALYTICS.map((i) => (
          <div key={i.integration} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-white">{i.integration}</span>
              <span className={`ml-auto rounded-full px-2 py-px text-[9px] font-medium uppercase ${INTEGRATION_STATUS[i.status]}`}>{i.status}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[10px] text-zinc-500">
              <span>{i.calls.toLocaleString()} calls</span><span>last sync {i.lastSync}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/5"><div className={`h-1.5 rounded-full ${i.status === 'healthy' ? 'bg-emerald-400' : i.status === 'degraded' ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${Math.min(100, i.calls / 182)}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}