import { ShieldAlert, Search, Ban, Eye, X } from 'lucide-react';
import { useState } from 'react';

const SEV = {
  critical: 'bg-rose-500/15 text-rose-300 border-rose-400/20',
  high: 'bg-orange-500/15 text-orange-300 border-orange-400/20',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  low: 'bg-zinc-500/15 text-zinc-300 border-zinc-400/20',
};
const STATUS = { open: 'Open', investigating: 'Investigating', blocked: 'Blocked', resolved: 'Resolved' };

export default function SecurityEvents({ events }) {
  const [items, setItems] = useState(events);
  const act = (id, status) => setItems(items.map(e => e.id === id ? { ...e, status } : e));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-300" /><p className="text-sm font-semibold text-white">Security Events</p></div>
        <span className="text-[11px] text-zinc-500">{items.filter(e => e.status === 'open').length} open</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map(e => (
          <div key={e.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase ${SEV[e.severity]}`}>{e.severity}</span>
                  <p className="truncate text-[13px] font-medium text-white">{e.type}</p>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{e.id} · {e.source} → {e.target} · {e.time}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{STATUS[e.status]}</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <button onClick={() => act(e.id, 'investigating')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><Search className="h-3 w-3" />Investigate</button>
              <button onClick={() => act(e.id, 'blocked')} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/10"><Ban className="h-3 w-3" />Block</button>
              <button onClick={() => act(e.id, 'resolved')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />Review</button>
              <button onClick={() => act(e.id, 'resolved')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5"><X className="h-3 w-3" />Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}