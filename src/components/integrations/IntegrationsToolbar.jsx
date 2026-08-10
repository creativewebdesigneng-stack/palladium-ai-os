import { Search, SlidersHorizontal } from 'lucide-react';
import { TABS } from './integrationsData';

export default function IntegrationsToolbar({ query, setQuery, activeTab, setActiveTab, resultCount }) {
  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5">
          <Search className="h-4 w-4 text-zinc-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search integrations..." className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
          <span className="hidden text-[10px] text-zinc-600 sm:inline">{resultCount} results</span>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-3.5 py-2.5 text-sm text-zinc-300 hover:bg-white/5">
          <SlidersHorizontal className="h-4 w-4" />Filters
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${activeTab === t ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-400/20' : 'border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{t}</button>
        ))}
      </div>
    </div>
  );
}