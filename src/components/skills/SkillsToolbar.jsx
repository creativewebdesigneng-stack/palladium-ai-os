import { Search, Plus, Wrench } from 'lucide-react';
import { CATEGORIES } from './skillsData';

export default function SkillsToolbar({ category, onCategory, query, onQuery, onNew }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button onClick={() => onCategory('All')} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${category === 'All' ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}><Wrench className="h-3.5 w-3.5" />All</button>
          {CATEGORIES.map((c) => {
            const I = c.icon;
            const active = category === c.id;
            return (
              <button key={c.id} onClick={() => onCategory(c.id)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${active ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>
                <I className="h-3.5 w-3.5" />{c.id}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search tools…" className="w-52 rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-400/40" />
          </div>
          {onNew && (
            <button onClick={onNew} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-violet-900/30"><Plus className="h-3.5 w-3.5" />Create Tool</button>
          )}
        </div>
      </div>
    </div>
  );
}