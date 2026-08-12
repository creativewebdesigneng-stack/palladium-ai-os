import { Search, Package } from 'lucide-react';

export default function MarketplaceToolbar({ category, onCategory, query, onQuery, categories, counts }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button onClick={() => onCategory('All')} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${category === 'All' ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}><Package className="h-3.5 w-3.5" />All <span className="opacity-50">{counts.All ?? 0}</span></button>
        {categories.map((c) => {
          const active = category === c;
          return (
            <button key={c} onClick={() => onCategory(c)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${active ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>
              {c} <span className="opacity-50">{counts[c] ?? 0}</span>
            </button>
          );
        })}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search tools by name or category…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-400/40 sm:w-96" />
      </div>
    </div>
  );
}
