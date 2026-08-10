import { Search, Filter, Package } from 'lucide-react';
import { CATEGORIES, STATUSES } from './adminIntegrationsData';

export default function IntegrationsToolbar({ query, setQuery, category, setCategory, status, setStatus, count }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative max-w-xs flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search integrations…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Category</span>
          <select value={category} onChange={e => setCategory(e.target.value)} className="bg-transparent text-[11px] text-zinc-200 [&>option]:bg-[#10121a]">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Status</span>
          <select value={status} onChange={e => setStatus(e.target.value)} className="bg-transparent text-[11px] text-zinc-200 [&>option]:bg-[#10121a]">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <span className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-[11px] text-zinc-400"><Package className="h-3.5 w-3.5 text-violet-400" />{count} integrations</span>
      </div>
    </div>
  );
}