import { Clock, Bookmark, Trash2, Search } from 'lucide-react';
import { HISTORY, SAVED } from './webData';

export function SearchHistory({ onPick }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-white"><Clock className="h-3.5 w-3.5 text-zinc-500" />Search history</p>
      <div className="space-y-1">
        {HISTORY.map(h => (
          <button key={h.id} onClick={() => onPick(h.query)} className="group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white/5">
            <Search className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-violet-400" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">{h.query}</span>
            <span className="text-[10px] text-zinc-600">{h.time}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SavedSearches({ onPick }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-white"><Bookmark className="h-3.5 w-3.5 text-zinc-500" />Saved searches</p>
      <div className="space-y-1">
        {SAVED.map(s => (
          <div key={s.id} className="group flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-white/5">
            <button onClick={() => onPick(s.query)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <Bookmark className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
              <span className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">{s.query}</span>
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">{s.count}</span>
            </button>
            <button className="text-zinc-600 opacity-0 hover:text-red-400 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}