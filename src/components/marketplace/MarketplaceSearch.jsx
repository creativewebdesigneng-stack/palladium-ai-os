import { useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

const SEARCH_TYPES = ['Agents', 'Apps', 'Plugins', 'Templates', 'Automations', 'Prompts', 'Integrations', 'MCP Servers', 'Collections', 'Developers', 'Companies'];

export default function MarketplaceSearch() {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('Agents');

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.04] px-4 py-3 backdrop-blur-xl transition focus-within:border-violet-400/40">
        <Search className="h-5 w-5 shrink-0 text-zinc-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search everything..."
          className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery('')} className="rounded-lg p-1 text-zinc-500 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        )}
        <select
          value={activeType}
          onChange={e => setActiveType(e.target.value)}
          className="hidden rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-zinc-300 focus:outline-none sm:block"
        >
          {SEARCH_TYPES.map(t => <option key={t} value={t} className="bg-[#0c0d13]">{t}</option>)}
        </select>
        <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
          <SlidersHorizontal className="h-3.5 w-3.5" />Filters
        </button>
      </div>

      {/* Quick type chips */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SEARCH_TYPES.map(t => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition ${activeType === t ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}