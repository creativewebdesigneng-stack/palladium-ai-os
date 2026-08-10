import { LayoutGrid, TrendingUp, Megaphone, Wallet, Settings2, Users, LifeBuoy, Server, Plus, Search } from 'lucide-react';
import { CATEGORIES } from './automationData';

const ICONS = { LayoutGrid, TrendingUp, Megaphone, Wallet, Settings2, Users, LifeBuoy, Server };

export default function AutomationToolbar({ active, setActive, q, setQ, onCreate }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1">
          {CATEGORIES.map((c) => { const I = ICONS[c.icon]; return (
            <button key={c.id} onClick={() => setActive(c.id)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${active === c.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>
              <I className="h-3.5 w-3.5" />{c.label}
            </button>
          ); })}
        </div>
        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search automations…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 outline-none" />
        </div>
        <button onClick={onCreate} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />Create</button>
      </div>
    </div>
  );
}