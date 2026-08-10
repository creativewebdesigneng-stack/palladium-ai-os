import { Star, Eye, Heart, Share2, ArrowRight } from 'lucide-react';

export default function TemplateCard({ t, onPreview, onUse, onFav, favs }) {
  const fav = favs.includes(t.id);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03] hover:border-violet-400/30">
      <div className={`relative h-28 bg-gradient-to-br ${t.grad} p-3`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative flex h-full flex-col justify-between">
          <div className="rounded-lg bg-black/30 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur">{t.category}</div>
          <p className="text-sm font-semibold text-white drop-shadow">{t.preview.hero}</p>
        </div>
        <button onClick={() => onFav(t.id)} className={`absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-black/30 backdrop-blur ${fav ? 'text-rose-400' : 'text-white/80 hover:text-white'}`}><Heart className={`h-3.5 w-3.5 ${fav ? 'fill-rose-400' : ''}`} /></button>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-white">{t.name}</h3>
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${t.price === 'Free' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-violet-400/10 text-violet-300'}`}>{t.price}</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{t.desc}</p>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="flex items-center gap-0.5 text-amber-300"><Star className="h-3 w-3 fill-amber-300" />{t.rating}</span>
          <span>·</span><span>{t.uses.toLocaleString()} uses</span>
          <span>·</span><span className="truncate">{t.creator}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-white/5 pt-3">
          <button onClick={() => onPreview(t)} className="flex items-center justify-center gap-1 rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Eye className="h-3 w-3" />Preview</button>
          <button onClick={() => onUse(t)} className="flex items-center justify-center gap-1 rounded-lg border border-violet-400/20 bg-violet-500/15 py-1.5 text-[10px] text-violet-200 hover:bg-violet-500/25"><ArrowRight className="h-3 w-3" />Use</button>
          <button onClick={() => navigator.clipboard?.writeText(window.location.origin + '/templates#' + t.id)} className="flex items-center justify-center gap-1 rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><Share2 className="h-3 w-3" />Share</button>
        </div>
      </div>
    </div>
  );
}