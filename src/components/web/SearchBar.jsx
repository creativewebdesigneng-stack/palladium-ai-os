import { Search, Sparkles, X } from 'lucide-react';
import { SAMPLE_QUERIES } from './webData';

export default function SearchBar({ query, setQuery, onSearch, loading }) {
  return (
    <div>
      <div className="relative flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-violet-400/40">
        <Search className="h-5 w-5 shrink-0 text-zinc-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
          placeholder="Ask anything — e.g. Find the best CRM platforms for a small business"
          className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        {query && <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-white"><X className="h-4 w-4" /></button>}
        <button
          onClick={onSearch}
          disabled={loading || !query.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />{loading ? 'Searching' : 'Search'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLE_QUERIES.map(q => (
          <button key={q} onClick={() => { setQuery(q); onSearch(q); }} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-[11px] text-zinc-400 hover:border-violet-400/30 hover:text-white">{q}</button>
        ))}
      </div>
    </div>
  );
}