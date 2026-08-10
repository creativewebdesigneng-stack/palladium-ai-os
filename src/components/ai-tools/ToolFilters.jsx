import { Search } from 'lucide-react';
import { CATEGORIES, PRICING_TYPES } from './toolsData';

export default function ToolFilters({ q, setQ, cat, setCat, pricing, togglePricing }) {
  return (
    <div className="mb-5 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tools, capabilities or categories…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setCat('all')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === 'all' ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>All categories</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === c ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{c}</button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">Pricing:</span>
        {PRICING_TYPES.map(p => (
          <button key={p} onClick={() => togglePricing(p)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${pricing.includes(p) ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{p}</button>
        ))}
      </div>
    </div>
  );
}