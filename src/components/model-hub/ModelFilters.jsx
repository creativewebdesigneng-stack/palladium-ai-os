import { Search } from 'lucide-react';
import { PROVIDERS } from './modelsData';

export default function ModelFilters({ q, setQ, provider, setProvider }) {
  return (
    <div className="mb-5 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search models, providers or capabilities…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setProvider('all')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${provider === 'all' ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>All providers</button>
        {PROVIDERS.map(p => (
          <button key={p} onClick={() => setProvider(p)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${provider === p ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{p}</button>
        ))}
      </div>
    </div>
  );
}