import { Search, X } from 'lucide-react';
import { CATEGORIES, FILTER_OPTIONS } from './discoveryData';

export default function DiscoveryFilters({ q, setQ, cat, setCat, rating, setRating, sort, setSort }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-600" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search AI models, agents, tools…" className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-9 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        {q && <button onClick={() => setQ('')} className="absolute right-2.5 top-2.5 text-zinc-600 hover:text-white"><X className="h-4 w-4" /></button>}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Categories</p>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat('all')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === 'all' ? 'bg-violet-500/20 text-white' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>All</button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === c.id ? 'bg-violet-500/20 text-white' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Rating</p>
          <select value={rating} onChange={e => setRating(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] text-zinc-200 focus:border-violet-400/40 focus:outline-none">
            {FILTER_OPTIONS.rating.map(o => <option key={o.id} value={o.id} className="bg-[#10121a]">{o.label}</option>)}
          </select>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Sort</p>
          <select value={sort} onChange={e => setSort(e.target.value)} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[11px] text-zinc-200 focus:border-violet-400/40 focus:outline-none">
            {FILTER_OPTIONS.sort.map(o => <option key={o.id} value={o.id} className="bg-[#10121a]">{o.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}