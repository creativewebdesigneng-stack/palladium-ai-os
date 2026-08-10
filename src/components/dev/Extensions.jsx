import { useState } from 'react';
import { Puzzle, Search } from 'lucide-react';
import { EXTENSIONS } from './devData';

export default function Extensions() {
  const [list, setList] = useState(EXTENSIONS);
  const toggle = (id) => setList((l) => l.map((e) => e.id === id ? { ...e, enabled: !e.enabled } : e));
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center gap-2"><Puzzle className="h-4 w-4 text-violet-400" /><h3 className="text-sm font-semibold text-white">Extensions</h3></div>
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input placeholder="Search extensions…" className="w-full rounded-lg border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-[11px] text-zinc-200 outline-none" />
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {list.map((e) => (
          <div key={e.id} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-600/40 to-indigo-600/40 text-sm text-white">{e.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-white">{e.name}</p>
              <p className="truncate text-[10px] text-zinc-500">{e.desc}</p>
            </div>
            <button onClick={() => toggle(e.id)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${e.enabled ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${e.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}