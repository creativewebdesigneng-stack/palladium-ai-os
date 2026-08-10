import { Search, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { TABS } from './securityData';

export default function SecurityToolbar({ query, setQuery, activeTab, setActiveTab, resultCount }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search alerts, sessions, keys…"
              className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5">
            <SlidersHorizontal className="h-3.5 w-3.5" />Filters
          </button>
          {resultCount != null && <span className="hidden text-[11px] text-zinc-500 sm:inline">{resultCount} results</span>}
        </div>
        <div className="flex flex-wrap gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTab === t ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/30' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}