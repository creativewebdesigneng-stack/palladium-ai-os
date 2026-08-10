import { useState } from 'react';
import { Terminal, Pause, Play } from 'lucide-react';
import { LOGS, LOG_LEVELS } from './monitoringData';

const fmt = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function LogsPanel({ service }) {
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('all');

  const rows = LOGS.filter(l => {
    if (service && l.service !== service) return false;
    if (filter !== 'all' && l.level !== filter) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5 text-violet-400" /><p className="text-[13px] font-semibold text-white">Service logs{service ? ` · ${service}` : ''}</p></div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 rounded-lg border border-white/10 bg-white/[.03] p-0.5">
            {['all', 'info', 'warn', 'error'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase ${filter === f ? 'bg-violet-500/20 text-violet-200' : 'text-zinc-500 hover:text-zinc-300'}`}>{f}</button>
            ))}
          </div>
          <button onClick={() => setPaused(p => !p)} title={paused ? 'Resume' : 'Pause'} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5">{paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}</button>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto font-mono text-[11px] leading-relaxed">
        {rows.map((l, i) => (
          <div key={i} className="flex gap-2 rounded px-1.5 py-0.5 hover:bg-white/[.03]">
            <span className="shrink-0 text-zinc-600">{fmt(l.ts)}</span>
            <span className={`w-12 shrink-0 uppercase font-medium ${LOG_LEVELS[l.level]}`}>{l.level}</span>
            <span className="w-24 shrink-0 text-cyan-300/70">{l.service}</span>
            <span className="text-zinc-300">{l.msg}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="py-8 text-center text-[12px] text-zinc-600">No logs match the current filter.</p>}
      </div>
      {!paused && <div className="mt-2 flex items-center gap-1.5 text-[10px] text-zinc-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Live tail · streaming</div>}
    </div>
  );
}