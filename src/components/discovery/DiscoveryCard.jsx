import { Star, Globe, ArrowUpRight, TrendingUp } from 'lucide-react';
import { categoryById } from './discoveryData';

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-3 w-3 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />)}
      <span className="ml-1 text-[11px] font-medium text-zinc-300">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function DiscoveryCard({ item }) {
  const cat = categoryById(item.category);
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.grad} text-base font-semibold text-white`}>{item.name[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-white">{item.name}</p>
          <span className="mt-0.5 inline-block rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] text-zinc-400">{cat.label}</span>
        </div>
        {item.trending && <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300"><TrendingUp className="h-2.5 w-2.5" />Trending</span>}
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] text-zinc-400">{item.desc}</p>
      <div className="mt-3"><Stars rating={item.rating} /></div>
      <div className="mt-2 flex flex-wrap gap-1">
        {item.capabilities.slice(0, 3).map(c => <span key={c} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>)}
      </div>
      <a href={`https://${item.website}`} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-300 hover:underline">
        <Globe className="h-3.5 w-3.5" />{item.website}<ArrowUpRight className="ml-auto h-3.5 w-3.5 text-zinc-600" />
      </a>
    </div>
  );
}