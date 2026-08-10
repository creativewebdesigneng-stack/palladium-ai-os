import { Users, Building2, UserPlus, Handshake, Activity, ListChecks, StickyNote, Plus, Search } from 'lucide-react';
import { MODULES } from './crmData';

const ICONS = { Users, Building2, UserPlus, Handshake, Activity, ListChecks, StickyNote };

export default function CRMToolbar({ module, setModule, q, setQ, onCreate }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1">
        {MODULES.map((m) => { const I = ICONS[m.icon]; return (
          <button key={m.id} onClick={() => setModule(m.id)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${module === m.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <I className="h-3.5 w-3.5" />{m.label}
          </button>
        ); })}
      </div>
      <div className="relative min-w-[180px] flex-1 sm:flex-none">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 outline-none" />
      </div>
      <button onClick={onCreate} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white"><Plus className="h-3.5 w-3.5" />New</button>
    </div>
  );
}