import { useState } from 'react';
import { Download } from 'lucide-react';
import { LOG_LINES, LOG_STYLE } from './terminalData';

const LEVELS = ['all', 'info', 'warn', 'error', 'debug'];

export default function LogsView({ onToast }) {
  const [filter, setFilter] = useState('all');
  const lines = filter === 'all' ? LOG_LINES : LOG_LINES.filter((l) => l.level === filter);

  const download = () => {
    const blob = new Blob([lines.map((l) => `${l.t} [${l.level}] ${l.src}: ${l.msg}`).join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `palladium-logs-${Date.now()}.log`; a.click();
    URL.revokeObjectURL(url);
    onToast?.('Logs downloaded');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-semibold text-white">Logs</span>
        <div className="ml-auto flex items-center gap-1">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setFilter(l)} className={`rounded-lg px-2 py-1 text-[10px] capitalize ${filter === l ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>{l}</button>
          ))}
          <button onClick={download} className="ml-1 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-zinc-400 hover:bg-white/5 hover:text-white"><Download className="h-3 w-3" />Download</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2 py-0.5 hover:bg-white/5">
            <span className="shrink-0 text-zinc-600">{l.t}</span>
            <span className={`shrink-0 font-semibold uppercase ${LOG_STYLE[l.level]}`}>{l.level}</span>
            <span className="shrink-0 text-zinc-500">{l.src}</span>
            <span className="text-zinc-300">{l.msg}</span>
          </div>
        ))}
        {!lines.length && <p className="text-[11px] text-zinc-600">No log entries match "{filter}".</p>}
      </div>
    </div>
  );
}