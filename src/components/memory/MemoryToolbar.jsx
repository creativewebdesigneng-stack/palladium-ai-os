import { Search, Plus, Upload } from 'lucide-react';
import { MEMORY_TYPES, MEMORY_SCOPES } from './memoryData';

export default function MemoryToolbar({ type, onType, scope, onScope, query, onQuery, onAdd, onUpload, counts }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Tab active={type === 'all'} onClick={() => onType('all')} label="All" count={counts.all} />
        {MEMORY_TYPES.map((t) => {
          const I = t.icon;
          return (
            <button key={t.id} onClick={() => onType(t.id)} title={t.desc}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${type === t.id ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>
              <I className="h-3.5 w-3.5" />{t.label}
              <span className={`rounded-full px-1.5 text-[10px] ${type === t.id ? 'bg-black/10' : 'bg-white/5'}`}>{counts[t.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">Scope</span>
          <ScopeChip active={scope === 'all'} onClick={() => onScope('all')} label="All" />
          {MEMORY_SCOPES.map((s) => (
            <ScopeChip key={s.id} active={scope === s.id} onClick={() => onScope(s.id)} label={s.label} title={s.desc} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search memory…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-400/40 sm:w-64" />
          </div>
          <button onClick={onUpload} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/10"><Upload className="h-3.5 w-3.5" />Upload</button>
          <button onClick={onAdd} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-3.5 w-3.5" />Add memory</button>
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>
      {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-black/10' : 'bg-white/5'}`}>{count ?? 0}</span>
    </button>
  );
}

function ScopeChip({ active, onClick, label, title }) {
  return (
    <button onClick={onClick} title={title} className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${active ? 'bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{label}</button>
  );
}