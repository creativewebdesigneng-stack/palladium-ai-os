import { Bell, Search, Ban, Eye, X } from 'lucide-react';
import { useState } from 'react';

const TONE = {
  critical: 'border-l-rose-400',
  high: 'border-l-orange-400',
  medium: 'border-l-amber-400',
  low: 'border-l-zinc-500',
};
const STATUS = { open: 'Open', investigating: 'Investigating', resolved: 'Resolved' };

export default function SecurityAlerts({ alerts }) {
  const [items, setItems] = useState(alerts);
  const act = (id, status) => setItems(items.map(a => a.id === id ? { ...a, status } : a));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-300" /><p className="text-sm font-semibold text-white">Security Alerts</p></div>
        <span className="text-[11px] text-zinc-500">{items.filter(a => a.status === 'open').length} open</span>
      </div>
      <div className="mt-3 space-y-2">
        {items.map(a => (
          <div key={a.id} className={`rounded-xl border border-white/10 border-l-2 ${TONE[a.tone]} bg-black/20 p-3`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">{a.title}</p>
                <p className="text-[10px] text-zinc-500">{a.id} · {a.time}</p>
              </div>
              <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{STATUS[a.status]}</span>
            </div>
            {a.status !== 'resolved' && (
              <div className="mt-2 flex flex-wrap gap-1">
                <button onClick={() => act(a.id, 'investigating')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><Search className="h-3 w-3" />Investigate</button>
                <button onClick={() => act(a.id, 'resolved')} className="flex items-center gap-1 rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/10"><Ban className="h-3 w-3" />Block</button>
                <button onClick={() => act(a.id, 'investigating')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />Review</button>
                <button onClick={() => act(a.id, 'resolved')} className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5"><X className="h-3 w-3" />Dismiss</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}