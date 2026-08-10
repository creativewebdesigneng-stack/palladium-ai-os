import { Mail, Star, AtSign, XCircle, CheckCircle2, X } from 'lucide-react';
import { FILTERS } from './notificationsData';

const ICONS = { Mail, Star, AtSign, XCircle, CheckCircle2 };

export default function NotificationsFilters({ activeFilters, toggleFilter, query, setQuery, onClearAll }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const Icon = ICONS[f.icon];
          const isActive = activeFilters.includes(f.id);
          return (
            <button key={f.id} onClick={() => toggleFilter(f.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${isActive ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
              <Icon className="h-3.5 w-3.5" />{f.label}
            </button>
          );
        })}
        {activeFilters.length > 0 && (
          <button onClick={() => activeFilters.forEach((f) => toggleFilter(f))} className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] text-zinc-500 hover:text-white">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notifications…"
          className="w-48 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        <button onClick={onClearAll} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">Mark all read</button>
      </div>
    </div>
  );
}