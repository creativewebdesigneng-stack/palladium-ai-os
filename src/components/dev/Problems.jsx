import { useState } from 'react';
import { CircleAlert, TriangleAlert, Lightbulb } from 'lucide-react';
import { PROBLEMS, SEV_STYLE } from './devData';

const TABS = [['errors', 'Errors', CircleAlert, 'text-rose-400'], ['warnings', 'Warnings', TriangleAlert, 'text-amber-400'], ['suggestions', 'Suggestions', Lightbulb, 'text-sky-400']];

export default function Problems() {
  const [tab, setTab] = useState('errors');
  const items = PROBLEMS[tab];
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-2 flex items-center gap-2"><h3 className="text-sm font-semibold text-white">Problems</h3><span className="rounded bg-white/5 px-1.5 py-px text-[10px] text-zinc-500">{items.length}</span></div>
      <div className="mb-2 flex gap-1">
        {TABS.map(([k, l, I, c]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] ${tab === k ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}><I className={`h-3 w-3 ${c}`} />{l}</button>
        ))}
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {items.map((p, i) => { const st = SEV_STYLE[p.sev]; return (
          <div key={i} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-px text-[9px] font-medium uppercase ${st}`}>{p.sev}</span>
              <span className="text-[11px] text-zinc-200">{p.msg}</span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">{p.file}:{p.line}</p>
          </div>
        ); })}
      </div>
    </div>
  );
}