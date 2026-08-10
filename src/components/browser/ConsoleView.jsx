import { useState } from 'react';
import { CONSOLE, CONSOLE_STYLE } from './browserData';

const LEVELS = ['all', 'log', 'info', 'warn', 'error'];

export default function ConsoleView() {
  const [filter, setFilter] = useState('all');
  const lines = filter === 'all' ? CONSOLE : CONSOLE.filter((l) => l.level === filter);
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="flex items-center gap-1 border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-semibold text-white">Console</span>
        <span className="ml-1 text-[10px] text-zinc-500">{lines.length}</span>
        <div className="ml-auto flex gap-1">
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setFilter(l)} className={`rounded-lg px-2 py-1 text-[10px] capitalize ${filter === l ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px]">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2 border-b border-white/5 py-1">
            <span className={`shrink-0 font-semibold uppercase ${CONSOLE_STYLE[l.level]}`}>{l.level}</span>
            <span className="shrink-0 text-zinc-600">{l.src}</span>
            <span className="text-zinc-300">{l.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}